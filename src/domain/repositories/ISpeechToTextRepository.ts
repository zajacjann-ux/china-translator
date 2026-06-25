import type { LanguageCode } from '../entities/Language';
import type { AudioRecording } from './IAudioRepository';

export interface SpeechToTextResult {
  text: string;
  language?: string;
  confidence?: number;
}

export interface ISpeechToTextRepository {
  transcribe(audio: AudioRecording, language: LanguageCode): Promise<SpeechToTextResult>;
}
