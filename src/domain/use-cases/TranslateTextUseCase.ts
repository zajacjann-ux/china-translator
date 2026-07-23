import type { LanguageCode } from '../entities/Language';
import type { TranslationResult } from '../entities/TranslationResult';
import type { ITranslationRepository } from '../repositories/ITranslationRepository';
import type { ITextToSpeechRepository } from '../repositories/ITextToSpeechRepository';
import type { IAudioRepository } from '../repositories/IAudioRepository';
import { buildLanguagePair } from '../entities/TranslationDirection';
import { createTranslationResult } from '../entities/TranslationResult';
import {
  assertLanguageSupportsTranslation,
  assertLanguageSupportsTts,
} from '../entities/Language';
import { AppError } from '@/shared/errors/AppError';
import { assertApiKeyConfigured } from '@/infrastructure/config/env';

export interface TranslateTextOutput {
  result: TranslationResult;
  speechAudioUri: string;
}

export class TranslateTextUseCase {
  constructor(
    private readonly translationRepository: ITranslationRepository,
    private readonly textToSpeechRepository: ITextToSpeechRepository,
    private readonly audioRepository: IAudioRepository,
  ) {}

  async execute(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
  ): Promise<TranslateTextOutput> {
    assertApiKeyConfigured();

    const trimmed = text.trim();
    if (!trimmed) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'Please enter text to translate.');
    }

    if (sourceLanguage === targetLanguage) {
      throw new AppError('TRANSLATION_FAILED', 'Source and target language must be different.');
    }

    assertLanguageSupportsTranslation(sourceLanguage, targetLanguage);
    assertLanguageSupportsTts(targetLanguage);

    const pair = buildLanguagePair(sourceLanguage, targetLanguage);

    const translatedText = await this.translationRepository.translate(
      trimmed,
      sourceLanguage,
      targetLanguage,
    );

    const ttsResult = await this.textToSpeechRepository.synthesize(
      translatedText,
      targetLanguage,
    );

    void this.audioRepository.playAudio(ttsResult.audioUri);

    const result = createTranslationResult({
      direction: pair.direction,
      sourceLanguage,
      targetLanguage,
      mode: 'text',
      originalText: trimmed,
      translatedText,
      speechAudioUri: ttsResult.audioUri,
    });

    return { result, speechAudioUri: ttsResult.audioUri };
  }

  async replaySpeech(audioUri: string): Promise<void> {
    await this.audioRepository.playAudio(audioUri);
  }
}
