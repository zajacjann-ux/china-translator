import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { LanguageCode } from '../entities/Language';
import type { LanguagePair } from '../entities/TranslationDirection';
import type { TranslationResult } from '../entities/TranslationResult';
import type { VoiceTranslationMode } from '../entities/VoiceTranslationMode';
import type { AudioRecording, IAudioRepository } from '../repositories/IAudioRepository';
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
import { ChatLiveSpeechPipeline } from './ChatLiveSpeechPipeline';
import { encodeWavPcm16, mergeInt16Chunks } from '@/shared/utils/wav';
import { generateId } from '@/shared/utils/id';
import { isRealtimeChatEnabled } from '@/infrastructure/config/env';

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

interface ConversationSessionState {
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

function usesNativeStreaming(mode: VoiceTranslationMode): boolean {
  return Platform.OS !== 'web' && (mode === 'conversation' || (mode === 'chat' && isRealtimeChatEnabled()));
}

export class TranslateSpeechUseCase {
  private activeMode: VoiceTranslationMode = 'chat';
  private conversationSession: ConversationSessionState | null = null;
  private readonly chatPipeline: ChatLiveSpeechPipeline;

  constructor(
    private readonly audioRepository: IAudioRepository,
    private readonly speechToTextRepository: ISpeechToTextRepository,
    private readonly translationRepository: ITranslationRepository,
    private readonly textToSpeechRepository: ITextToSpeechRepository,
  ) {
    this.chatPipeline = new ChatLiveSpeechPipeline(this.translationRepository);
  }

  async startRecording(options: StartSpeechRecordingOptions = {}): Promise<void> {
    const mode = options.mode ?? 'chat';
    this.activeMode = mode;

    if (usesNativeStreaming(mode)) {
      if (!options.pair || !options.progress) {
        throw new AppError('RECORDING_FAILED', 'Streaming mode requires a language pair.');
      }

      if (mode === 'chat') {
        logger.info('CHAT MODE START', { sourceLanguage: options.pair.sourceLanguage });
        await this.audioRepository.startRecording({
          profile: 'fast',
          sampleRate: 24000,
          onPcmChunk: (chunk, sampleRate) => {
            this.chatPipeline.appendPcm(chunk, sampleRate);
          },
        });
        try {
          await this.chatPipeline.beginSession(options.pair, options.progress);
        } catch (error) {
          logger.warn('Chat Realtime connect failed; recorded WAV fallback remains available', error);
        }
        return;
      }

      this.beginConversationSession(options.pair, options.progress);
      logger.info('CONVERSATION MODE START', { sourceLanguage: options.pair.sourceLanguage });
      await this.audioRepository.startRecording({
        profile: 'fast',
        onPcmChunk: (chunk, sampleRate) => {
          this.appendConversationPcm(chunk, sampleRate);
        },
      });
      return;
    }

    this.clearConversationSession();
    this.chatPipeline.clearSession();
    await this.audioRepository.startRecording({ profile: 'accurate' });
  }

  async stopAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
    options: StopSpeechRecordingOptions = {},
  ): Promise<TranslateSpeechOutput> {
    const mode = options.mode ?? this.activeMode;

    if (mode === 'conversation') {
      if (usesNativeStreaming('conversation')) {
        return this.stopConversationAndTranslate(pair, progress);
      }
      return this.stopLegacyFileAndTranslate(pair, progress, { withTts: true });
    }

    if (mode === 'chat') {
      if (usesNativeStreaming('chat')) {
        return this.stopChatAndTranslate(pair, progress);
      }
      return this.stopLegacyFileAndTranslate(pair, progress, { withTts: false });
    }

    return this.stopLegacyFileAndTranslate(pair, progress, { withTts: true });
  }

  async replaySpeech(audioUri: string): Promise<void> {
    await this.audioRepository.playAudio(audioUri);
  }

  async cancelRecording(): Promise<void> {
    this.clearConversationSession();
    this.chatPipeline.clearSession();
    try {
      await this.audioRepository.stopRecording();
    } catch {
      // Ignore if nothing was recording
    }
  }

