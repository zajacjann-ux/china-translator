import type {
  ISpeechToTextRepository,
  SpeechToTextResult,
} from '@/domain/repositories/ISpeechToTextRepository';
import type { AudioRecording } from '@/domain/repositories/IAudioRepository';
import type { LanguageCode } from '@/domain/entities/Language';
import { assertLanguageSupportsStt, getLanguage } from '@/domain/entities/Language';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export class OpenAISpeechToTextRepository implements ISpeechToTextRepository {
  async transcribe(audio: AudioRecording, language: LanguageCode): Promise<SpeechToTextResult> {
    assertLanguageSupportsStt(language);
    const env = getEnvConfig();
    const client = getOpenAIClient();
    const lang = getLanguage(language);

    try {
      const file = {
        uri: audio.uri,
        name: 'recording.m4a',
        type: audio.mimeType,
      } as unknown as File;

      const transcription = await client.audio.transcriptions.create({
        file,
        model: env.sttModel,
        language: lang.whisperCode,
        response_format: 'json',
      });

      return {
        text: transcription.text.trim(),
        language: lang.whisperCode,
      };
    } catch (error) {
      logger.error('Whisper transcription failed', error);
      throw new AppError('TRANSLATION_FAILED', 'Could not understand the speech. Please try again.', error);
    }
  }
}
