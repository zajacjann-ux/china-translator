import { File, Paths } from 'expo-file-system';
import type { LanguagePair } from '../entities/TranslationDirection';
import type { ISpeechToTextRepository } from '../repositories/ISpeechToTextRepository';
import type { ITranslationRepository } from '../repositories/ITranslationRepository';
import type { TranslateSpeechOutput, TranslateSpeechProgressHandlers } from './TranslateSpeechUseCase';
import { createTranslationResult } from '../entities/TranslationResult';
import { AppError } from '@/shared/errors/AppError';
import { MIN_RECORDING_MS } from '@/shared/constants';
import { logger } from '@/infrastructure/logging/logger';
import { DEFAULT_TRANSLATION_CONTEXT } from '@/config/translation.config';
import {
  CHAT_INTERIM_STT_INTERVAL_MS,
  CHAT_INTERIM_STT_MIN_MS,
  CHAT_PCM_DEBOUNCE_MS,
  CHAT_TRANSLATION_MIN_CHARS,
  CHAT_TRANSLATION_THROTTLE_MS,
} from '@/config/voiceTranslation.config';
import {
  beginChatPerf,
  markChatFirstSourceText,
  markChatFirstTranslationRequest,
  markChatFirstTranslationVisible,
  markChatPerf,
  markChatPerfAfterRelease,
  resetChatPerf,
} from '@/infrastructure/logging/chatPerf';
import { encodeWavPcm16, mergeInt16Chunks } from '@/shared/utils/wav';
import { generateId } from '@/shared/utils/id';
import type { AudioRecording } from '../repositories/IAudioRepository';

interface ChatSessionState {
  pair: LanguagePair;
  progress: TranslateSpeechProgressHandlers;
  pcmChunks: Int16Array[];
  sampleRate: number;
  interimTimer: ReturnType<typeof setInterval> | null;
  pcmDebounceTimer: ReturnType<typeof setTimeout> | null;
  translationTimer: ReturnType<typeof setTimeout> | null;
  interimInFlight: boolean;
  interimPassPending: boolean;
  translationInFlight: boolean;
  translationPending: boolean;
  latestOriginalText: string;
  latestTranslatedText: string;
  latestTranslationSourceText: string;
  translationSeq: number;
  lastTranslationDispatchMs: number;
}

/**
 * Real-time text-only Chat pipeline.
 * Chunk-based interim Whisper + throttled live translation while recording.
 */
export class ChatLiveSpeechPipeline {
  private session: ChatSessionState | null = null;

  constructor(
    private readonly speechToTextRepository: ISpeechToTextRepository,
    private readonly translationRepository: ITranslationRepository,
  ) {}

  beginSession(pair: LanguagePair, progress: TranslateSpeechProgressHandlers): void {
    this.clearSession();
    beginChatPerf();

    this.session = {
      pair,
      progress,
      pcmChunks: [],
      sampleRate: 16000,
      interimTimer: null,
      pcmDebounceTimer: null,
      translationTimer: null,
      interimInFlight: false,
      interimPassPending: false,
      translationInFlight: false,
      translationPending: false,
      latestOriginalText: '',
      latestTranslatedText: '',
      latestTranslationSourceText: '',
      translationSeq: 0,
      lastTranslationDispatchMs: 0,
    };

    this.session.interimTimer = setInterval(() => {
      void this.runInterimSttPass();
    }, CHAT_INTERIM_STT_INTERVAL_MS);

    setTimeout(() => {
      void this.runInterimSttPass();
    }, CHAT_INTERIM_STT_MIN_MS);
  }

  appendPcm(chunk: Int16Array, sampleRate: number): void {
    const session = this.session;
    if (!session) return;

    session.pcmChunks.push(chunk);
    session.sampleRate = sampleRate;

    const pcm = mergeInt16Chunks(session.pcmChunks);
    const durationMs = (pcm.length / session.sampleRate) * 1000;
    if (durationMs < CHAT_INTERIM_STT_MIN_MS) return;

    if (session.pcmDebounceTimer) {
      clearTimeout(session.pcmDebounceTimer);
    }

    session.pcmDebounceTimer = setTimeout(() => {
      void this.runInterimSttPass();
    }, CHAT_PCM_DEBOUNCE_MS);
  }

  clearTimers(): void {
    if (!this.session) return;

    if (this.session.interimTimer) {
      clearInterval(this.session.interimTimer);
    }
    if (this.session.pcmDebounceTimer) {
      clearTimeout(this.session.pcmDebounceTimer);
    }
    if (this.session.translationTimer) {
      clearTimeout(this.session.translationTimer);
    }
  }

  clearSession(): void {
    this.clearTimers();
    this.session = null;
    resetChatPerf();
  }

