import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordingStatus } from '@/domain/entities/RecordingSession';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';
import type { ConversationSpeaker } from '@/domain/entities/ConversationMessage';
import { createConversationMessage } from '@/domain/entities/ConversationMessage';
import { getLanguagePairFromDirection } from '@/domain/entities/TranslationDirection';
import { useConversation } from '@/presentation/context/ConversationContext';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import { generateId } from '@/shared/utils/id';

interface VoiceTranslationState {
  status: RecordingStatus;
  activeRouteId: string | null;
  error: string | null;
}

const initialState: VoiceTranslationState = {
  status: 'idle',
  activeRouteId: null,
  error: null,
};

function toConversationSpeaker(route: TranslationRoute): ConversationSpeaker {
  return route.speaker === 'user' ? 'me' : 'partner';
}

export function useVoiceTranslation() {
  const { messages, appendMessage, updateMessage, removeMessage, startNewConversation } =
    useConversation();
  const [state, setState] = useState<VoiceTranslationState>(initialState);
  const activeRouteRef = useRef<TranslationRoute | null>(null);
  const recordingStartedRef = useRef(false);
  const startRecordingPromiseRef = useRef<Promise<void> | null>(null);
  const pendingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    void container.audioRepository.requestPermission();
  }, []);

  const onPressIn = useCallback(async (route: TranslationRoute) => {
    if (recordingStartedRef.current || startRecordingPromiseRef.current) return;

    activeRouteRef.current = route;
    recordingStartedRef.current = false;
    pendingMessageIdRef.current = null;

    setState((prev) => ({
      ...prev,
      status: 'recording',
      activeRouteId: route.id,
      error: null,
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
    const speaker = toConversationSpeaker(route);

    setState((prev) => ({
      ...prev,
      status: 'processing',
      activeRouteId: route.id,
    }));

    try {
      await container.translateSpeechUseCase.stopAndTranslate(pair, {
        onTranscribed: (originalText) => {
          if (speaker !== 'me') return;

          const messageId = generateId();
          pendingMessageIdRef.current = messageId;
          appendMessage(
            createConversationMessage({
              id: messageId,
              speaker,
              originalText,
              translatedText: '',
            }),
          );
        },
        onTranslated: (originalText, translatedText) => {
          if (speaker === 'me') {
            const messageId = pendingMessageIdRef.current;
            if (!messageId) return;

            updateMessage(messageId, { originalText, translatedText });
            pendingMessageIdRef.current = null;
            return;
          }

          appendMessage(
            createConversationMessage({
              speaker,
              originalText,
              translatedText,
            }),
          );
        },
      });

      setState((prev) => ({
        ...prev,
        status: 'idle',
        activeRouteId: null,
        error: null,
      }));
    } catch (error) {
      logger.error('Voice translation failed', error);
      const failedMessageId = pendingMessageIdRef.current;
      pendingMessageIdRef.current = null;

      if (failedMessageId && speaker === 'me') {
        removeMessage(failedMessageId);
      }

      setState((prev) => ({
        ...prev,
        status: 'error',
        activeRouteId: null,
        error: getErrorMessage(error),
      }));
    }
  }, [appendMessage, removeMessage, updateMessage]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, status: 'idle' }));
  }, []);

  const clearConversation = useCallback(() => {
    pendingMessageIdRef.current = null;
    startNewConversation();
    setState((prev) => ({
      ...prev,
      error: null,
      status: 'idle',
      activeRouteId: null,
    }));
  }, [startNewConversation]);

  const isRecording = state.status === 'recording';
  const isProcessing = state.status === 'processing';

  return {
    messages,
    error: state.error,
    isRecording,
    isProcessing,
    activeRouteId: state.activeRouteId,
    onPressIn,
    onPressOut,
    clearError,
    clearConversation,
  };
}
