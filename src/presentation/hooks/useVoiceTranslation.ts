import { useCallback, useRef, useState } from 'react';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import type { RecordingStatus } from '@/domain/entities/RecordingSession';
import { buildLanguagePair } from '@/domain/entities/TranslationDirection';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

interface VoiceTranslationState {
  status: RecordingStatus;
  lastResult: TranslationResult | null;
  error: string | null;
}

const initialState: VoiceTranslationState = {
  status: 'idle',
  lastResult: null,
  error: null,
};

export function useVoiceTranslation(sourceLanguage: string, targetLanguage: string) {
  const [state, setState] = useState<VoiceTranslationState>(initialState);
  const isRecordingRef = useRef(false);

  const onPressIn = useCallback(async () => {
    if (isRecordingRef.current) return;

    isRecordingRef.current = true;
    setState((prev) => ({
      ...prev,
      status: 'recording',
      error: null,
      lastResult: null,
    }));

    try {
      await container.translateSpeechUseCase.startRecording();
    } catch (error) {
      logger.error('Failed to start recording', error);
      isRecordingRef.current = false;
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const onPressOut = useCallback(async () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    const pair = buildLanguagePair(sourceLanguage, targetLanguage);

    setState((prev) => ({ ...prev, status: 'processing' }));

    try {
      const output = await container.translateSpeechUseCase.stopAndTranslate(pair);

      setState({
        status: 'idle',
        lastResult: output.result,
        error: null,
      });
    } catch (error) {
      logger.error('Voice translation failed', error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: getErrorMessage(error),
      }));
    }
  }, [sourceLanguage, targetLanguage]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, status: 'idle' }));
  }, []);

  const isRecording = state.status === 'recording';
  const isProcessing = state.status === 'processing';

  return {
    error: state.error,
    isRecording,
    isProcessing,
    onPressIn,
    onPressOut,
    clearError,
  };
}
