import Constants from 'expo-constants';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import { parseTtsSpeed } from '@/config/tts.config';
import {
  DEFAULT_STT_MODEL,
  DEFAULT_TRANSLATION_MODEL,
  DEFAULT_VISION_MODEL,
} from '@/config/models.config';

export interface EnvConfig {
  openAiApiKey: string;
  sttModel: string;
  translationModel: string;
  visionModel: string;
  ttsModel: string;
  ttsVoice: string;
  ttsSpeed: number;
}

export const API_KEY_MISSING_MESSAGE = 'API key is not configured.';

type ExpoExtra = {
  EXPO_PUBLIC_OPENAI_API_KEY?: string;
  EXPO_PUBLIC_OPENAI_STT_MODEL?: string;
  EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL?: string;
  EXPO_PUBLIC_OPENAI_VISION_MODEL?: string;
  EXPO_PUBLIC_OPENAI_TTS_MODEL?: string;
  EXPO_PUBLIC_OPENAI_TTS_VOICE?: string;
  EXPO_PUBLIC_OPENAI_TTS_SPEED?: string;
};

type LegacyManifest = {
  extra?: ExpoExtra;
};

/**
 * Expo inlines only static `process.env.EXPO_PUBLIC_*` references at bundle time.
 * EAS Build also embeds values via app.config `extra`, readable through expo-constants.
 */
function getExtra(): ExpoExtra {
  const raw =
    Constants.expoConfig?.extra ??
    (Constants as typeof Constants & { manifest2?: LegacyManifest }).manifest2?.extra ??
    (Constants as typeof Constants & { manifest?: LegacyManifest }).manifest?.extra ??
    {};

  return {
    EXPO_PUBLIC_OPENAI_API_KEY: raw.EXPO_PUBLIC_OPENAI_API_KEY,
    EXPO_PUBLIC_OPENAI_STT_MODEL: raw.EXPO_PUBLIC_OPENAI_STT_MODEL,
    EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL: raw.EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL,
    EXPO_PUBLIC_OPENAI_VISION_MODEL: raw.EXPO_PUBLIC_OPENAI_VISION_MODEL,
    EXPO_PUBLIC_OPENAI_TTS_MODEL: raw.EXPO_PUBLIC_OPENAI_TTS_MODEL,
    EXPO_PUBLIC_OPENAI_TTS_VOICE: raw.EXPO_PUBLIC_OPENAI_TTS_VOICE,
    EXPO_PUBLIC_OPENAI_TTS_SPEED: raw.EXPO_PUBLIC_OPENAI_TTS_SPEED,
  };
}

function pickEnv(staticValue: string | undefined, extraValue: string | undefined): string | undefined {
  const value = staticValue?.trim() || extraValue?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** OpenAI API key from Expo public env (Metro bundle or EAS embedded config). */
export function getOpenAiApiKey(): string | undefined {
  return pickEnv(process.env.EXPO_PUBLIC_OPENAI_API_KEY, getExtra().EXPO_PUBLIC_OPENAI_API_KEY);
}

function getSttModel(): string {
  return (
    pickEnv(process.env.EXPO_PUBLIC_OPENAI_STT_MODEL, getExtra().EXPO_PUBLIC_OPENAI_STT_MODEL) ??
    DEFAULT_STT_MODEL
  );
}

function getTranslationModel(): string {
  return (
    pickEnv(
      process.env.EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL,
      getExtra().EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL,
    ) ?? DEFAULT_TRANSLATION_MODEL
  );
}

function getVisionModel(): string {
  return (
    pickEnv(process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL, getExtra().EXPO_PUBLIC_OPENAI_VISION_MODEL) ??
    DEFAULT_VISION_MODEL
  );
}

function getTtsModel(): string {
  return (
    pickEnv(process.env.EXPO_PUBLIC_OPENAI_TTS_MODEL, getExtra().EXPO_PUBLIC_OPENAI_TTS_MODEL) ??
    'tts-1'
  );
}

function getTtsVoice(): string {
  return (
    pickEnv(process.env.EXPO_PUBLIC_OPENAI_TTS_VOICE, getExtra().EXPO_PUBLIC_OPENAI_TTS_VOICE) ??
    'alloy'
  );
}

function getTtsSpeed(): number {
  return parseTtsSpeed(
    pickEnv(process.env.EXPO_PUBLIC_OPENAI_TTS_SPEED, getExtra().EXPO_PUBLIC_OPENAI_TTS_SPEED),
  );
}

/** Validated environment configuration. Call only when API access is needed. */
export function getEnvConfig(): EnvConfig {
  const openAiApiKey = getOpenAiApiKey();
  if (!openAiApiKey) {
    logger.error('[OpenAI DEBUG] EXPO_PUBLIC_OPENAI_API_KEY missing at runtime', {
      ...getOpenAiEnvDebugInfo(),
      expoPublicOpenAiApiKeyExists: false,
      failureCategory: 'environment_variable',
      likelyCause: '1. environment variable issue',
    });
    throw new AppError('API_KEY_MISSING', API_KEY_MISSING_MESSAGE);
  }

  return {
    openAiApiKey,
    sttModel: getSttModel(),
    translationModel: getTranslationModel(),
    visionModel: getVisionModel(),
    ttsModel: getTtsModel(),
    ttsVoice: getTtsVoice(),
    ttsSpeed: getTtsSpeed(),
  };
}

/** Safe check for whether API key is configured (for UI hints). */
export function isApiKeyConfigured(): boolean {
  const key = getOpenAiApiKey();
  return Boolean(key && key.length > 10);
}

/** Non-secret env diagnostics for preview/production troubleshooting. */
export function getOpenAiEnvDebugInfo(): {
  apiKeyExists: boolean;
  apiKeyFromProcessEnv: boolean;
  apiKeyFromExpoExtra: boolean;
  appVariant: string | undefined;
  sttModel: string;
  translationModel: string;
  visionModel: string;
  ttsModel: string;
} {
  const extra = getExtra();
  return {
    apiKeyExists: Boolean(getOpenAiApiKey()),
    apiKeyFromProcessEnv: Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim()),
    apiKeyFromExpoExtra: Boolean(extra.EXPO_PUBLIC_OPENAI_API_KEY?.trim()),
    appVariant:
      Constants.expoConfig?.extra?.appVariant ??
      (Constants.expoConfig?.extra as { appVariant?: string } | undefined)?.appVariant,
    sttModel: getSttModel(),
    translationModel: getTranslationModel(),
    visionModel: getVisionModel(),
    ttsModel: getTtsModel(),
  };
}

/** Throws a user-friendly error when the API key is missing or invalid. */
export function assertApiKeyConfigured(): void {
  if (!isApiKeyConfigured()) {
    throw new AppError('API_KEY_MISSING', API_KEY_MISSING_MESSAGE);
  }
}
