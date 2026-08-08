import type { LanguageCode } from '../entities/Language';
import type { AudioRecording } from './IAudioRepository';

export interface SpeechToTextResult {
  text: string;
  language?: string;
  confidence?: number;
}

export interface SpeechToTextOptions {
  /** When false, skips the travel prompt for lower-latency interim passes. */
  usePrompt?: boolean;
  /** When true, returns empty text instead of throwing if Whisper hears nothing. */
  allowEmpty?: boolean;
}

export interface ISpeechToTextRepository {
  transcribe(
    audio: AudioRecording,
    language: LanguageCode,
    options?: SpeechToTextOptions,
  ): Promise<SpeechToTextResult>;
}
