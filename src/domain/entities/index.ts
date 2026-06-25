export type { LanguageCode, Language, OpenAiTtsVoice } from './Language';
export {
  languageRegistry,
  getLanguage,
  getAllLanguages,
  makeDirection,
  assertLanguageSupportsStt,
  assertLanguageSupportsTranslation,
  assertLanguageSupportsTts,
  DEFAULT_USER_LANGUAGE,
  DEFAULT_PARTNER_LANGUAGE,
} from './Language';
export type { TranslationDirection, LanguagePair, LanguagePairSelection } from './TranslationDirection';
export {
  buildLanguagePair,
  getLanguagePair,
  getLanguagePairFromDirection,
} from './TranslationDirection';
export type { TranslationRoute, SpeakerRole } from './TranslationRoute';
export { buildSpeechRoutes } from './TranslationRoute';
export type { TranslationMode, TranslationContext } from './TranslationMode';
export type { TranslationResult, StoredTranslationResult } from './TranslationResult';
export { createTranslationResult, toStoredResult, fromStoredResult } from './TranslationResult';
export type { RecordingSession, RecordingStatus } from './RecordingSession';
export { createRecordingSession } from './RecordingSession';
export type { PhrasebookCategoryId, PhrasebookCategory, Phrase } from './Phrasebook';
export { PHRASEBOOK_CATEGORIES } from './Phrasebook';
export type { OcrResult, OcrOptions } from './OcrResult';

/** Re-export config for documentation and tooling */
export { LANGUAGE_CONFIG } from '@/config/languages.config';
