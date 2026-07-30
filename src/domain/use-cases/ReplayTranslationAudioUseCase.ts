import type { LanguageCode } from '../entities/Language';
import { assertLanguageSupportsTts } from '../entities/Language';
import type { IAudioRepository } from '../repositories/IAudioRepository';
import type { ITextToSpeechRepository } from '../repositories/ITextToSpeechRepository';
import { AppError } from '@/shared/errors/AppError';

export class ReplayTranslationAudioUseCase {
  constructor(
    private readonly textToSpeechRepository: ITextToSpeechRepository,
    private readonly audioRepository: IAudioRepository,
  ) {}

  async execute(text: string, targetLanguage: LanguageCode): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new AppError('TTS_FAILED', 'Nothing to replay.');
    }

    assertLanguageSupportsTts(targetLanguage);

    const ttsResult = await this.textToSpeechRepository.synthesize(trimmed, targetLanguage);
    await this.audioRepository.playAudio(ttsResult.audioUri);
  }
}
