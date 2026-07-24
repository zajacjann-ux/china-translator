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
  const recordingStartedRef = useRef(false);
  const startRecordingPromiseRef = useRef<Promise<void> | null>(null);

  const onPressIn = useCallback(async (route: TranslationRoute) => {
    if (recordingStartedRef.current || startRecordingPromiseRef.current) return;

    activeRouteRef.current = route;
    recordingStartedRef.current = false;

    setState((prev) => ({
      ...prev,
      status: 'recording',
      activeRouteId: route.id,
      error: null,
      lastResult: null,
    }));

    const startRecording = async () => {
      await container.translateSpeechUseCase.startRecording();
      recordingStartedRef.current = true;
    };

    startRecordingPromiseRef.current = startRecording();

    try {
      await startRecordingPromiseRef.current;
    } catch (error) {
      logger.error('Failed to start recording', error);
      activeRouteRef.current = null;
      recordingStartedRef.current = false;
      setState((prev) => ({
        ...prev,
        status: 'error',
        activeRouteId: null,
        error: getErrorMessage(error),
      }));
    } finally {
      startRecordingPromiseRef.current = null;
    }
  }, []);

  const onPressOut = useCallback(async () => {
    const route = activeRouteRef.current;
    if (!route) return;

    if (startRecordingPromiseRef.current) {
      try {
        await startRecordingPromiseRef.current;
      } catch {
        activeRouteRef.current = null;
        recordingStartedRef.current = false;
        return;
      }
    }

    if (!recordingStartedRef.current) {
      activeRouteRef.current = null;
      setState((prev) =>
        prev.status === 'recording'
          ? { ...prev, status: 'idle', activeRouteId: null }
          : prev,
      );
      return;
    }

    recordingStartedRef.current = false;
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
