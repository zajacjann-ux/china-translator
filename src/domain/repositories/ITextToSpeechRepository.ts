import type { LanguageCode } from '../entities/Language';

export interface TextToSpeechResult {
  audioUri: string;
  durationMs?: number;
}

export type SpeechQualityProfile = 'fast' | 'accurate';

export interface TextToSpeechOptions {
  profile?: SpeechQualityProfile;
}

export interface ITextToSpeechRepository {
  synthesize(
    text: string,
    language: LanguageCode,
    options?: TextToSpeechOptions,
  ): Promise<TextToSpeechResult>;
}
