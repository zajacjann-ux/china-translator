import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { LanguageCode } from '../entities/Language';
import type { LanguagePair } from '../entities/TranslationDirection';
import type { TranslationResult } from '../entities/TranslationResult';
import type { VoiceTranslationMode } from '../entities/VoiceTranslationMode';
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
import {
  markFastPerf,
  markFastPerfAfterRelease,
} from '@/infrastructure/logging/fastPerf';
import { DEFAULT_TRANSLATION_CONTEXT } from '@/config/translation.config';
import {
  FAST_INTERIM_STT_INTERVAL_MS,
  FAST_INTERIM_STT_MIN_MS,
  FAST_PCM_DEBOUNCE_MS,
  FAST_TRANSLATION_DEBOUNCE_MS,
  FAST_TRANSLATION_MIN_CHARS,
} from '@/config/voiceTranslation.config';
import {
  beginPipelineTiming,
  cancelPipelineTiming,
  markPipelineTiming,
} from '@/infrastructure/logging/translationTiming';
import { encodeWavPcm16, mergeInt16Chunks } from '@/shared/utils/wav';
import { generateId } from '@/shared/utils/id';

export interface TranslateSpeechOutput {
  result: TranslationResult;
  speechAudioUri: string;
}

export interface TranslateSpeechProgressHandlers {
  onTranscribed?: (originalText: string) => void;
  onTranslated?: (originalText: string, translatedText: string) => void;
  onPartialTranscription?: (partialText: string) => void;
  onPartialTranslation?: (originalText: string, partialTranslated: string) => void;
}

export interface StartSpeechRecordingOptions {
  mode?: VoiceTranslationMode;
  pair?: LanguagePair;
  progress?: TranslateSpeechProgressHandlers;
}

export interface StopSpeechRecordingOptions {
  mode?: VoiceTranslationMode;
}

interface FastSessionState {
  pair: LanguagePair;
  progress: TranslateSpeechProgressHandlers;
  pcmChunks: Int16Array[];
  sampleRate: number;
  interimTimer: ReturnType<typeof setInterval> | null;
  pcmDebounceTimer: ReturnType<typeof setTimeout> | null;
  translationTimer: ReturnType<typeof setTimeout> | null;
  interimInFlight: boolean;
  interimPassPending: boolean;
  latestOriginalText: string;
  latestTranslatedText: string;
  latestTranslationSourceText: string;
}

export class TranslateSpeechUseCase {
  private activeMode: VoiceTranslationMode = 'accurate';
  private fastSession: FastSessionState | null = null;

  constructor(
    private readonly audioRepository: IAudioRepository,
    private readonly speechToTextRepository: ISpeechToTextRepository,
    private readonly translationRepository: ITranslationRepository,
    private readonly textToSpeechRepository: ITextToSpeechRepository,
  ) {}

  async startRecording(options: StartSpeechRecordingOptions = {}): Promise<void> {
    const requestedMode = options.mode ?? 'accurate';
    const mode =
      requestedMode === 'fast' && Platform.OS === 'web' ? 'accurate' : requestedMode;
    this.activeMode = mode;

    if (mode === 'fast') {
      if (!options.pair || !options.progress) {
        throw new AppError('RECORDING_FAILED', 'Fast mode requires a language pair.');
      }

      this.beginFastSession(options.pair, options.progress);
      logger.info('FAST MODE START', { sourceLanguage: options.pair.sourceLanguage });
      console.log('[FAST DEBUG] FAST MODE START', {
        sourceLanguage: options.pair.sourceLanguage,
        targetLanguage: options.pair.targetLanguage,
        platform: Platform.OS,
      });
      await this.audioRepository.startRecording({
        profile: 'fast',
        onPcmChunk: (chunk, sampleRate) => {
          this.appendFastPcm(chunk, sampleRate);
        },
      });
      return;
    }

    this.clearFastSession();
    await this.audioRepository.startRecording({ profile: 'accurate' });
  }

