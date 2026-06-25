import { useCallback, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import type { LanguagePair } from '@/domain/entities/TranslationDirection';
import { getLanguagePairFromDirection } from '@/domain/entities/TranslationDirection';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import type { RecordingStatus } from '@/domain/entities/RecordingSession';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export interface TranslationFlowState {
  status: RecordingStatus;
  activePair: LanguagePair | null;
  lastResult: TranslationResult | null;
  lastSpeechUri: string | null;
  error: string | null;
  isReplaying: boolean;
  copyFeedback: boolean;
}

const initialState: TranslationFlowState = {
  status: 'idle',
  activePair: null,
  lastResult: null,
  lastSpeechUri: null,
  error: null,
  isReplaying: false,
  copyFeedback: false,
};

export function useTranslationFlow() {
  const [state, setState] = useState<TranslationFlowState>(initialState);
  const activePairRef = useRef<LanguagePair | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPressIn = useCallback(async (direction: string) => {
    const pair = getLanguagePairFromDirection(direction);
    activePairRef.current = pair;

    setState((prev) => ({
      ...prev,
      status: 'recording',
      activePair: pair,
      error: null,
      copyFeedback: false,
      lastResult: null,
      lastSpeechUri: null,
    }));

    try {
      await container.translateSpeechUseCase.startRecording();
    } catch (error) {
      logger.error('Failed to start recording', error);
      activePairRef.current = null;
      setState((prev) => ({
        ...prev,
        status: 'error',
        activePair: null,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const onPressOut = useCallback(async () => {
    const pair = activePairRef.current;
    if (!pair) return;

    activePairRef.current = null;
    setState((prev) => ({ ...prev, status: 'processing', activePair: pair }));

    try {
      const output = await container.translateSpeechUseCase.stopAndTranslate(pair);
      await container.conversationHistoryRepository.saveConversation(output.result);

      setState({
        status: 'idle',
        activePair: null,
        lastResult: output.result,
        lastSpeechUri: output.speechAudioUri,
        error: null,
        isReplaying: false,
        copyFeedback: false,
      });
    } catch (error) {
      logger.error('Translation flow failed', error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        activePair: null,
        error: getErrorMessage(error),
        isReplaying: false,
      }));
    }
  }, []);

  const replaySpeech = useCallback(async () => {
    const uri = state.lastSpeechUri ?? state.lastResult?.speechAudioUri;
    if (!uri) return;

    setState((prev) => ({ ...prev, isReplaying: true, error: null }));

    try {
      await container.translateSpeechUseCase.replaySpeech(uri);
    } catch (error) {
      logger.error('Replay failed', error);
      setState((prev) => ({ ...prev, error: getErrorMessage(error) }));
    } finally {
      setState((prev) => ({ ...prev, isReplaying: false }));
    }
  }, [state.lastResult?.speechAudioUri, state.lastSpeechUri]);

  const copyTranslation = useCallback(async () => {
    const text = state.lastResult?.translatedText;
    if (!text) return;

    await Clipboard.setStringAsync(text);

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setState((prev) => ({ ...prev, copyFeedback: true }));
    copyTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, copyFeedback: false }));
    }, 2000);
  }, [state.lastResult?.translatedText]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, status: 'idle' }));
  }, []);

  const clearResult = useCallback(() => {
    setState((prev) => ({ ...prev, lastResult: null, lastSpeechUri: null }));
  }, []);

  return {
    ...state,
    onPressIn,
    onPressOut,
    replaySpeech,
    copyTranslation,
    clearError,
    clearResult,
  };
}