  async retrySpeechTranslation(
    pair: LanguagePair,
    originalText: string,
    progress?: TranslateSpeechProgressHandlers,
    options: StopSpeechRecordingOptions = {},
  ): Promise<TranslateSpeechOutput> {
    const mode = options.mode ?? this.activeMode;
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage, mode);

    const trimmed = originalText.trim();
    if (!trimmed) {
      throw new AppError('EMPTY_TRANSCRIPTION', 'No speech detected. Please try again.');
    }

    progress?.onTranscribed?.(trimmed);

    const translatedText = await this.translationRepository.translate(
      trimmed,
      pair.sourceLanguage,
      pair.targetLanguage,
      DEFAULT_TRANSLATION_CONTEXT,
      { profile: 'fast' },
    );

    progress?.onTranslated?.(trimmed, translatedText);

    const result = createTranslationResult({
      direction: pair.direction,
      sourceLanguage: pair.sourceLanguage,
      targetLanguage: pair.targetLanguage,
      mode: 'speech',
      originalText: trimmed,
      translatedText,
      recordingDurationMs: 0,
    });

    if (mode === 'chat') {
      this.activeMode = 'chat';
      return { result, speechAudioUri: '' };
    }

    const speechAudioUri = await this.playTranslatedSpeech(translatedText, pair.targetLanguage, 'conversation');
    this.activeMode = 'chat';
    return { result, speechAudioUri };
  }

  private async stopLegacyFileAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
    options: { withTts: boolean } = { withTts: true },
  ): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage, this.activeMode);
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
        { profile: 'fast' },
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

      if (!options.withTts) {
        return { result, speechAudioUri: '' };
      }

      const speechAudioUri = await this.playTranslatedSpeech(translatedText, pair.targetLanguage, 'conversation');
      return { result, speechAudioUri };
    } catch (error) {
      cancelPipelineTiming();
      throw error;
    } finally {
      this.activeMode = 'chat';
    }
  }
  private async stopConversationAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage, 'conversation');
    beginPipelineTiming();

    const session = this.conversationSession;
    this.clearConversationSessionTimers();

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

      const speechAudioUri = await this.playTranslatedSpeech(translatedText, pair.targetLanguage, 'conversation');
      return { result, speechAudioUri };
    } catch (error) {
      cancelPipelineTiming();
      throw error;
    } finally {
      this.conversationSession = null;
      this.activeMode = 'chat';
    }
  }

  private async stopChatAndTranslate(
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
    this.assertPairSupported(pair.sourceLanguage, pair.targetLanguage, 'chat');
    beginPipelineTiming();
    let recording: AudioRecording | null = null;

    try {
      recording = await this.audioRepository.stopRecording();
      markPipelineTiming('recording_finished');
      return await this.chatPipeline.finalize(recording, progress);
    } catch (error) {
      cancelPipelineTiming();
      this.chatPipeline.clearSession();
      if (!recording) throw error;
      logger.warn('Chat Realtime failed; falling back to recorded audio', error);
      try {
        return await this.translateRecordedChatAudio(recording, pair, progress);
      } catch (fallbackError) {
        logger.error('Chat WAV fallback failed', fallbackError);
        throw fallbackError;
      }
    } finally {
      this.activeMode = 'chat';
    }
  }

  private async translateRecordedChatAudio(
    recording: AudioRecording,
    pair: LanguagePair,
    progress?: TranslateSpeechProgressHandlers,
  ): Promise<TranslateSpeechOutput> {
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
      { profile: 'fast' },
    );
    progress?.onTranslated?.(originalText, translatedText);

    return {
      result: createTranslationResult({
        direction: pair.direction,
        sourceLanguage: pair.sourceLanguage,
        targetLanguage: pair.targetLanguage,
        mode: 'speech',
        originalText,
        translatedText,
        recordingDurationMs: recording.durationMs,
      }),
      speechAudioUri: '',
    };
  }

  private beginConversationSession(
    pair: LanguagePair,
    progress: TranslateSpeechProgressHandlers,
  ): void {
    this.clearConversationSession();

    this.conversationSession = {
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

    this.conversationSession.interimTimer = setInterval(() => {
      this.scheduleConversationInterimPass();
    }, FAST_INTERIM_STT_INTERVAL_MS);

    setTimeout(() => {
      this.scheduleConversationInterimPass();
    }, FAST_INTERIM_STT_MIN_MS);
  }

  private appendConversationPcm(chunk: Int16Array, sampleRate: number): void {
    const session = this.conversationSession;
    if (!session) return;

    session.pcmChunks.push(chunk);
    session.sampleRate = sampleRate;

    const pcm = mergeInt16Chunks(session.pcmChunks);
    const durationMs = (pcm.length / session.sampleRate) * 1000;
    if (durationMs < FAST_INTERIM_STT_MIN_MS) return;

    if (session.pcmDebounceTimer) {
      clearTimeout(session.pcmDebounceTimer);
    }

    session.pcmDebounceTimer = setTimeout(() => {
      this.scheduleConversationInterimPass();
    }, FAST_PCM_DEBOUNCE_MS);
  }

  private scheduleConversationInterimPass(): void {
    const session = this.conversationSession;
    if (!session) return;

    if (session.interimInFlight) {
      session.interimPassPending = true;
      return;
    }

    void this.runConversationInterimPass();
  }

  private async runConversationInterimPass(): Promise<void> {
    const session = this.conversationSession;
    if (!session || session.interimInFlight) return;

    const pcm = mergeInt16Chunks(session.pcmChunks);
    const durationMs = (pcm.length / session.sampleRate) * 1000;
    if (durationMs < FAST_INTERIM_STT_MIN_MS) return;

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
      if (!partialText || partialText === session.latestOriginalText) return;

      session.latestOriginalText = partialText;
      logger.info('PARTIAL TRANSCRIPT:', partialText);
      markFastPerf('interim_stt_done', { textLength: partialText.length, audioMs: Math.round(durationMs) });
      session.progress.onPartialTranscription?.(partialText);
      this.scheduleConversationPartialTranslation(partialText);
    } catch (error) {
      logger.warn('Conversation interim transcription failed', error);
    } finally {
      session.interimInFlight = false;

      if (session.interimPassPending) {
        session.interimPassPending = false;
        this.scheduleConversationInterimPass();
      }
    }
  }

  private scheduleConversationPartialTranslation(originalText: string): void {
    const session = this.conversationSession;
    if (!session) return;

    if (originalText.trim().length < FAST_TRANSLATION_MIN_CHARS) return;

    if (session.translationTimer) {
      clearTimeout(session.translationTimer);
    }

    session.translationTimer = setTimeout(() => {
      void this.runConversationPartialTranslation(originalText);
    }, FAST_TRANSLATION_DEBOUNCE_MS);
  }

  private async runConversationPartialTranslation(originalText: string): Promise<void> {
    const session = this.conversationSession;
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
      logger.warn('Conversation partial translation failed', error);
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
    if (profile === 'chat') {
      return '';
    }

    try {
      markFastPerfAfterRelease('tts_start');
      const ttsResult = await this.textToSpeechRepository.synthesize(translatedText, targetLanguage, {
        profile: 'fast',
      });
      markFastPerfAfterRelease('tts_ready', { audioUri: ttsResult.audioUri });
      await this.audioRepository.playAudio(ttsResult.audioUri);
      return ttsResult.audioUri;
    } catch (error) {
      cancelPipelineTiming();
      logger.error('TTS pipeline failed', error);
      return '';
    }
  }

  private clearConversationSessionTimers(): void {
    if (!this.conversationSession) return;

    if (this.conversationSession.interimTimer) {
      clearInterval(this.conversationSession.interimTimer);
    }
    if (this.conversationSession.pcmDebounceTimer) {
      clearTimeout(this.conversationSession.pcmDebounceTimer);
    }
    if (this.conversationSession.translationTimer) {
      clearTimeout(this.conversationSession.translationTimer);
    }
  }

  private clearConversationSession(): void {
    this.clearConversationSessionTimers();
    this.conversationSession = null;
  }

  private assertPairSupported(
    source: LanguageCode,
    target: LanguageCode,
    mode: VoiceTranslationMode = this.activeMode,
  ): void {
    if (source === target) {
      throw new AppError('TRANSLATION_FAILED', 'Source and target language must be different.');
    }
    assertLanguageSupportsStt(source);
    assertLanguageSupportsTranslation(source, target);
    if (mode !== 'chat') {
      assertLanguageSupportsTts(target);
    }
  }
}
