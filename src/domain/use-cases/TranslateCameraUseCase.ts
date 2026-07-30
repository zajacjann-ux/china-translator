import type { LanguageCode } from '../entities/Language';
import type { LanguagePair } from '../entities/TranslationDirection';
import type { TranslationResult } from '../entities/TranslationResult';
import type { IOcrRepository } from '../repositories/IOcrRepository';
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

export interface TranslateCameraOptions {
  /** When false, skips TTS synthesis and playback (e.g. chat-only camera translations). */
  speak?: boolean;
}

export interface TranslateCameraOutput {
  result: TranslationResult;
  speechAudioUri: string | null;
}

export class TranslateCameraUseCase {
  constructor(
    private readonly ocrRepository: IOcrRepository,
    private readonly translationRepository: ITranslationRepository,
    private readonly textToSpeechRepository: ITextToSpeechRepository,
    private readonly audioRepository: IAudioRepository,
  ) {}

  async execute(
    imageUri: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    options: TranslateCameraOptions = {},
  ): Promise<TranslateCameraOutput> {
    const speak = options.speak ?? true;

    if (sourceLanguage === targetLanguage) {
      throw new AppError('TRANSLATION_FAILED', 'Source and target language must be different.');
    }

    assertLanguageSupportsTranslation(sourceLanguage, targetLanguage);
    if (speak) {
      assertLanguageSupportsTts(targetLanguage);
    }

    const pair = buildLanguagePair(sourceLanguage, targetLanguage);

    const ocrResult = await this.ocrRepository.extractText(imageUri, {
      languageHints: [sourceLanguage, targetLanguage],
    });

    if (!ocrResult.text.trim()) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'No text detected in the photo.');
    }

    const translatedText = await this.translationRepository.translate(
      ocrResult.text,
      sourceLanguage,
      targetLanguage,
    );

    let speechAudioUri: string | null = null;

    if (speak) {
      const ttsResult = await this.textToSpeechRepository.synthesize(
        translatedText,
        targetLanguage,
      );
      speechAudioUri = ttsResult.audioUri;
      void this.audioRepository.playAudio(ttsResult.audioUri);
    }

    const result = createTranslationResult({
      direction: pair.direction,
      sourceLanguage,
      targetLanguage,
      mode: 'camera',
      originalText: ocrResult.text,
      translatedText,
      speechAudioUri: speechAudioUri ?? undefined,
    });

    return { result, speechAudioUri };
  }

  async readAloud(text: string, language: LanguageCode): Promise<string> {
    const ttsResult = await this.textToSpeechRepository.synthesize(text, language);
    await this.audioRepository.playAudio(ttsResult.audioUri);
    return ttsResult.audioUri;
  }
}
