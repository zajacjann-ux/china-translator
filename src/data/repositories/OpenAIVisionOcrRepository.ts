import { File } from 'expo-file-system';
import type { IOcrRepository } from '@/domain/repositories/IOcrRepository';
import type { OcrResult, OcrOptions } from '@/domain/entities/OcrResult';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export class OpenAIVisionOcrRepository implements IOcrRepository {
  async extractText(imageUri: string, options?: OcrOptions): Promise<OcrResult> {
    const env = getEnvConfig();
    const client = getOpenAIClient();

    try {
      const file = new File(imageUri);
      const base64 = await file.base64();
      const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const hints = options?.languageHints?.join(', ') ?? 'any';

      const response = await client.chat.completions.create({
        model: env.visionModel,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'Extract ALL visible text from this image exactly as written.',
                  'Preserve line breaks between lines.',
                  'Do not translate — return only the original text.',
                  `Expected languages: ${hints}.`,
                  'If no text is visible, respond with an empty string.',
                ].join(' '),
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content?.trim() ?? '';

      return {
        text,
        detectedLanguages: options?.languageHints,
      };
    } catch (error) {
      logger.error('OCR failed', error);
      throw new AppError('TRANSLATION_FAILED', 'Could not read text from the photo.', error);
    }
  }
}
