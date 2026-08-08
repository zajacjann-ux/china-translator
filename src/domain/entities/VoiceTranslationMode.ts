export type VoiceTranslationMode = 'fast' | 'accurate';

export const DEFAULT_VOICE_TRANSLATION_MODE: VoiceTranslationMode = 'accurate';

export function isVoiceTranslationMode(value: unknown): value is VoiceTranslationMode {
  return value === 'fast' || value === 'accurate';
}