  async finalize(
    recording: AudioRecording,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
    const session = this.session;
    this.clearTimers();

    if (recording.durationMs < MIN_RECORDING_MS) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'Hold the button longer while speaking.');
    }

    const handlers = progress ?? session?.progress;
    let originalText = session?.latestOriginalText.trim() ?? '';

    if (originalText) {
      handlers?.onTranscribed?.(originalText);
      markChatPerfAfterRelease('final_source', { chars: originalText.length, fromLive: true });
    }

    markChatPerfAfterRelease('final_stt_start');
    const finalStt = await this.speechToTextRepository.transcribe(recording, session!.pair.sourceLanguage, {
      usePrompt: true,
    });
    markChatPerfAfterRelease('final_stt_done', { textLength: finalStt.text.trim().length });

    const finalOriginalText = finalStt.text.trim();
    if (finalOriginalText) {
      originalText = finalOriginalText;
    }

    if (!originalText) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
    }

    handlers?.onTranscribed?.(originalText);

    let translatedText = session?.latestTranslatedText.trim() ?? '';
    const canReuseCachedTranslation =
      translatedText.length > 0 && session?.latestTranslationSourceText === originalText;

    if (!canReuseCachedTranslation) {
      translatedText = await this.translationRepository.translate(
        originalText,
        session!.pair.sourceLanguage,
        session!.pair.targetLanguage,
        DEFAULT_TRANSLATION_CONTEXT,
        { profile: 'fast' },
      );
    }

    markChatPerfAfterRelease('final_translation', { chars: translatedText.length, cached: canReuseCachedTranslation });
    handlers?.onTranslated?.(originalText, translatedText);

    const result = createTranslationResult({
      direction: session!.pair.direction,
      sourceLanguage: session!.pair.sourceLanguage,
      targetLanguage: session!.pair.targetLanguage,
      mode: 'speech',
      originalText,
      translatedText,
      recordingDurationMs: recording.durationMs,
    });

    markChatPerfAfterRelease('message_finalized');
    this.session = null;

    return { result, speechAudioUri: '' };
  }

  private async runInterimSttPass(): Promise<void> {
    const session = this.session;
    if (!session || session.interimInFlight) {
      if (session) session.interimPassPending = true;
      return;
    }

    const pcm = mergeInt16Chunks(session.pcmChunks);
    const durationMs = (pcm.length / session.sampleRate) * 1000;
    if (durationMs < CHAT_INTERIM_STT_MIN_MS) return;

    session.interimInFlight = true;

    try {
      markChatPerf('interim_stt_start', { audioMs: Math.round(durationMs) });
      const recording = await this.writePcmRecording(pcm, session.sampleRate, durationMs);
      const sttResult = await this.speechToTextRepository.transcribe(
        recording,
        session.pair.sourceLanguage,
        { usePrompt: false, allowEmpty: true },
      );

      const partialText = sttResult.text.trim();
      if (!partialText || partialText === session.latestOriginalText) return;

      session.latestOriginalText = partialText;
      logger.info('CHAT PARTIAL TRANSCRIPT:', partialText);
      markChatFirstSourceText(partialText);
      markChatPerf('interim_stt_done', { textLength: partialText.length, audioMs: Math.round(durationMs) });

      session.progress.onPartialTranscription?.(partialText);
      this.scheduleLiveTranslation();
    } catch (error) {
      logger.warn('Chat interim transcription failed', error);
    } finally {
      session.interimInFlight = false;

      if (session.interimPassPending) {
        session.interimPassPending = false;
        void this.runInterimSttPass();
      }
    }
  }

  private scheduleLiveTranslation(): void {
    const session = this.session;
    if (!session) return;
    if (session.latestOriginalText.trim().length < CHAT_TRANSLATION_MIN_CHARS) return;

    if (session.translationInFlight) {
      session.translationPending = true;
      return;
    }

    if (session.translationTimer) return;

    const now = Date.now();
    const elapsed = now - session.lastTranslationDispatchMs;
    const delay = Math.max(0, CHAT_TRANSLATION_THROTTLE_MS - elapsed);

    session.translationTimer = setTimeout(() => {
      session.translationTimer = null;
      void this.runLiveTranslation();
    }, delay);
  }

  private async runLiveTranslation(): Promise<void> {
    const session = this.session;
    if (!session) return;

    if (session.translationInFlight) {
      session.translationPending = true;
      return;
    }

    const sourceText = session.latestOriginalText.trim();
    if (sourceText.length < CHAT_TRANSLATION_MIN_CHARS) return;

    if (sourceText === session.latestTranslationSourceText && session.latestTranslatedText.trim()) {
      return;
    }

    session.translationInFlight = true;
    session.lastTranslationDispatchMs = Date.now();
    const requestSeq = ++session.translationSeq;
    markChatFirstTranslationRequest();

    try {
      const translatedText = await this.translationRepository.translate(
        sourceText,
        session.pair.sourceLanguage,
        session.pair.targetLanguage,
        DEFAULT_TRANSLATION_CONTEXT,
        { profile: 'fast' },
      );

      if (!this.session || requestSeq !== this.session.translationSeq) return;
      if (sourceText !== this.session.latestOriginalText) return;

      this.session.latestTranslatedText = translatedText;
      this.session.latestTranslationSourceText = sourceText;
      markChatFirstTranslationVisible(translatedText);
      this.session.progress.onPartialTranslation?.(sourceText, translatedText);
    } catch (error) {
      logger.warn('Chat live translation failed', error);
    } finally {
      if (!this.session) return;
      this.session.translationInFlight = false;

      if (this.session.translationPending) {
        this.session.translationPending = false;
        this.scheduleLiveTranslation();
        return;
      }

      const current = this.session.latestOriginalText.trim();
      if (
        current.length >= CHAT_TRANSLATION_MIN_CHARS &&
        current !== this.session.latestTranslationSourceText
      ) {
        this.scheduleLiveTranslation();
      }
    }
  }

  private async writePcmRecording(
    pcm: Int16Array,
    sampleRate: number,
    durationMs: number,
  ): Promise<AudioRecording> {
    const wavBytes = encodeWavPcm16(pcm, sampleRate, 1);
    const file = new File(Paths.cache, `chat-interim-${generateId()}.wav`);
    file.write(wavBytes);

    const uri = file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`;

    return {
      uri,
      durationMs,
      mimeType: 'audio/wav',
      fileSizeBytes: wavBytes.byteLength,
    };
  }
}
