import { File, Paths } from 'expo-file-system';
import type {
  ITextToSpeechRepository,
  TextToSpeechOptions,
  TextToSpeechResult,
} from '@/domain/repositories/ITextToSpeechRepository';
import type { LanguageCode } from '@/domain/entities/Language';
import { assertLanguageSupportsTts, getLanguage } from '@/domain/entities/Language';
import { prepareTextForNaturalSpeech } from '@/config/tts.config';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { translationDebug } from '@/infrastructure/logging/translationDebug';
import { markPipelineTiming } from '@/infrastructure/logging/translationTiming';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import { generateId } from '@/shared/utils/id';

export class OpenAITextToSpeechRepository implements ITextToSpeechRepository {
  async synthesize(
    text: string,
    language: LanguageCode,
    options: TextToSpeechOptions = {},
  ): Promise<TextToSpeechResult> {
    assertLanguageSupportsTts(language);
    const lang = getLanguage(language);
    const env = getEnvConfig();
    const client = getOpenAIClient();
    const speechInput = prepareTextForNaturalSpeech(text, language);
    const startedAt = Date.now();
    const speed = options.profile === 'accurate' ? Math.min(env.ttsSpeed, 1) : env.ttsSpeed;

    try {
      markPipelineTiming('tts_start');

      const response = await client.audio.speech.create({
        model: env.ttsModel,
        voice: lang.ttsVoice,
        input: speechInput,
        response_format: 'mp3',
        speed,
      });

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const file = new File(Paths.cache, `tts-${generateId()}.mp3`);
      file.write(bytes);

      markPipelineTiming('tts_end');

      translationDebug.ttsSynthesis({
        speed,
        durationMs: Date.now() - startedAt,
        language: lang.code,
        model: env.ttsModel,
      });

      return { audioUri: file.uri };
    } catch (error) {
      logger.error('TTS synthesis failed', error);
      throw new AppError('TTS_FAILED', 'Could not generate speech. Please try again.', error);
    }
  }
}
