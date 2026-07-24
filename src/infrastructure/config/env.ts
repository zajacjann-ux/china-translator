import Constants from 'expo-constants';
import { AppError } from '@/shared/errors/AppError';

export interface EnvConfig {
  openAiApiKey: string;
  sttModel: string;
  translationModel: string;
  ttsModel: string;
  ttsVoice: string;
}

export const API_KEY_MISSING_MESSAGE = 'API key is not configured.';

type ExpoExtra = {
  EXPO_PUBLIC_OPENAI_API_KEY?: string;
  EXPO_PUBLIC_OPENAI_STT_MODEL?: string;
  EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL?: string;
  EXPO_PUBLIC_OPENAI_TTS_MODEL?: string;
  EXPO_PUBLIC_OPENAI_TTS_VOICE?: string;
};

/**
 * Expo inlines only static `process.env.EXPO_PUBLIC_*` references at bundle time.
 * EAS Build also embeds values via app.config `extra`, readable through expo-constants.
 */
function getExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
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
    'whisper-1'
  );
}

function getTranslationModel(): string {
  return (
    pickEnv(
      process.env.EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL,
      getExtra().EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL,
    ) ?? 'gpt-4o-mini'
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

/** Validated environment configuration. Call only when API access is needed. */
export function getEnvConfig(): EnvConfig {
  const openAiApiKey = getOpenAiApiKey();
  if (!openAiApiKey) {
    throw new AppError('API_KEY_MISSING', API_KEY_MISSING_MESSAGE);
  }

  return {
    openAiApiKey,
    sttModel: getSttModel(),
    translationModel: getTranslationModel(),
    ttsModel: getTtsModel(),
    ttsVoice: getTtsVoice(),
  };
}

/** Safe check for whether API key is configured (for UI hints). */
export function isApiKeyConfigured(): boolean {
  const key = getOpenAiApiKey();
  return Boolean(key && key.length > 10);
}

/** Throws a user-friendly error when the API key is missing or invalid. */
export function assertApiKeyConfigured(): void {
  if (!isApiKeyConfigured()) {
    throw new AppError('API_KEY_MISSING', API_KEY_MISSING_MESSAGE);
  }
}