  async stopAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
    options: StopSpeechRecordingOptions = {},
  ): Promise<TranslateSpeechOutput> {
    const mode = options.mode ?? this.activeMode;
    if (mode === 'fast') {
      return this.stopFastAndTranslate(pair, progress);
    }
    return this.stopAccurateAndTranslate(pair, progress);
  }

  async replaySpeech(audioUri: string): Promise<void> {
    await this.audioRepository.playAudio(audioUri);
  }

  async cancelRecording(): Promise<void> {
    this.clearFastSession();
    try {
      await this.audioRepository.stopRecording();
    } catch {
      // Ignore if nothing was recording
    }
  }

  private async stopAccurateAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage);
    beginPipelineTiming();

    try {
      const recording = await this.audioRepository.stopRecording();
      markPipelineTiming('recording_finished');

      if (recording.durationMs < MIN_RECORDING_MS) {
        throw new AppError('EMPTY_TRANSCRIPTION', 'Hold the button longer while speaking.');
      }

      const sttResult = await this.speechToTextRepository.transcribe(recording, pair.sourceLanguage, {
        usePrompt: true,
      });
      const originalText = sttResult.text.trim();
      if (!originalText) {
        throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
      }

      progress?.onTranscribed?.(originalText);

      const translatedText = await this.translationRepository.translate(
        originalText,
        pair.sourceLanguage,
        pair.targetLanguage,
        DEFAULT_TRANSLATION_CONTEXT,
        { profile: 'accurate' },
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

      const speechAudioUri = await this.playTranslatedSpeech(translatedText, pair.targetLanguage, 'accurate');
      return { result, speechAudioUri };
    } catch (error) {
      cancelPipelineTiming();
      throw error;
    } finally {
      this.activeMode = 'accurate';
    }
  }

  private async stopFastAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage);
    beginPipelineTiming();

    const session = this.fastSession;
    this.clearFastSessionTimers();

    try {
      const recording = await this.audioRepository.stopRecording();
      markPipelineTiming('recording_finished');
      markFastPerfAfterRelease('recording_stopped', { durationMs: recording.durationMs });

      if (recording.durationMs < MIN_RECORDING_MS) {
        throw new AppError('EMPTY_TRANSCRIPTION', 'Hold the button longer while speaking.');
      }

      const handlers = progress ?? session?.progress;
      let originalText = session?.latestOriginalText.trim() ?? '';

      markFastPerfAfterRelease('final_stt_start');
      const finalStt = await this.speechToTextRepository.transcribe(recording, pair.sourceLanguage, {
        usePrompt: true,
      });
      markFastPerfAfterRelease('final_stt_done', { textLength: finalStt.text.trim().length });
      const finalOriginalText = finalStt.text.trim();
      if (finalOriginalText) {
        originalText = finalOriginalText;
      }

      if (!originalText) {
        throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
      }

      logger.info('FINAL TRANSCRIPT:', originalText);
      handlers?.onTranscribed?.(originalText);

      let translatedText = session?.latestTranslatedText.trim() ?? '';
      const canReuseCachedTranslation =
        translatedText.length > 0 && session?.latestTranslationSourceText === originalText;

      if (!canReuseCachedTranslation) {
        logger.info('TRANSLATION START', { sourceLanguage: pair.sourceLanguage, targetLanguage: pair.targetLanguage });
        markFastPerfAfterRelease('translation_start');
        translatedText = await this.translationRepository.translate(
          originalText,
          pair.sourceLanguage,
          pair.targetLanguage,
          DEFAULT_TRANSLATION_CONTEXT,
          { profile: 'fast' },
        );
        logger.info('TRANSLATION COMPLETE', { translatedText });
      } else {
        logger.info('TRANSLATION COMPLETE', { translatedText, cached: true });
      }

      handlers?.onTranslated?.(originalText, translatedText);

      const result = createTranslationResult({
        direction: pair.direction,
        sourceLanguage: pair.sourceLanguage,
        targetLanguage: pair.targetLanguage,
        mode: 'speech',
        originalText,
        translatedText,
        recordingDurationMs: recording.durationMs,
      });

      const speechAudioUri = await this.playTranslatedSpeech(translatedText, pair.targetLanguage, 'fast');
      return { result, speechAudioUri };
    } catch (error) {
      cancelPipelineTiming();
      throw error;
    } finally {
      this.fastSession = null;
      this.activeMode = 'accurate';
    }
  }

  private beginFastSession(pair: LanguagePair, progress: TranslateSpeechProgressHandlers): void {
    this.clearFastSession();
    this.fastSession = {
      pair,
      progress,
      pcmChunks: [],
      sampleRate: 16000,
      interimTimer: null,
      pcmDebounceTimer: null,
      translationTimer: null,
      interimInFlight: false,
      interimPassPending: false,
      latestOriginalText: '',
      latestTranslatedText: '',
      latestTranslationSourceText: '',
    };

    this.fastSession.interimTimer = setInterval(() => {
      this.scheduleInterimPass();
    }, FAST_INTERIM_STT_INTERVAL_MS);

    setTimeout(() => {
      this.scheduleInterimPass();
    }, FAST_INTERIM_STT_MIN_MS);
  }

  private appendFastPcm(chunk: Int16Array, sampleRate: number): void {
    if (!this.fastSession) {
      console.log('[FAST DEBUG] appendFastPcm skipped — no fastSession');
      return;
    }
    this.fastSession.pcmChunks.push(chunk);
    this.fastSession.sampleRate = sampleRate;

    const pcm = mergeInt16Chunks(this.fastSession.pcmChunks);
    const durationMs = (pcm.length / this.fastSession.sampleRate) * 1000;
    if (durationMs < FAST_INTERIM_STT_MIN_MS) return;

    if (this.fastSession.pcmDebounceTimer) {
      clearTimeout(this.fastSession.pcmDebounceTimer);
    }

    this.fastSession.pcmDebounceTimer = setTimeout(() => {
      this.scheduleInterimPass();
    }, FAST_PCM_DEBOUNCE_MS);
  }

  private scheduleInterimPass(): void {
    const session = this.fastSession;
    if (!session) return;

    if (session.interimInFlight) {
      session.interimPassPending = true;
      return;
    }

    void this.runInterimPass();
  }

  private async runInterimPass(): Promise<void> {
    const session = this.fastSession;
    if (!session || session.interimInFlight) {
      console.log('[FAST DEBUG] runInterimPass skipped', {
        hasSession: Boolean(session),
        interimInFlight: session?.interimInFlight ?? false,
      });
      return;
    }

    const pcm = mergeInt16Chunks(session.pcmChunks);
    const durationMs = (pcm.length / session.sampleRate) * 1000;
    console.log('[FAST DEBUG] runInterimPass executing', {
      pcmSamples: pcm.length,
      durationMs: Math.round(durationMs),
      minRequiredMs: FAST_INTERIM_STT_MIN_MS,
    });
    if (durationMs < FAST_INTERIM_STT_MIN_MS) {
      console.log('[FAST DEBUG] runInterimPass aborted — not enough audio yet');
      return;
    }

    session.interimInFlight = true;

    try {
      markFastPerf('interim_stt_start', { audioMs: Math.round(durationMs) });
      const recording = await this.writePcmRecording(pcm, session.sampleRate, durationMs);
      const sttResult = await this.speechToTextRepository.transcribe(
        recording,
        session.pair.sourceLanguage,
        { usePrompt: false, allowEmpty: true },
      );
      const partialText = sttResult.text.trim();
      console.log('[FAST DEBUG] Whisper partial response', {
        text: partialText || '(empty)',
        textLength: partialText.length,
        previousText: session.latestOriginalText || '(none)',
      });
      if (!partialText || partialText === session.latestOriginalText) {
        console.log('[FAST DEBUG] runInterimPass — no UI update (empty or unchanged)');
        return;
      }

      session.latestOriginalText = partialText;
      logger.info('PARTIAL TRANSCRIPT:', partialText);
      console.log('[FAST DEBUG] onPartialTranscription callback firing', { partialText });
      markFastPerf('interim_stt_done', { textLength: partialText.length, audioMs: Math.round(durationMs) });
      session.progress.onPartialTranscription?.(partialText);
      this.schedulePartialTranslation(partialText);
    } catch (error) {
      console.log('[FAST DEBUG] runInterimPass failed', error);
      logger.warn('Fast interim transcription failed', error);
    } finally {
      session.interimInFlight = false;

      if (session.interimPassPending) {
        session.interimPassPending = false;
        this.scheduleInterimPass();
      }
    }
  }

  private schedulePartialTranslation(originalText: string): void {
    const session = this.fastSession;
    if (!session) return;

    if (originalText.trim().length < FAST_TRANSLATION_MIN_CHARS) return;

    if (session.translationTimer) {
      clearTimeout(session.translationTimer);
    }

    session.translationTimer = setTimeout(() => {
      void this.runPartialTranslation(originalText);
    }, FAST_TRANSLATION_DEBOUNCE_MS);
  }

  private async runPartialTranslation(originalText: string): Promise<void> {
    const session = this.fastSession;
    if (!session) return;
    if (originalText !== session.latestOriginalText) return;

    try {
      const translatedText = await this.translationRepository.translate(
        originalText,
        session.pair.sourceLanguage,
        session.pair.targetLanguage,
        DEFAULT_TRANSLATION_CONTEXT,
        { profile: 'fast' },
      );

      if (originalText !== session.latestOriginalText) return;

      session.latestTranslatedText = translatedText;
      session.latestTranslationSourceText = originalText;
      session.progress.onPartialTranslation?.(originalText, translatedText);
    } catch (error) {
      logger.warn('Fast partial translation failed', error);
    }
  }

  private async writePcmRecording(
    pcm: Int16Array,
    sampleRate: number,
    durationMs: number,
  ): Promise<{ uri: string; durationMs: number; mimeType: string; fileSizeBytes: number }> {
    const wavBytes = encodeWavPcm16(pcm, sampleRate, 1);
    const file = new File(Paths.cache, `fast-interim-${generateId()}.wav`);
    file.write(wavBytes);

    const uri = file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`;

    return {
      uri,
      durationMs,
      mimeType: 'audio/wav',
      fileSizeBytes: wavBytes.byteLength,
    };
  }

  private async playTranslatedSpeech(
    translatedText: string,
    targetLanguage: LanguageCode,
    profile: VoiceTranslationMode,
  ): Promise<string> {
    try {
      if (profile === 'fast') {
        markFastPerfAfterRelease('tts_start');
      }
      const ttsResult = await this.textToSpeechRepository.synthesize(translatedText, targetLanguage, {
        profile,
      });
      if (profile === 'fast') {
        markFastPerfAfterRelease('tts_ready', { audioUri: ttsResult.audioUri });
      }
      await this.audioRepository.playAudio(ttsResult.audioUri);
      return ttsResult.audioUri;
    } catch (error) {
      cancelPipelineTiming();
      logger.error('TTS pipeline failed', error);
      return '';
    }
  }

  private clearFastSessionTimers(): void {
    if (!this.fastSession) return;

    if (this.fastSession.interimTimer) {
      clearInterval(this.fastSession.interimTimer);
    }
    if (this.fastSession.pcmDebounceTimer) {
      clearTimeout(this.fastSession.pcmDebounceTimer);
    }
    if (this.fastSession.translationTimer) {
      clearTimeout(this.fastSession.translationTimer);
    }
  }

  private clearFastSession(): void {
    this.clearFastSessionTimers();
    this.fastSession = null;
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
