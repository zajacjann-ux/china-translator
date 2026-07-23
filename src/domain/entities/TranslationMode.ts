export type TranslationMode = 'text' | 'speech' | 'camera' | 'phrasebook' | 'conversation';

export interface TranslationContext {
  sourceLanguage: string;
  targetLanguage: string;
  mode: TranslationMode;
}
