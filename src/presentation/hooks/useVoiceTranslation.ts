import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { RecordingStatus } from '@/domain/entities/RecordingSession';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';
import type { ConversationSpeaker } from '@/domain/entities/ConversationMessage';
import { createConversationMessage } from '@/domain/entities/ConversationMessage';
import type { VoiceTranslationMode } from '@/domain/entities/VoiceTranslationMode';
import { getLanguagePairFromDirection, type LanguagePair } from '@/domain/entities/TranslationDirection';
import { useConversation } from '@/presentation/context/ConversationContext';
import { useVoiceTranslationMode } from '@/presentation/context/VoiceTranslationModeContext';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import {
  beginFastPerf,
  markFastLiveSourceText,
  markFastLiveTranslatedText,
  markFastPerfAfterRelease,
  markFastPerfRelease,
  resetFastPerf,
} from '@/infrastructure/logging/fastPerf';
import { generateId } from '@/shared/utils/id';
import { ERROR_AUTO_DISMISS_MS, useAutoDismissError } from '@/presentation/hooks/useAutoDismissError';

interface VoiceTranslationState {
  status: RecordingStatus;
  activeRouteId: string | null;
  error: string | null;
  canRetry: boolean;
}

const initialState: VoiceTranslationState = {
  status: 'idle',
  activeRouteId: null,
  error: null,
  canRetry: false,
};

interface VoiceRetryContext {
  route: TranslationRoute;
  pair: LanguagePair;
  mode: VoiceTranslationMode;
  speaker: ConversationSpeaker;
  messageId: string;
  originalText: string;
}

function toConversationSpeaker(route: TranslationRoute): ConversationSpeaker {
  return route.speaker === 'user' ? 'me' : 'partner';
}

function resolveEffectiveVoiceMode(mode: VoiceTranslationMode): VoiceTranslationMode {
  return mode === 'fast' && Platform.OS !== 'web' ? 'fast' : 'accurate';
}

