import type { ITranslationRepository } from '@/domain/repositories/ITranslationRepository';
import type { LanguageCode } from '@/domain/entities/Language';
import { assertLanguageSupportsTranslation, getLanguage } from '@/domain/entities/Language';
import {
  DEFAULT_TRANSLATION_CONTEXT,
  buildTranslationSystemPrompt,
  sanitizeTranslatedText,
  type TranslationContext,
} from '@/config/translation.config';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { translationDebug } from '@/infrastructure/logging/translationDebug';
import { markPipelineTiming } from '@/infrastructure/logging/translationTiming';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export class OpenAITranslationRepository implements ITranslationRepository {
  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    context: TranslationContext = DEFAULT_TRANSLATION_CONTEXT,
  ): Promise<string> {
    assertLanguageSupportsTranslation(sourceLanguage, targetLanguage);
    const env = getEnvConfig();
    const client = getOpenAIClient();
    const source = getLanguage(sourceLanguage);
    const target = getLanguage(targetLanguage);
    const resolvedContext = { ...DEFAULT_TRANSLATION_CONTEXT, ...context };
    const systemPrompt = buildTranslationSystemPrompt(sourceLanguage, targetLanguage, resolvedContext);

    translationDebug.translationRequest({
      originalText: text,
      sourceLanguage: source.code,
      targetLanguage: target.code,
      model: env.translationModel,
      context: resolvedContext.scenarioDescription,
    });

    try {
      markPipelineTiming('translation_start');
      const requestStartedAt = Date.now();

      const response = await client.chat.completions.create({
        model: env.translationModel,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim();
      if (!raw) {
        throw new AppError('TRANSLATION_FAILED', 'Translation returned empty result.');
      }

      const translated = sanitizeTranslatedText(raw);
      const latencyMs = Date.now() - requestStartedAt;

      translationDebug.translationResult({
        recognizedSpeech: text,
        translatedText: translated,
        sourceLanguage: source.code,
        targetLanguage: target.code,
        model: env.translationModel,
        latencyMs,
      });

      markPipelineTiming('translation_end');

      return translated;
    } catch (error) {
      logger.error('GPT translation failed', error);
      if (error instanceof AppError) throw error;
      throw new AppError('TRANSLATION_FAILED', 'Translation failed. Check your connection and try again.', error);
    }
  }
}
