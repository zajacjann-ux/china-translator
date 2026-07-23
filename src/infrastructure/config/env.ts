import { AppError } from '@/shared/errors/AppError';

export interface EnvConfig {
  openAiApiKey: string;
  sttModel: string;
  translationModel: string;
  ttsModel: string;
  ttsVoice: string;
}

export const API_KEY_ENV_VAR = 'EXPO_PUBLIC_OPENAI_API_KEY';

export const API_KEY_SETUP_MESSAGE =
  'OpenAI API key is missing. Copy .env.example to .env and set EXPO_PUBLIC_OPENAI_API_KEY=sk-... then restart the dev server.';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new AppError('API_KEY_MISSING', API_KEY_SETUP_MESSAGE);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/** Validated environment configuration. Call only when API access is needed. */
export function getEnvConfig(): EnvConfig {
  return {
    openAiApiKey: requireEnv(API_KEY_ENV_VAR),
    sttModel: optionalEnv('EXPO_PUBLIC_OPENAI_STT_MODEL', 'whisper-1'),
    translationModel: optionalEnv('EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL', 'gpt-4o-mini'),
    ttsModel: optionalEnv('EXPO_PUBLIC_OPENAI_TTS_MODEL', 'tts-1'),
    ttsVoice: optionalEnv('EXPO_PUBLIC_OPENAI_TTS_VOICE', 'alloy'),
  };
}

/** Safe check for whether API key is configured (for UI hints). */
export function isApiKeyConfigured(): boolean {
  const key = process.env[API_KEY_ENV_VAR];
  return Boolean(key?.startsWith('sk-') && !key.includes('your-key-here'));
}

/** Throws a user-friendly error when the API key is missing or invalid. */
export function assertApiKeyConfigured(): void {
  if (!isApiKeyConfigured()) {
    throw new AppError('API_KEY_MISSING', API_KEY_SETUP_MESSAGE);
  }
}