export function useVoiceTranslation() {
  const { mode: voiceMode } = useVoiceTranslationMode();
  const { messages, appendMessage, updateMessage, removeMessage, startNewConversation } =
    useConversation();
  const [state, setState] = useState<VoiceTranslationState>(initialState);
  const activeRouteRef = useRef<TranslationRoute | null>(null);
  const recordingStartedRef = useRef(false);
  const startRecordingPromiseRef = useRef<Promise<void> | null>(null);
  const pendingMessageIdRef = useRef<string | null>(null);
  const activeVoiceModeRef = useRef<VoiceTranslationMode>(voiceMode);
  const retryContextRef = useRef<VoiceRetryContext | null>(null);
  const lastOriginalTextRef = useRef('');

  activeVoiceModeRef.current = voiceMode;

  const resetRecordingState = useCallback(async () => {
    activeRouteRef.current = null;
    recordingStartedRef.current = false;
    startRecordingPromiseRef.current = null;
    lastOriginalTextRef.current = '';
    resetFastPerf();
    try {
      await container.translateSpeechUseCase.cancelRecording();
    } catch {
      // Ignore stale recording cleanup failures.
    }
  }, []);

  const clearError = useCallback(() => {
    retryContextRef.current = null;
    setState((prev) => ({
      ...prev,
      error: null,
      canRetry: false,
      status: 'idle',
      activeRouteId: null,
    }));
  }, []);

  const showVoiceError = useCallback(
    (message: string, retryContext: VoiceRetryContext | null = null) => {
      retryContextRef.current = retryContext;
      setState((prev) => ({
        ...prev,
        status: 'idle',
        activeRouteId: null,
        error: message,
        canRetry: Boolean(retryContext?.originalText.trim()),
      }));
    },
    [],
  );

  useAutoDismissError(state.error, clearError, ERROR_AUTO_DISMISS_MS);

  useEffect(() => {
    void container.audioRepository.requestPermission();
  }, []);

  const createLiveMessage = useCallback(
    (speaker: ConversationSpeaker, pair: ReturnType<typeof getLanguagePairFromDirection>) => {
      const messageId = generateId();
      pendingMessageIdRef.current = messageId;
      appendMessage(
        createConversationMessage({
          id: messageId,
          speaker,
          originalText: '',
          translatedText: '',
          sourceLanguage: pair.sourceLanguage,
          targetLanguage: pair.targetLanguage,
        }),
      );
      return messageId;
    },
    [appendMessage],
  );

  const onPressIn = useCallback(
    async (route: TranslationRoute) => {
      if (recordingStartedRef.current || startRecordingPromiseRef.current) return;

      activeRouteRef.current = route;
      recordingStartedRef.current = false;
      pendingMessageIdRef.current = null;

      const pair = getLanguagePairFromDirection(route.direction);
      const speaker = toConversationSpeaker(route);
      const mode = resolveEffectiveVoiceMode(activeVoiceModeRef.current);

      setState((prev) => ({
        ...prev,
        status: 'recording',
        activeRouteId: route.id,
        error: null,
        canRetry: false,
      }));
      retryContextRef.current = null;
      lastOriginalTextRef.current = '';
      logger.info('Recording started', { routeId: route.id, mode });

      let liveMessageId: string | null = null;
      if (mode === 'fast') {
        beginFastPerf();
        liveMessageId = createLiveMessage(speaker, pair);
        logger.info('FAST MODE START', { messageId: liveMessageId, routeId: route.id });
        console.log('[FAST DEBUG] FAST MODE START (UI)', { messageId: liveMessageId, mode });
      }

      const startRecording = async () => {
        await container.translateSpeechUseCase.startRecording({
          mode,
          pair: mode === 'fast' ? pair : undefined,
          progress:
            mode === 'fast'
              ? {
                  onPartialTranscription: (partialText) => {
                    const messageId = pendingMessageIdRef.current;
                    console.log('[FAST DEBUG] onPartialTranscription callback', {
                      messageId,
                      partialText,
                    });
                    if (!messageId) {
                      console.log('[FAST DEBUG] onPartialTranscription skipped — no messageId');
                      return;
                    }
                    logger.info('PARTIAL TRANSCRIPT:', partialText);
                    markFastLiveSourceText(partialText);
                    console.log('[FAST DEBUG] updateMessage call', {
                      messageId,
                      field: 'originalText',
                      partialText,
                    });
                    updateMessage(messageId, { originalText: partialText });
                  },
                  onPartialTranslation: (originalText, partialTranslated) => {
                    const messageId = pendingMessageIdRef.current;
                    if (!messageId) return;
                    markFastLiveTranslatedText(partialTranslated);
                    updateMessage(messageId, {
                      originalText,
                      translatedText: partialTranslated,
                    });
                  },
                }
              : undefined,
        });
        recordingStartedRef.current = true;
      };

      startRecordingPromiseRef.current = startRecording();

      try {
        await startRecordingPromiseRef.current;
      } catch (error) {
        logger.error('Failed to start recording', error);
        if (liveMessageId) {
          removeMessage(liveMessageId);
          pendingMessageIdRef.current = null;
        }
        await resetRecordingState();
        showVoiceError(getErrorMessage(error));
      } finally {
        startRecordingPromiseRef.current = null;
      }
    },
    [createLiveMessage, removeMessage, resetRecordingState, showVoiceError, updateMessage],
  );

  const onPressOut = useCallback(async () => {
    const route = activeRouteRef.current;
    if (!route) return;

    const mode = resolveEffectiveVoiceMode(activeVoiceModeRef.current);
    const isFastMode = mode === 'fast';

    if (startRecordingPromiseRef.current) {
      try {
        await startRecordingPromiseRef.current;
      } catch (error) {
        await resetRecordingState();
        showVoiceError(getErrorMessage(error));
        return;
      }
    }

    if (!recordingStartedRef.current) {
      await resetRecordingState();
      setState((prev) =>
        prev.status === 'recording'
          ? { ...prev, status: 'idle', activeRouteId: null, error: null, canRetry: false }
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
    logger.info('Recording stopped', { routeId: route.id, mode });
    if (isFastMode) {
      markFastPerfRelease();
    }

    try {
      let messageIdForAudio: string | null = pendingMessageIdRef.current;
      lastOriginalTextRef.current = '';

      const output = await container.translateSpeechUseCase.stopAndTranslate(
        pair,
        {
          onTranscribed: (originalText) => {
            lastOriginalTextRef.current = originalText;
            if (isFastMode) {
              const messageId = pendingMessageIdRef.current;
              if (!messageId) return;
              logger.info('FINAL TRANSCRIPT:', originalText);
              updateMessage(messageId, { originalText });
              messageIdForAudio = messageId;
              return;
            }

            if (speaker !== 'me') return;

            const messageId = generateId();
            pendingMessageIdRef.current = messageId;
            messageIdForAudio = messageId;
            appendMessage(
              createConversationMessage({
                id: messageId,
                speaker,
                originalText,
                translatedText: '',
                sourceLanguage: pair.sourceLanguage,
                targetLanguage: pair.targetLanguage,
              }),
            );
            logger.info('Message created', { messageId, speaker, mode });
          },
          onTranslated: (originalText, translatedText) => {
            const languagePatch = {
              originalText,
              translatedText,
              sourceLanguage: pair.sourceLanguage,
              targetLanguage: pair.targetLanguage,
            };

            if (isFastMode) {
              const messageId = pendingMessageIdRef.current;
              if (!messageId) return;
              logger.info('TRANSLATION COMPLETE', { translatedText });
              markFastPerfAfterRelease('translation_done', { chars: translatedText.length });
              updateMessage(messageId, languagePatch);
              messageIdForAudio = messageId;
              pendingMessageIdRef.current = null;
              return;
            }

            if (speaker === 'me') {
              const messageId = pendingMessageIdRef.current;
              if (!messageId) return;

              updateMessage(messageId, languagePatch);
              messageIdForAudio = messageId;
              pendingMessageIdRef.current = null;
              return;
            }

            const messageId = generateId();
            messageIdForAudio = messageId;
            appendMessage(
              createConversationMessage({
                id: messageId,
                speaker,
                ...languagePatch,
              }),
            );
            logger.info('Message created', { messageId, speaker, mode });
          },
        },
        { mode },
      );

      if (output.speechAudioUri && messageIdForAudio) {
        updateMessage(messageIdForAudio, { audioUri: output.speechAudioUri });
      }

      pendingMessageIdRef.current = null;
      retryContextRef.current = null;
      lastOriginalTextRef.current = '';

      setState((prev) => ({
        ...prev,
        status: 'idle',
        activeRouteId: null,
        error: null,
        canRetry: false,
      }));
    } catch (error) {
      logger.error('Voice translation failed', error);
      await resetRecordingState();

      const failedMessageId = pendingMessageIdRef.current;
      let originalText = lastOriginalTextRef.current.trim();
      if (!originalText && failedMessageId) {
        const failedMessage = messages.find((message) => message.id === failedMessageId);
        originalText = failedMessage?.originalText.trim() ?? '';
      }
      let retryContext: VoiceRetryContext | null = null;

      if (failedMessageId && originalText) {
        retryContext = {
          route,
          pair,
          mode,
          speaker,
          messageId: failedMessageId,
          originalText,
        };
        pendingMessageIdRef.current = failedMessageId;
      } else if (failedMessageId) {
        removeMessage(failedMessageId);
        pendingMessageIdRef.current = null;
      }

      showVoiceError(getErrorMessage(error), retryContext);
    } finally {
      if (isFastMode) {
        resetFastPerf();
      }
    }
  }, [appendMessage, messages, removeMessage, resetRecordingState, showVoiceError, updateMessage]);

  const retryVoiceTranslation = useCallback(async () => {
    const retryContext = retryContextRef.current;
    if (!retryContext?.originalText.trim()) {
      clearError();
      return;
    }

    const { route, pair, mode, speaker, messageId, originalText } = retryContext;
    const isFastMode = mode === 'fast';

    setState((prev) => ({
      ...prev,
      status: 'processing',
      activeRouteId: route.id,
      error: null,
      canRetry: false,
    }));

    try {
      let messageIdForAudio: string | null = messageId;

      const output = await container.translateSpeechUseCase.retrySpeechTranslation(
        pair,
        originalText,
        {
          onTranscribed: (text) => {
            if (isFastMode) {
              updateMessage(messageId, { originalText: text });
              messageIdForAudio = messageId;
              return;
            }

            if (speaker !== 'me') return;
            updateMessage(messageId, { originalText: text });
            messageIdForAudio = messageId;
          },
          onTranslated: (sourceText, translatedText) => {
            const languagePatch = {
              originalText: sourceText,
              translatedText,
              sourceLanguage: pair.sourceLanguage,
              targetLanguage: pair.targetLanguage,
            };

            updateMessage(messageId, languagePatch);
            messageIdForAudio = messageId;
            pendingMessageIdRef.current = null;
          },
        },
        { mode },
      );

      if (output.speechAudioUri && messageIdForAudio) {
        updateMessage(messageIdForAudio, { audioUri: output.speechAudioUri });
      }

      retryContextRef.current = null;
      pendingMessageIdRef.current = null;

      setState((prev) => ({
        ...prev,
        status: 'idle',
        activeRouteId: null,
        error: null,
        canRetry: false,
      }));
    } catch (error) {
      logger.error('Voice translation retry failed', error);
      pendingMessageIdRef.current = messageId;
      showVoiceError(getErrorMessage(error), retryContext);
    }
  }, [clearError, showVoiceError, updateMessage]);

  const clearConversation = useCallback(() => {
    pendingMessageIdRef.current = null;
    retryContextRef.current = null;
    lastOriginalTextRef.current = '';
    startNewConversation();
    setState((prev) => ({
      ...prev,
      error: null,
      canRetry: false,
      status: 'idle',
      activeRouteId: null,
    }));
  }, [startNewConversation]);

  const isRecording = state.status === 'recording';
  const isProcessing = state.status === 'processing';

  return {
    messages,
    error: state.error,
    canRetry: state.canRetry,
    isRecording,
    isProcessing,
    activeRouteId: state.activeRouteId,
    onPressIn,
    onPressOut,
    clearError,
    retryVoiceTranslation,
    clearConversation,
  };
}
