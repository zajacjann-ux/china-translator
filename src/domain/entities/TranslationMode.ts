export type TranslationMode = 'speech' | 'camera' | 'phrasebook' | 'conversation';

export interface TranslationContext {
  sourceLanguage: string;
  targetLanguage: string;
  mode: TranslationMode;
}
