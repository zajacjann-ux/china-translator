import type { LanguageCode } from '@/domain/entities/Language';

/** Default OpenAI TTS speed — natural pace for travel conversations (0.25–4.0 API range). */
export const DEFAULT_TTS_SPEED = 0.85;

const MIN_TTS_SPEED = 0.5;
const MAX_TTS_SPEED = 1.2;

export function normalizeTtsSpeed(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_TTS_SPEED;
  return Math.min(MAX_TTS_SPEED, Math.max(MIN_TTS_SPEED, value));
}

export function parseTtsSpeed(raw: string | undefined): number {
  if (!raw?.trim()) return DEFAULT_TTS_SPEED;
  return normalizeTtsSpeed(parseFloat(raw));
}

/**
 * Prepares translated text for TTS only — does not modify stored/displayed translation.
 * Inserts light phrasing breaks so the voice does not rush through sentences.
 */
export function prepareTextForNaturalSpeech(text: string, languageCode: LanguageCode): string {
  let prepared = text.trim().replace(/\s+/g, ' ');

  prepared = prepared.replace(/([.!?…])\s+/g, '$1\n');
  prepared = prepared.replace(/([。！？])\s*/g, '$1\n');

  if (languageCode === 'zh') {
    prepared = prepared.replace(/，\s*/g, '，\n');
  } else {
    prepared = prepared.replace(/,\s+/g, ',\n');
  }

  prepared = prepared.replace(/:\s+/g, ':\n');
  prepared = prepared.replace(/：\s*/g, '：\n');

  return prepared.replace(/\n{2,}/g, '\n').trim();
}
