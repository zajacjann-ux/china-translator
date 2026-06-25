import type { TranslationDirection } from './TranslationDirection';
import type { TranslationMode } from './TranslationMode';
import type { LanguageCode } from './Language';
import { DEFAULT_PARTNER_LANGUAGE, DEFAULT_USER_LANGUAGE } from './Language';

export interface TranslationResult {
  id: string;
  direction: TranslationDirection;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  mode: TranslationMode;
  originalText: string;
  translatedText: string;
  createdAt: Date;
  recordingDurationMs?: number;
  /** Local TTS file URI — session only, not persisted */
  speechAudioUri?: string;
}

export function createTranslationResult(
  params: Omit<TranslationResult, 'id' | 'createdAt'> & { id?: string; createdAt?: Date },
): TranslationResult {
  return {
    id: params.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    createdAt: params.createdAt ?? new Date(),
    ...params,
  };
}

export interface StoredTranslationResult {
  id: string;
  direction: TranslationDirection;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  mode: TranslationMode;
  originalText: string;
  translatedText: string;
  createdAt: string;
  recordingDurationMs?: number;
}

export function toStoredResult(result: TranslationResult): StoredTranslationResult {
  return {
    id: result.id,
    direction: result.direction,
    sourceLanguage: result.sourceLanguage,
    targetLanguage: result.targetLanguage,
    mode: result.mode,
    originalText: result.originalText,
    translatedText: result.translatedText,
    createdAt: result.createdAt.toISOString(),
    recordingDurationMs: result.recordingDurationMs,
  };
}

export function fromStoredResult(stored: StoredTranslationResult): TranslationResult {
  const [fallbackSource, fallbackTarget] = stored.direction.split('-to-');
  return createTranslationResult({
    id: stored.id,
    direction: stored.direction,
    sourceLanguage: stored.sourceLanguage ?? fallbackSource ?? DEFAULT_USER_LANGUAGE,
    targetLanguage: stored.targetLanguage ?? fallbackTarget ?? DEFAULT_PARTNER_LANGUAGE,
    mode: stored.mode ?? 'speech',
    originalText: stored.originalText,
    translatedText: stored.translatedText,
    createdAt: new Date(stored.createdAt),
    recordingDurationMs: stored.recordingDurationMs,
  });
}
