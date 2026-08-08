import type { LanguageCode } from '../entities/Language';
import type { TranslationContext } from '@/config/translation.config';

export type TranslationQualityProfile = 'fast' | 'accurate';

export interface TranslationRequestOptions {
  profile?: TranslationQualityProfile;
}

export interface ITranslationRepository {
  translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    context?: TranslationContext,
    options?: TranslationRequestOptions,
  ): Promise<string>;
}
