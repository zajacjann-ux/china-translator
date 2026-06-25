import { AppError } from '@/shared/errors/AppError';

export interface EnvConfig {
  openAiApiKey: string;
  sttModel: string;
  translationModel: string;
  ttsModel: string;
  ttsVoice: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new AppError('API_KEY_MISSING', `Missing environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/** Validated environment configuration. Call only when API access is needed. */
export function getEnvConfig(): EnvConfig {
  return {
    openAiApiKey: requireEnv('EXPO_PUBLIC_OPENAI_API_KEY'),
    sttModel: optionalEnv('EXPO_PUBLIC_OPENAI_STT_MODEL', 'whisper-1'),
    translationModel: optionalEnv('EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL', 'gpt-4o-mini'),
    ttsModel: optionalEnv('EXPO_PUBLIC_OPENAI_TTS_MODEL', 'tts-1'),
    ttsVoice: optionalEnv('EXPO_PUBLIC_OPENAI_TTS_VOICE', 'alloy'),
  };
}

/** Safe check for whether API key is configured (for UI hints). */
export function isApiKeyConfigured(): boolean {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return Boolean(key?.startsWith('sk-') && !key.includes('your-key-here'));
}
