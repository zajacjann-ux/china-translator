import type { LanguageCode } from '../entities/Language';
import type { TranslationContext } from '@/config/translation.config';

export interface ITranslationRepository {
  translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    context?: TranslationContext,
  ): Promise<string>;
}
