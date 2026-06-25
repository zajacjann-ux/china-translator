import type { ITranslationRepository } from '@/domain/repositories/ITranslationRepository';
import type { LanguageCode } from '@/domain/entities/Language';
import { assertLanguageSupportsTranslation, getLanguage } from '@/domain/entities/Language';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export class OpenAITranslationRepository implements ITranslationRepository {
  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
  ): Promise<string> {
    assertLanguageSupportsTranslation(sourceLanguage, targetLanguage);
    const env = getEnvConfig();
    const client = getOpenAIClient();
    const source = getLanguage(sourceLanguage);
    const target = getLanguage(targetLanguage);

    try {
      const response = await client.chat.completions.create({
        model: env.translationModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: [
              `You are a professional travel translator for Rabbitalk.`,
              `Translate from ${source.label} to ${target.label}.`,
              `Return only the translated text — no quotes, labels, or explanations.`,
              `Preserve the natural spoken tone of the original.`,
            ].join(' '),
          },
          { role: 'user', content: text },
        ],
      });

      const translated = response.choices[0]?.message?.content?.trim();
      if (!translated) {
        throw new AppError('TRANSLATION_FAILED', 'Translation returned empty result.');
      }

      return translated;
    } catch (error) {
      logger.error('GPT translation failed', error);
      if (error instanceof AppError) throw error;
      throw new AppError('TRANSLATION_FAILED', 'Translation failed. Check your connection and try again.', error);
    }
  }
}
