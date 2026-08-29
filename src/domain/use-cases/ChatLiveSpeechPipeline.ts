import type { LanguageCode } from '../entities/Language';
import type { LanguagePair } from '../entities/TranslationDirection';
import type { ITranslationRepository } from '../repositories/ITranslationRepository';
import type { AudioRecording } from '../repositories/IAudioRepository';
import type { TranslateSpeechOutput, TranslateSpeechProgressHandlers } from './TranslateSpeechUseCase';
import { createTranslationResult } from '../entities/TranslationResult';
import { getLanguage } from '../entities/Language';
import { AppError } from '@/shared/errors/AppError';
import { MIN_RECORDING_MS } from '@/shared/constants';
import { logger } from '@/infrastructure/logging/logger';
import { getEnvConfig, isRealtimeChatEnabled } from '@/infrastructure/config/env';
import { DEFAULT_TRANSLATION_CONTEXT } from '@/config/translation.config';
import { CHAT_TRANSLATION_MIN_CHARS, CHAT_TRANSLATION_THROTTLE_MS } from '@/config/voiceTranslation.config';
import {
  beginChatPerf,
  markChatFirstSourceText,
  markChatFirstTranslationRequest,
  markChatFirstTranslationVisible,
  markChatPerf,
  markChatPerfAfterRelease,
  resetChatPerf,
} from '@/infrastructure/logging/chatPerf';

const REALTIME_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';
const REALTIME_MODEL = 'gpt-live-transcribe';
const TARGET_RATE = 24000;
const MIN_COMMIT_SAMPLES = Math.round(TARGET_RATE * 0.35);
const COMMIT_CHECK_MS = 250;
const FINAL_TIMEOUT_MS = 8000;

type RnWebSocketConstructor = new (
  url: string,
  protocols?: string | string[] | null,
  options?: { headers?: Record<string, string> },
) => WebSocket;

interface RealtimeEvent {
  type?: string;
  delta?: string;
  transcript?: string;
  item_id?: string;
  item?: { id?: string };
  error?: { message?: string; code?: string; type?: string };
}

interface Session {
  pair: LanguagePair;
  progress: TranslateSpeechProgressHandlers;
  socket: WebSocket;
  ready: boolean;
  bufferedAudio: string[];
  pending: Set<string>;
  itemOrder: string[];
  deltas: Map<string, string>;
  completed: Map<string, string>;
  commitTimer: ReturnType<typeof setInterval> | null;
  translationTimer: ReturnType<typeof setTimeout> | null;
  translationInFlight: boolean;
  translationPending: boolean;
  source: string;
  translation: string;
  translatedSource: string;
  translationSeq: number;
  lastTranslationMs: number;
  samplesSinceCommit: number;
  unacknowledgedCommits: number;
  finalWaiters: (() => void)[];
  lastItemError: string | null;
  connectionError: string | null;
}

function pcmToBase64(pcm: Int16Array): string {
  const copy = pcm.byteOffset === 0 && pcm.buffer.byteLength === pcm.byteLength
    ? pcm
    : new Int16Array(pcm);
  const bytes = new Uint8Array(copy.buffer, copy.byteOffset, copy.byteLength);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return globalThis.btoa(binary);
}

function resamplePcm(pcm: Int16Array, sourceRate: number, targetRate = TARGET_RATE): Int16Array {
  if (sourceRate === targetRate) return pcm;
  const output = new Int16Array(Math.max(1, Math.round((pcm.length * targetRate) / sourceRate)));
  const ratio = sourceRate / targetRate;
  for (let index = 0; index < output.length; index += 1) {
    const sourceIndex = index * ratio;
    const lower = Math.floor(sourceIndex);
    const upper = Math.min(lower + 1, pcm.length - 1);
    const fraction = sourceIndex - lower;
    output[index] = Math.round((pcm[lower] ?? 0) * (1 - fraction) + (pcm[upper] ?? 0) * fraction);
  }
  return output;
}

