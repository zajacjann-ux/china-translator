import type { LanguageCode } from '../entities/Language';
import { assertLanguageSupportsTts } from '../entities/Language';
import type { IAudioRepository } from '../repositories/IAudioRepository';
import type { ITextToSpeechRepository } from '../repositories/ITextToSpeechRepository';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export interface ReplayTranslationAudioInput {
  text: string;
  targetLanguage: LanguageCode;
  audioUri?: string;
}

export class ReplayTranslationAudioUseCase {
  constructor(
    private readonly textToSpeechRepository: ITextToSpeechRepository,
    private readonly audioRepository: IAudioRepository,
  ) {}

  async execute(input: ReplayTranslationAudioInput): Promise<void> {
    const trimmed = input.text.trim();
    if (!trimmed) {
      throw new AppError('TTS_FAILED', 'Nothing to replay.');
    }

    const cachedUri = input.audioUri?.trim();
    if (cachedUri) {
      try {
        await this.audioRepository.playAudio(cachedUri);
        return;
      } catch (error) {
        logger.warn('Cached replay audio unavailable, regenerating TTS', error);
      }
    }

    assertLanguageSupportsTts(input.targetLanguage);

    const ttsResult = await this.textToSpeechRepository.synthesize(trimmed, input.targetLanguage);
    await this.audioRepository.playAudio(ttsResult.audioUri);
  }
}
