import type { LanguageCode } from '../entities/Language';
import type { LanguagePair } from '../entities/TranslationDirection';
import type { TranslationResult } from '../entities/TranslationResult';
import type { IAudioRepository } from '../repositories/IAudioRepository';
import type { ISpeechToTextRepository } from '../repositories/ISpeechToTextRepository';
import type { ITranslationRepository } from '../repositories/ITranslationRepository';
import type { ITextToSpeechRepository } from '../repositories/ITextToSpeechRepository';
import { createTranslationResult } from '../entities/TranslationResult';
import {
  assertLanguageSupportsStt,
  assertLanguageSupportsTranslation,
  assertLanguageSupportsTts,
} from '../entities/Language';
import { AppError } from '@/shared/errors/AppError';
import { MIN_RECORDING_MS } from '@/shared/constants';
import { logger } from '@/infrastructure/logging/logger';

export interface TranslateSpeechOutput {
  result: TranslationResult;
  speechAudioUri: string;
}

export interface TranslateSpeechProgressHandlers {
  onTranscribed?: (originalText: string) => void;
  onTranslated?: (originalText: string, translatedText: string) => void;
}

export class TranslateSpeechUseCase {
  constructor(
    private readonly audioRepository: IAudioRepository,
    private readonly speechToTextRepository: ISpeechToTextRepository,
    private readonly translationRepository: ITranslationRepository,
    private readonly textToSpeechRepository: ITextToSpeechRepository,
  ) {}

  async startRecording(): Promise<void> {
    const granted = await this.audioRepository.requestPermission();
    if (!granted) {
      throw new AppError('PERMISSION_DENIED', 'Microphone permission is required.');
    }
    await this.audioRepository.startRecording();
  }

  async stopAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage);

    const recording = await this.audioRepository.stopRecording();

    if (recording.durationMs < MIN_RECORDING_MS) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'Hold the button longer while speaking.');
    }

    const sttResult = await this.speechToTextRepository.transcribe(recording, pair.sourceLanguage);
    const originalText = sttResult.text.trim();
    if (!originalText) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
    }

    progress?.onTranscribed?.(originalText);

    const translatedText = await this.translationRepository.translate(
      originalText,
      pair.sourceLanguage,
      pair.targetLanguage,
    );

    progress?.onTranslated?.(originalText, translatedText);

    const result = createTranslationResult({
      direction: pair.direction,
      sourceLanguage: pair.sourceLanguage,
      targetLanguage: pair.targetLanguage,
      mode: 'speech',
      originalText,
      translatedText,
      recordingDurationMs: recording.durationMs,
    });

    void (async () => {
      try {
        const ttsResult = await this.textToSpeechRepository.synthesize(
          translatedText,
          pair.targetLanguage,
        );
        await this.audioRepository.playAudio(ttsResult.audioUri);
      } catch (error) {
        logger.error('TTS pipeline failed', error);
      }
    })();

    return { result, speechAudioUri: result.speechAudioUri ?? '' };
  }

  async replaySpeech(audioUri: string): Promise<void> {
    await this.audioRepository.playAudio(audioUri);
  }

  async cancelRecording(): Promise<void> {
    try {
      await this.audioRepository.stopRecording();
    } catch {
      // Ignore if nothing was recording
    }
  }

  private assertPairSupported(source: LanguageCode, target: LanguageCode): void {
    if (source === target) {
      throw new AppError('TRANSLATION_FAILED', 'Source and target language must be different.');
    }
    assertLanguageSupportsStt(source);
    assertLanguageSupportsTranslation(source, target);
    assertLanguageSupportsTts(target);
  }
}
