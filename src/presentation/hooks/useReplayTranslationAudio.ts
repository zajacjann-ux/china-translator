import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';
import { resolveMessageLanguages } from '@/domain/entities/ConversationMessage';
import type { LanguageCode } from '@/domain/entities/Language';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

export function useReplayTranslationAudio(
  userLanguage: LanguageCode,
  partnerLanguage: LanguageCode,
) {
  const [replayingMessageId, setReplayingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const replayMessage = useCallback(
    async (message: ConversationMessage) => {
      if (!message.translatedText.trim() || replayingMessageId) return;

      Haptics.selectionAsync();
      setError(null);
      setReplayingMessageId(message.id);

      const { targetLanguage } = resolveMessageLanguages(
        message,
        userLanguage,
        partnerLanguage,
      );

      try {
        await container.replayTranslationAudioUseCase.execute({
          text: message.translatedText,
          targetLanguage,
          audioUri: message.audioUri,
        });
      } catch (err) {
        logger.error('Replay translation audio failed', err);
        setError(getErrorMessage(err));
      } finally {
        setReplayingMessageId(null);
      }
    },
    [partnerLanguage, replayingMessageId, userLanguage],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    replayMessage,
    replayingMessageId,
    replayError: error,
    clearReplayError: clearError,
  };
}
