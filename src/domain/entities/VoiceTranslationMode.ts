/** User-facing modes: Rozprávanie (voice+TTS) and Chat (live text, no TTS). */
export type VoiceTranslationMode = 'conversation' | 'chat';

export const DEFAULT_VOICE_TRANSLATION_MODE: VoiceTranslationMode = 'chat';

export function isVoiceTranslationMode(value: unknown): value is VoiceTranslationMode {
  return value === 'conversation' || value === 'chat';
}

/** Maps persisted legacy values from older FAST/ACCURATE builds. */
export function normalizeVoiceTranslationMode(value: unknown): VoiceTranslationMode {
  if (value === 'conversation' || value === 'chat') return value;
  if (value === 'fast') return 'conversation';
  if (value === 'accurate') return 'chat';
  return DEFAULT_VOICE_TRANSLATION_MODE;
}
