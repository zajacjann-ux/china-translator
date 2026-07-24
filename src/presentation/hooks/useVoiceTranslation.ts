import { useCallback, useRef, useState } from 'react';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import type { RecordingStatus } from '@/domain/entities/RecordingSession';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';
import { getLanguagePairFromDirection } from '@/domain/entities/TranslationDirection';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

interface VoiceTranslationState {
  status: RecordingStatus;
  activeRouteId: string | null;
  lastResult: TranslationResult | null;
  error: string | null;
}

const initialState: VoiceTranslationState = {
  status: 'idle',
  activeRouteId: null,
  lastResult: null,
  error: null,
};

export function useVoiceTranslation() {
  const [state, setState] = useState<VoiceTranslationState>(initialState);
  const activeRouteRef = useRef<TranslationRoute | null>(null);
  const isRecordingRef = useRef(false);

  const onPressIn = useCallback(async (route: TranslationRoute) => {
    if (isRecordingRef.current) return;

    activeRouteRef.current = route;
    isRecordingRef.current = true;

    setState((prev) => ({
      ...prev,
      status: 'recording',
      activeRouteId: route.id,
      error: null,
      lastResult: null,
    }));

    try {
      await container.translateSpeechUseCase.startRecording();
    } catch (error) {
      logger.error('Failed to start recording', error);
      activeRouteRef.current = null;
      isRecordingRef.current = false;
      setState((prev) => ({
        ...prev,
        status: 'error',
        activeRouteId: null,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const onPressOut = useCallback(async () => {
    const route = activeRouteRef.current;
    if (!route || !isRecordingRef.current) return;

    isRecordingRef.current = false;
    activeRouteRef.current = null;
    const pair = getLanguagePairFromDirection(route.direction);

    setState((prev) => ({
      ...prev,
      status: 'processing',
      activeRouteId: route.id,
    }));

    try {
      const output = await container.translateSpeechUseCase.stopAndTranslate(pair);

      setState({
        status: 'idle',
        activeRouteId: null,
        lastResult: output.result,
        error: null,
      });
    } catch (error) {
      logger.error('Voice translation failed', error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        activeRouteId: null,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, status: 'idle' }));
  }, []);

  const isRecording = state.status === 'recording';
  const isProcessing = state.status === 'processing';

  return {
    error: state.error,
    isRecording,
    isProcessing,
    activeRouteId: state.activeRouteId,
    onPressIn,
    onPressOut,
    clearError,
  };
}
