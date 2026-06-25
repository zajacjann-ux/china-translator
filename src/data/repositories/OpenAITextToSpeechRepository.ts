import { File, Paths } from 'expo-file-system';
import type {
  ITextToSpeechRepository,
  TextToSpeechResult,
} from '@/domain/repositories/ITextToSpeechRepository';
import type { LanguageCode } from '@/domain/entities/Language';
import { assertLanguageSupportsTts, getLanguage } from '@/domain/entities/Language';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import { generateId } from '@/shared/utils/id';

export class OpenAITextToSpeechRepository implements ITextToSpeechRepository {
  async synthesize(text: string, language: LanguageCode): Promise<TextToSpeechResult> {
    assertLanguageSupportsTts(language);
    const lang = getLanguage(language);
    const env = getEnvConfig();
    const client = getOpenAIClient();

    try {
      const response = await client.audio.speech.create({
        model: env.ttsModel,
        voice: lang.ttsVoice,
        input: text,
        response_format: 'mp3',
      });

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const file = new File(Paths.cache, `tts-${generateId()}.mp3`);
      file.write(bytes);

      return { audioUri: file.uri };
    } catch (error) {
      logger.error('TTS synthesis failed', error);
      throw new AppError('TTS_FAILED', 'Could not generate speech. Please try again.', error);
    }
  }
}