function joinText(parts: Iterable<string>): string {
  return [...parts].map((part) => part.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function realtimeLanguage(code: LanguageCode): string {
  const whisperCode = getLanguage(code).whisperCode;
  if (whisperCode === 'zh') return 'zh-cn';
  return whisperCode;
}

function parseSocketData(data: unknown): RealtimeEvent | null {
  try {
    if (typeof data === 'string') return JSON.parse(data) as RealtimeEvent;
    if (data instanceof ArrayBuffer) {
      return JSON.parse(globalThis.TextDecoder ? new TextDecoder().decode(data) : String.fromCharCode(...new Uint8Array(data))) as RealtimeEvent;
    }
    return JSON.parse(String(data)) as RealtimeEvent;
  } catch {
    return null;
  }
}

function realtimeErrorMessage(event: RealtimeEvent, fallback: string): string {
  const message = event.error?.message?.trim() || event.error?.code?.trim() || event.transcript?.trim();
  return message || fallback;
}

function eventItemId(event: RealtimeEvent): string | undefined {
  return event.item_id || event.item?.id;
}

/** Persistent Realtime STT used exclusively by the DEV/DEMO Chat mode. */
export class ChatLiveSpeechPipeline {
  private session: Session | null = null;
  private queuedPcm: { chunk: Int16Array; sampleRate: number }[] = [];

  constructor(private readonly translationRepository: ITranslationRepository) {}

  async beginSession(pair: LanguagePair, progress: TranslateSpeechProgressHandlers): Promise<void> {
    const queued = this.queuedPcm.splice(0);
    this.clearSession();
    this.queuedPcm = queued;
    beginChatPerf();
    if (!isRealtimeChatEnabled()) {
      throw new AppError('RECORDING_FAILED', 'Realtime Chat is available only in DEV/DEMO.');
    }

    const Socket = WebSocket as unknown as RnWebSocketConstructor;
    const socket = new Socket(REALTIME_URL, null, {
      headers: {
        Authorization: `Bearer ${getEnvConfig().openAiApiKey}`,
      },
    });
    const session: Session = {
      pair,
      progress,
      socket,
      ready: false,
      bufferedAudio: [],
      pending: new Set(),
      itemOrder: [],
      deltas: new Map(),
      completed: new Map(),
      commitTimer: null,
      translationTimer: null,
      translationInFlight: false,
      translationPending: false,
      source: '',
      translation: '',
      translatedSource: '',
      translationSeq: 0,
      lastTranslationMs: 0,
      samplesSinceCommit: 0,
      unacknowledgedCommits: 0,
      finalWaiters: [],
      lastItemError: null,
      connectionError: null,
    };
    this.session = session;
    for (const queued of this.queuedPcm.splice(0)) {
      this.appendPcm(queued.chunk, queued.sampleRate);
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };
      const timeout = setTimeout(() => finish(new Error('Realtime transcription connection timed out.')), 8000);

      socket.onopen = () => {
        logger.info('Chat Realtime socket open');
        this.sendSessionUpdate(session);
        finish();
      };
      socket.onmessage = (message) => {
        const event = parseSocketData(message.data);
        if (!event?.type) return;
        logger.info('Chat Realtime event', { type: event.type, itemId: eventItemId(event) });
        if (event.type === 'session.created') {
          this.sendSessionUpdate(session);
          return;
        }
        if (event.type === 'session.updated') {
          session.ready = true;
          this.flushAudio(session);
          if (!session.commitTimer) {
            session.commitTimer = setInterval(() => this.commitIfReady(session), COMMIT_CHECK_MS);
          }
          return;
        }
        if (event.type === 'error') {
          const error = new Error(realtimeErrorMessage(event, 'Realtime transcription failed.'));
          session.connectionError = error.message;
          logger.error('Chat Realtime API error', { message: error.message, event });
          this.resolveWaiters(session);
          return;
        }
        this.handleEvent(session, event);
      };
      socket.onerror = () => {
        session.connectionError = 'Could not connect to realtime transcription.';
        logger.error('Chat Realtime socket error', session.connectionError);
        finish(new Error(session.connectionError));
        this.resolveWaiters(session);
      };
      socket.onclose = () => {
        if (!session.ready && !session.connectionError) {
          session.connectionError = 'Realtime transcription connection closed.';
          finish(new Error(session.connectionError));
        }
        this.resolveWaiters(session);
      };
    });
  }

  hasLiveSource(): boolean {
    return Boolean(this.session?.source.trim());
  }

  appendPcm(chunk: Int16Array, sampleRate: number): void {
    if (chunk.length === 0) return;
    const session = this.session;
    if (!session) {
      this.queuedPcm.push({ chunk: new Int16Array(chunk), sampleRate });
      return;
    }
    const resampled = resamplePcm(chunk, sampleRate);
    const audio = pcmToBase64(resampled);
    session.samplesSinceCommit += resampled.length;
    if (!session.ready || session.socket.readyState !== WebSocket.OPEN) session.bufferedAudio.push(audio);
    else this.sendAudio(session, audio);
  }

  clearSession(): void {
    const session = this.session;
    if (session) {
      if (session.commitTimer) clearInterval(session.commitTimer);
      if (session.translationTimer) clearTimeout(session.translationTimer);
      if (session.socket.readyState === WebSocket.OPEN || session.socket.readyState === WebSocket.CONNECTING) {
        session.socket.close();
      }
      this.resolveWaiters(session);
    }
    this.session = null;
    this.queuedPcm = [];
    resetChatPerf();
  }

  async finalize(recording: AudioRecording, progress?: TranslateSpeechProgressHandlers): Promise<TranslateSpeechOutput> {
    const session = this.session;
    if (!session) throw new AppError('RECORDING_FAILED', 'No active realtime Chat session.');
    if (session.commitTimer) {
      clearInterval(session.commitTimer);
      session.commitTimer = null;
    }
    if (recording.durationMs < MIN_RECORDING_MS) {
      this.clearSession();
      throw new AppError('EMPTY_TRANSCRIPTION', 'Hold the button longer while speaking.');
    }

    this.commitIfReady(session, true);
    await this.waitForTranscripts(session);

    const originalText = session.source.trim();
    if (!originalText) {
      const detail = session.lastItemError || session.connectionError || 'No speech detected. Please try again.';
      logger.error('Chat Realtime produced no transcript', { detail, pending: session.pending.size });
      throw new AppError('EMPTY_TRANSCRIPTION', detail);
    }

    const handlers = progress ?? session.progress;
    handlers.onTranscribed?.(originalText);
    let translatedText = session.translation.trim();
    if (!translatedText || session.translatedSource !== originalText) {
      translatedText = await this.translationRepository.translate(
        originalText,
        session.pair.sourceLanguage,
        session.pair.targetLanguage,
        DEFAULT_TRANSLATION_CONTEXT,
        { profile: 'fast' },
      );
    }
    handlers.onTranslated?.(originalText, translatedText);
    const result = createTranslationResult({
      direction: session.pair.direction,
      sourceLanguage: session.pair.sourceLanguage,
      targetLanguage: session.pair.targetLanguage,
      mode: 'speech',
      originalText,
      translatedText,
      recordingDurationMs: recording.durationMs,
    });
    markChatPerfAfterRelease('message_finalized');
    this.clearSession();
    return { result, speechAudioUri: '' };
  }

  private sendSessionUpdate(session: Session): void {
    if (session.socket.readyState !== WebSocket.OPEN) return;
    session.socket.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: TARGET_RATE },
            transcription: {
              model: REALTIME_MODEL,
              languages: [realtimeLanguage(session.pair.sourceLanguage)],
              delay: 'low',
            },
            turn_detection: null,
          },
        },
      },
    }));
  }

  private sendAudio(session: Session, audio: string): void {
    session.socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio }));
  }

  private flushAudio(session: Session): void {
    for (const audio of session.bufferedAudio) this.sendAudio(session, audio);
    session.bufferedAudio = [];
  }

  private commitIfReady(session: Session, force = false): void {
    if (!session.ready || session.socket.readyState !== WebSocket.OPEN) return;
    if (session.samplesSinceCommit < MIN_COMMIT_SAMPLES && !(force && session.samplesSinceCommit > 0)) return;
    session.socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    session.samplesSinceCommit = 0;
    session.unacknowledgedCommits += 1;
    markChatPerf('realtime_audio_commit');
  }

  private handleEvent(session: Session, event: RealtimeEvent): void {
    const id = eventItemId(event);
    if (event.type === 'input_audio_buffer.committed') {
      session.unacknowledgedCommits = Math.max(0, session.unacknowledgedCommits - 1);
      if (id) {
        session.pending.add(id);
        if (!session.itemOrder.includes(id)) session.itemOrder.push(id);
      }
      this.resolveWaiters(session);
      return;
    }
    if (event.type === 'conversation.item.input_audio_transcription.delta' && id && event.delta) {
      session.deltas.set(id, `${session.deltas.get(id) ?? ''}${event.delta}`);
      this.publish(session);
      return;
    }
    if (event.type === 'conversation.item.input_audio_transcription.completed' && id) {
      const text = event.transcript ?? session.deltas.get(id) ?? '';
      if (text.trim()) session.completed.set(id, text.trim());
      session.deltas.delete(id);
      session.pending.delete(id);
      this.publish(session);
      this.resolveWaiters(session);
      return;
    }
    if (event.type === 'conversation.item.input_audio_transcription.failed') {
      const detail = realtimeErrorMessage(event, 'Realtime transcription failed.');
      session.lastItemError = detail;
      logger.error('Chat Realtime transcription failed', { detail, itemId: id, event });
      if (id) {
        session.deltas.delete(id);
        session.pending.delete(id);
      }
      this.resolveWaiters(session);
    }
  }

  private publish(session: Session): void {
    const text = joinText(session.itemOrder.map((itemId) => session.completed.get(itemId) ?? session.deltas.get(itemId) ?? ''));
    if (!text || text === session.source) return;
    session.source = text;
    session.progress.onPartialTranscription?.(text);
    markChatFirstSourceText(text);
    this.scheduleTranslation();
  }

  private waitForTranscripts(session: Session): Promise<void> {
    if (this.isSettled(session)) return Promise.resolve();
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, FINAL_TIMEOUT_MS);
      session.finalWaiters.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private isSettled(session: Session): boolean {
    return session.unacknowledgedCommits === 0 && session.pending.size === 0;
  }

  private resolveWaiters(session: Session): void {
    if (!this.isSettled(session)) return;
    const waiters = session.finalWaiters.splice(0);
    for (const waiter of waiters) waiter();
  }

  private scheduleTranslation(): void {
    const session = this.session;
    if (!session || session.source.trim().length < CHAT_TRANSLATION_MIN_CHARS) return;
    if (session.translationInFlight) {
      session.translationPending = true;
      return;
    }
    if (session.translationTimer) clearTimeout(session.translationTimer);
    const delay = Math.max(0, CHAT_TRANSLATION_THROTTLE_MS - (Date.now() - session.lastTranslationMs));
    session.translationTimer = setTimeout(() => void this.translateLive(), delay);
  }

  private async translateLive(): Promise<void> {
    const session = this.session;
    if (!session || session.translationInFlight) return;
    const source = session.source.trim();
    if (source.length < CHAT_TRANSLATION_MIN_CHARS || source === session.translatedSource) return;
    session.translationInFlight = true;
    session.lastTranslationMs = Date.now();
    const seq = ++session.translationSeq;
    markChatFirstTranslationRequest();
    try {
      const translated = await this.translationRepository.translate(
        source,
        session.pair.sourceLanguage,
        session.pair.targetLanguage,
        DEFAULT_TRANSLATION_CONTEXT,
        { profile: 'fast' },
      );
      if (this.session !== session || seq !== session.translationSeq || source !== session.source) return;
      session.translation = translated;
      session.translatedSource = source;
      session.progress.onPartialTranslation?.(source, translated);
      markChatFirstTranslationVisible(translated);
    } catch (error) {
      logger.warn('Chat live translation failed', error);
    } finally {
      session.translationInFlight = false;
      if (session.translationPending || session.source !== session.translatedSource) {
        session.translationPending = false;
        this.scheduleTranslation();
      }
    }
  }
}
