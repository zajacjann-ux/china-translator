import { logger } from '@/infrastructure/logging/logger';

const PREFIX = '[Translation QA]';

/** Dev-only logs for translation pipeline quality checks. No UI impact. */
export const translationDebug = {
  whisperResult(data: {
    recognizedSpeech: string;
    detectedSourceLanguage: string;
    model: string;
    durationMs?: number;
    latencyMs: number;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Recognized speech`, {
      text: data.recognizedSpeech,
      language: data.detectedSourceLanguage,
      model: data.model,
      recordingDurationMs: data.durationMs,
      latencyMs: data.latencyMs,
    });
  },

  translationRequest(data: {
    originalText: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    context?: string;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Translation request`, {
      recognizedSpeech: data.originalText,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      model: data.model,
      context: data.context,
    });
  },

  translationResult(data: {
    recognizedSpeech: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    latencyMs: number;
  }): void {
    if (!__DEV__) return;
    logger.debug(`${PREFIX} Translation result`, {
      recognizedSpeech: data.recognizedSpeech,
      translatedText: data.translatedText,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      model: data.model,
      latencyMs: data.latencyMs,
    });
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
