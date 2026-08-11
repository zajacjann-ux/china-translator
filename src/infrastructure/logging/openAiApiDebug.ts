import OpenAI from 'openai';
import { AppError } from '@/shared/errors/AppError';
import { getOpenAiApiKey, getOpenAiEnvDebugInfo } from '@/infrastructure/config/env';
import { logger } from '@/infrastructure/logging/logger';

const PREFIX = '[OpenAI DEBUG]';

export type OpenAiFailureCategory =
  | 'environment_variable'
  | 'openai_api_error'
  | 'network'
  | 'timeout'
  | 'request_payload'
  | 'preview_build_config'
  | 'unknown';

export interface OpenAiRequestDebugContext {
  operation: string;
  endpoint: string;
  model?: string;
}

export interface OpenAiErrorDebugDetails {
  apiKeyExists: boolean;
  expoPublicOpenAiApiKeyExists: boolean;
  httpStatus?: number;
  errorMessage: string;
  errorCode?: string;
  errorType?: string;
  appErrorCode?: string;
  networkException: boolean;
  timeoutException: boolean;
  responseBody?: string;
  failureCategory: OpenAiFailureCategory;
}

export interface OpenAiPayloadDebugInfo {
  sourceLanguage?: string;
  targetLanguage?: string;
  inputTextLength?: number;
  systemPromptLength?: number;
  temperature?: number;
}

let envDiagnosticsLogged = false;

function logEnvDiagnosticsOnce(): void {
  if (envDiagnosticsLogged) return;
  envDiagnosticsLogged = true;
  const env = getOpenAiEnvDebugInfo();
  logger.info(`${PREFIX} env snapshot`, {
    ...env,
    expoPublicOpenAiApiKeyExists: env.apiKeyExists,
  });
}

function sanitizeResponseBody(body: string | undefined): string | undefined {
  if (!body) return undefined;
  return body
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .slice(0, 1000);
}

function isTimeoutMessage(message: string): boolean {
  return /timeout|timed out|deadline exceeded|aborterror|request aborted|socket hang up/i.test(message);
}

function classifyFailure(error: unknown, details: Omit<OpenAiErrorDebugDetails, 'failureCategory'>): OpenAiFailureCategory {
  const env = getOpenAiEnvDebugInfo();

  if (!details.apiKeyExists || details.appErrorCode === 'API_KEY_MISSING') {
    return 'environment_variable';
  }

  if (details.timeoutException) {
    return 'timeout';
  }

  if (details.networkException) {
    return 'network';
  }

  if (
    env.appVariant === 'preview' &&
    !env.apiKeyFromProcessEnv &&
    env.apiKeyFromExpoExtra &&
    details.httpStatus === 401
  ) {
    return 'preview_build_config';
  }

  if (
    details.httpStatus === 400 ||
    details.httpStatus === 422 ||
    error instanceof OpenAI.BadRequestError ||
    error instanceof OpenAI.UnprocessableEntityError
  ) {
    return 'request_payload';
  }

  if (
    details.httpStatus !== undefined ||
    error instanceof OpenAI.APIError ||
    error instanceof OpenAI.AuthenticationError ||
    error instanceof OpenAI.PermissionDeniedError ||
    error instanceof OpenAI.NotFoundError ||
    error instanceof OpenAI.RateLimitError
  ) {
    if (
      env.appVariant === 'preview' &&
      (error instanceof OpenAI.NotFoundError || details.httpStatus === 404) &&
      env.translationModel
    ) {
      return 'preview_build_config';
    }
    return 'openai_api_error';
  }

  if (env.appVariant === 'preview' && !env.apiKeyFromProcessEnv && !env.apiKeyFromExpoExtra) {
    return 'environment_variable';
  }

  return 'unknown';
}

export function logOpenAiRequestStart(
  context: OpenAiRequestDebugContext,
  payload?: OpenAiPayloadDebugInfo,
): void {
  logEnvDiagnosticsOnce();
  logger.info(`${PREFIX} request start`, {
    ...context,
    apiKeyExists: Boolean(getOpenAiApiKey()),
    expoPublicOpenAiApiKeyExists: Boolean(getOpenAiApiKey()),
    ...payload,
  });
}

