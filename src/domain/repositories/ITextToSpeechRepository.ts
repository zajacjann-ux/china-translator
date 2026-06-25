import type { LanguageCode } from '../entities/Language';

export interface TextToSpeechResult {
  audioUri: string;
  durationMs?: number;
}

export interface ITextToSpeechRepository {
  synthesize(text: string, language: LanguageCode): Promise<TextToSpeechResult>;
}
