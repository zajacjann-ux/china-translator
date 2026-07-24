import { useCallback, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import { isApiKeyConfigured, API_KEY_MISSING_MESSAGE } from '@/infrastructure/config/env';

export function useTextTranslation(sourceLanguage: string, targetLanguage: string) {
  const [inputText, setInputText] = useState('');
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [lastSpeechUri, setLastSpeechUri] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translate = useCallback(async () => {
    if (!isApiKeyConfigured()) {
      setError(API_KEY_MISSING_MESSAGE);
      return;
    }

    setIsTranslating(true);
    setError(null);
    setLastResult(null);
    setLastSpeechUri(null);

    try {
      const output = await container.translateTextUseCase.execute(
        inputText,
        sourceLanguage,
        targetLanguage,
      );

      await container.conversationHistoryRepository.saveConversation(output.result);

      setLastResult(output.result);
      setLastSpeechUri(output.speechAudioUri);
    } catch (err) {
      logger.error('Text translation failed', err);
      setError(getErrorMessage(err));
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLanguage, targetLanguage]);

  const replaySpeech = useCallback(async () => {
    const uri = lastSpeechUri ?? lastResult?.speechAudioUri;
    if (!uri) return;

    setIsReplaying(true);
    setError(null);

    try {
      await container.translateTextUseCase.replaySpeech(uri);
    } catch (err) {
      logger.error('Replay failed', err);
      setError(getErrorMessage(err));
    } finally {
      setIsReplaying(false);
    }
  }, [lastResult?.speechAudioUri, lastSpeechUri]);

  const copyTranslation = useCallback(async () => {
    const text = lastResult?.translatedText;
    if (!text) return;

    await Clipboard.setStringAsync(text);

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopyFeedback(true);
    copyTimeoutRef.current = setTimeout(() => setCopyFeedback(false), 2000);
  }, [lastResult?.translatedText]);

  const clearError = useCallback(() => setError(null), []);

  return {
    inputText,
    setInputText,
    lastResult,
    isTranslating,
    isReplaying,
    copyFeedback,
    error,
    translate,
    replaySpeech,
    copyTranslation,
    clearError,
    apiKeyMissing: !isApiKeyConfigured(),
  };
}