export function extractOpenAiErrorDetails(error: unknown): OpenAiErrorDebugDetails {
  const apiKeyExists = Boolean(getOpenAiApiKey());
  const base = {
    apiKeyExists,
    expoPublicOpenAiApiKeyExists: apiKeyExists,
  };

  if (error instanceof AppError) {
    const causeDetails = error.cause ? extractOpenAiErrorDetails(error.cause) : null;
    if (causeDetails && causeDetails.errorMessage !== error.message) {
      return {
        ...base,
        appErrorCode: error.code,
        errorMessage: causeDetails.errorMessage,
        httpStatus: causeDetails.httpStatus,
        errorCode: causeDetails.errorCode,
        errorType: causeDetails.errorType,
        responseBody: causeDetails.responseBody,
        networkException: causeDetails.networkException,
        timeoutException: causeDetails.timeoutException,
        failureCategory: causeDetails.failureCategory,
      };
    }

    const details = {
      ...base,
      appErrorCode: error.code,
      errorMessage: error.message,
      networkException: false,
      timeoutException: false,
      failureCategory: 'unknown' as OpenAiFailureCategory,
    };
    return { ...details, failureCategory: classifyFailure(error, details) };
  }

  if (error instanceof OpenAI.APIError) {
    const rawBody =
      typeof error.error === 'object' && error.error !== null
        ? JSON.stringify(error.error)
        : typeof error.error === 'string'
          ? error.error
          : undefined;

    const details = {
      ...base,
      httpStatus: error.status,
      errorMessage: error.message,
      errorCode: typeof error.code === 'string' ? error.code : undefined,
      errorType: typeof error.type === 'string' ? error.type : undefined,
      networkException:
        error instanceof OpenAI.APIConnectionError && !(error instanceof OpenAI.APIConnectionTimeoutError),
      timeoutException:
        error instanceof OpenAI.APIConnectionTimeoutError || isTimeoutMessage(error.message),
      responseBody: sanitizeResponseBody(rawBody),
      failureCategory: 'unknown' as OpenAiFailureCategory,
    };
    return { ...details, failureCategory: classifyFailure(error, details) };
  }

  const message = error instanceof Error ? error.message : String(error);
  const causeMessage =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
  const combinedMessage = causeMessage ? `${message} | cause: ${causeMessage}` : message;

  const timeoutException = isTimeoutMessage(combinedMessage);
  const networkException =
    !timeoutException &&
    (error instanceof TypeError ||
      error instanceof OpenAI.APIConnectionError ||
      /network request failed|failed to fetch|network error|econnrefused|enotfound|socket|ssl|certificate/i.test(
        combinedMessage,
      ));

  const details = {
    ...base,
    errorMessage: combinedMessage,
    networkException,
    timeoutException,
    failureCategory: 'unknown' as OpenAiFailureCategory,
  };
  return { ...details, failureCategory: classifyFailure(error, details) };
}

export function logOpenAiRequestFailure(
  context: OpenAiRequestDebugContext,
  error: unknown,
  payload?: OpenAiPayloadDebugInfo,
): OpenAiErrorDebugDetails {
  const details = extractOpenAiErrorDetails(error);
  logger.error(`${PREFIX} request failed`, {
    operation: context.operation,
    endpoint: context.endpoint,
    model: context.model,
    ...payload,
    ...details,
  });
  return details;
}

export function logTranslationRealFailureReason(
  context: OpenAiRequestDebugContext,
  error: unknown,
  payload?: OpenAiPayloadDebugInfo,
): OpenAiErrorDebugDetails {
  const details = logOpenAiRequestFailure(context, error, payload);
  logger.error(`${PREFIX} TRANSLATION REAL ERROR (UI message unchanged)`, {
    genericUiMessage: 'Translation failed. Check your connection and try again.',
    realErrorMessage: details.errorMessage,
    failureCategory: details.failureCategory,
    endpoint: context.endpoint,
    model: context.model,
    httpStatus: details.httpStatus,
    responseBody: details.responseBody,
    apiKeyExists: details.apiKeyExists,
    expoPublicOpenAiApiKeyExists: details.expoPublicOpenAiApiKeyExists,
    networkException: details.networkException,
    timeoutException: details.timeoutException,
    likelyCause:
      details.failureCategory === 'environment_variable'
        ? '1. environment variable issue'
        : details.failureCategory === 'openai_api_error'
          ? '2. OpenAI API error'
          : details.failureCategory === 'network'
            ? '3. network/VPN issue'
            : details.failureCategory === 'timeout'
              ? '3. network/VPN issue (timeout)'
              : details.failureCategory === 'request_payload'
                ? '4. request payload issue'
                : details.failureCategory === 'preview_build_config'
                  ? '5. preview build configuration issue'
                  : 'unknown',
    env: getOpenAiEnvDebugInfo(),
    ...payload,
  });
  return details;
}

export function logOpenAiHttpFailure(
  context: OpenAiRequestDebugContext,
  httpStatus: number,
  responseBody: string,
  errorMessage: string,
): void {
  logEnvDiagnosticsOnce();
  const details = {
    apiKeyExists: Boolean(getOpenAiApiKey()),
    expoPublicOpenAiApiKeyExists: Boolean(getOpenAiApiKey()),
    httpStatus,
    errorMessage,
    responseBody: sanitizeResponseBody(responseBody),
    networkException: false,
    timeoutException: isTimeoutMessage(errorMessage),
    failureCategory: 'openai_api_error' as OpenAiFailureCategory,
  };
  logger.error(`${PREFIX} request failed`, {
    operation: context.operation,
    endpoint: context.endpoint,
    model: context.model,
    ...details,
  });
  logger.error(`${PREFIX} TRANSLATION REAL ERROR (UI message unchanged)`, {
    genericUiMessage: 'Translation failed. Check your connection and try again.',
    realErrorMessage: errorMessage,
    failureCategory: details.failureCategory,
    endpoint: context.endpoint,
    model: context.model,
    httpStatus,
    responseBody: details.responseBody,
    likelyCause:
      httpStatus === 404
        ? '5. preview build configuration issue (model/endpoint)'
        : '2. OpenAI API error',
    env: getOpenAiEnvDebugInfo(),
  });
}
