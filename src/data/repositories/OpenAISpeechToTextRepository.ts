import { Platform } from 'react-native';
import { File } from 'expo-file-system';
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

const WHISPER_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';

/** React Native multipart file part — must not be cast to Blob. */
interface ReactNativeFormDataFile {
  uri: string;
  name: string;
  type: string;
}

function toUploadUri(uri: string): string {
  if (Platform.OS === 'android') {
    return uri.startsWith('file://') ? uri : `file://${uri}`;
  }

  return uri.startsWith('file://') ? uri : `file://${uri}`;
}

function createUploadFilePart(audioUri: string): ReactNativeFormDataFile {
  return {
    uri: toUploadUri(audioUri),
    name: 'audio.m4a',
    type: 'audio/m4a',
  };
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

    const recordingFile = new File(audio.uri);
    if (!recordingFile.exists) {
      throw new AppError('RECORDING_FAILED', 'Recording file does not exist before upload.');
    }

    const sizeBytes = audio.fileSizeBytes || recordingFile.size;
    if (!sizeBytes || sizeBytes <= 0) {
      throw new AppError('RECORDING_FAILED', 'Recording file is empty before upload.');
    }

    const uploadFile = createUploadFilePart(audio.uri);

    logger.info('Whisper upload prepared', {
      uri: uploadFile.uri,
      sizeBytes,
      durationMs: audio.durationMs,
      mimeType: uploadFile.type,
      language: lang.whisperCode,
      model: env.sttModel,
    });

    try {
      const formData = new FormData();
      formData.append('file', uploadFile as never);
      formData.append('model', env.sttModel);
      formData.append('language', lang.whisperCode);
      formData.append('response_format', 'json');

      const response = await fetch(WHISPER_TRANSCRIPTIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const responseBody = await response.text();

      if (!response.ok) {
        logger.error('Whisper API error response', {
          status: response.status,
          body: responseBody,
          uri: audio.uri,
          sizeBytes,
        });
        throw new AppError('TRANSLATION_FAILED', formatWhisperError(response.status, responseBody), responseBody);
      }

      const parsed = JSON.parse(responseBody) as { text?: string };
      const text = parsed.text?.trim() ?? '';

      logger.info('Whisper transcription succeeded', {
        textLength: text.length,
        language: lang.whisperCode,
      });

      if (!text) {
        throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
      }

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
