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

export interface TranslateSpeechOutput {
  result: TranslationResult;
  speechAudioUri: string;
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

  async stopAndTranslate(pair: LanguagePair): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage);

    const recording = await this.audioRepository.stopRecording();

    if (recording.durationMs < MIN_RECORDING_MS) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'Hold the button longer while speaking.');
    }

    const sttResult = await this.speechToTextRepository.transcribe(recording, pair.sourceLanguage);
    if (!sttResult.text.trim()) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
    }

    const translatedText = await this.translationRepository.translate(
      sttResult.text,
      pair.sourceLanguage,
      pair.targetLanguage,
    );

    const ttsResult = await this.textToSpeechRepository.synthesize(
      translatedText,
      pair.targetLanguage,
    );

    void this.audioRepository.playAudio(ttsResult.audioUri);

    const result = createTranslationResult({
      direction: pair.direction,
      sourceLanguage: pair.sourceLanguage,
      targetLanguage: pair.targetLanguage,
      mode: 'speech',
      originalText: sttResult.text,
      translatedText,
      recordingDurationMs: recording.durationMs,
      speechAudioUri: ttsResult.audioUri,
    });

    return { result, speechAudioUri: ttsResult.audioUri };
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
