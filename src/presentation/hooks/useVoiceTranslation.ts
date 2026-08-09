import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { RecordingStatus } from '@/domain/entities/RecordingSession';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';
import type { ConversationSpeaker } from '@/domain/entities/ConversationMessage';
import { createConversationMessage } from '@/domain/entities/ConversationMessage';
import type { VoiceTranslationMode } from '@/domain/entities/VoiceTranslationMode';
import { getLanguagePairFromDirection } from '@/domain/entities/TranslationDirection';
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

  activeVoiceModeRef.current = voiceMode;

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
      }));
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
        activeRouteRef.current = null;
        recordingStartedRef.current = false;
        if (liveMessageId) {
          removeMessage(liveMessageId);
          pendingMessageIdRef.current = null;
        }
        resetFastPerf();
        setState((prev) => ({
          ...prev,
          status: 'error',
          activeRouteId: null,
          error: getErrorMessage(error),
        }));
      } finally {
        startRecordingPromiseRef.current = null;
      }
    },
    [createLiveMessage, removeMessage, updateMessage],
  );

  const onPressOut = useCallback(async () => {
    const route = activeRouteRef.current;
    if (!route) return;

    const mode = resolveEffectiveVoiceMode(activeVoiceModeRef.current);
    const isFastMode = mode === 'fast';

    if (startRecordingPromiseRef.current) {
      try {
        await startRecordingPromiseRef.current;
      } catch {
        activeRouteRef.current = null;
        recordingStartedRef.current = false;
        if (isFastMode) {
          resetFastPerf();
        }
        return;
      }
    }

    if (!recordingStartedRef.current) {
      activeRouteRef.current = null;
      if (isFastMode) {
        resetFastPerf();
      }
      setState((prev) =>
        prev.status === 'recording' ? { ...prev, status: 'idle', activeRouteId: null } : prev,
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

      const output = await container.translateSpeechUseCase.stopAndTranslate(
        pair,
        {
          onTranscribed: (originalText) => {
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

      if (failedMessageId) {
        removeMessage(failedMessageId);
      }

      setState((prev) => ({
        ...prev,
        status: 'error',
        activeRouteId: null,
        error: getErrorMessage(error),
      }));
    } finally {
      if (isFastMode) {
        resetFastPerf();
      }
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
