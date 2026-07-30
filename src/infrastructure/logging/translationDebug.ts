import { logger } from '@/infrastructure/logging/logger';

const PREFIX = '[Translation QA]';

/** Dev-only logs for translation pipeline quality checks. No UI impact. */
export const translationDebug = {
  whisperResult(data: {
    originalText: string;
    detectedSourceLanguage: string;
    model: string;
    durationMs?: number;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Whisper STT`, data);
  },

  translationRequest(data: {
    originalText: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    context?: string;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Translation request`, data);
  },

  translationResult(data: {
    originalText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Translation result`, data);
  },

  ttsSynthesis(data: {
    speed: number;
    durationMs: number;
    language: string;
    model: string;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} TTS speed: ${data.speed}`);
    logger.debug(`${PREFIX} TTS duration: ${data.durationMs} ms`, {
      language: data.language,
      model: data.model,
    });
  },

  audioPlaybackStarted(data?: { uri?: string }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Audio playback started`, data ?? {});
  },
};
