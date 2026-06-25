import type { LanguageCode } from '../entities/Language';

export interface ITranslationRepository {
  translate(text: string, sourceLanguage: LanguageCode, targetLanguage: LanguageCode): Promise<string>;
}
