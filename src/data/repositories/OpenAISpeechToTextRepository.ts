import { Platform } from 'react-native';
import { File, UploadType } from 'expo-file-system';
import type {
  ISpeechToTextRepository,
  SpeechToTextResult,
} from '@/domain/repositories/ISpeechToTextRepository';
import type { AudioRecording } from '@/domain/repositories/IAudioRepository';
import type { LanguageCode } from '@/domain/entities/Language';
import { assertLanguageSupportsStt, getLanguage } from '@/domain/entities/Language';
import { getEnvConfig } from '@/infrastructure/config/env';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import { translationDebug } from '@/infrastructure/logging/translationDebug';
import { markPipelineTiming } from '@/infrastructure/logging/translationTiming';

const WHISPER_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const WHISPER_MIME_TYPE = 'audio/m4a';

function toUploadUri(uri: string): string {
  if (uri.startsWith('file://')) return uri;
  return Platform.OS === 'android' ? `file://${uri}` : `file://${uri}`;
}

function formatWhisperError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const message = parsed.error?.message;
    if (message) return `Speech recognition failed (${status}): ${message}`;
  } catch {
    // Keep raw body fallback below.
  }

  return `Speech recognition failed (${status}): ${body}`;
}

export class OpenAISpeechToTextRepository implements ISpeechToTextRepository {
  async transcribe(audio: AudioRecording, language: LanguageCode): Promise<SpeechToTextResult> {
    assertLanguageSupportsStt(language);
    const env = getEnvConfig();
    const lang = getLanguage(language);

    const uploadUri = toUploadUri(audio.uri);
    const file = new File(uploadUri);

    if (!file.exists) {
      throw new AppError('RECORDING_FAILED', 'Recording file does not exist before upload.');
    }

    const sizeBytes = audio.fileSizeBytes || file.size;
    if (!sizeBytes || sizeBytes <= 0) {
      throw new AppError('RECORDING_FAILED', 'Recording file is empty before upload.');
    }

    logger.info('Whisper upload prepared', {
      uri: uploadUri,
      sizeBytes,
      durationMs: audio.durationMs,
      mimeType: WHISPER_MIME_TYPE,
      language: lang.whisperCode,
      model: env.sttModel,
    });

    try {
      markPipelineTiming('stt_start');
      markPipelineTiming('audio_upload_start');

      const result = await file.upload(WHISPER_TRANSCRIPTIONS_URL, {
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: WHISPER_MIME_TYPE,
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          Accept: 'application/json',
        },
        parameters: {
          model: env.sttModel,
          language: lang.whisperCode,
          response_format: 'json',
        },
      });

      markPipelineTiming('audio_upload_end');

      if (result.status < 200 || result.status >= 300) {
        logger.error('Whisper API error response', {
          status: result.status,
          body: result.body,
          uri: uploadUri,
          sizeBytes,
        });
        throw new AppError(
          'TRANSLATION_FAILED',
          formatWhisperError(result.status, result.body),
          result.body,
        );
      }

      const parsed = JSON.parse(result.body) as { text?: string };
      const text = parsed.text?.trim() ?? '';

      logger.info('Whisper transcription succeeded', {
        textLength: text.length,
        language: lang.whisperCode,
      });

      if (!text) {
        throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
      }

      translationDebug.whisperResult({
        originalText: text,
        detectedSourceLanguage: lang.whisperCode,
        model: env.sttModel,
        durationMs: audio.durationMs,
      });

      markPipelineTiming('stt_end');

      return {
        text,
        language: lang.whisperCode,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Whisper transcription failed', error);
      throw AppError.fromUnknown(error, 'Speech recognition failed. Please try again.');
    }
  }
}
