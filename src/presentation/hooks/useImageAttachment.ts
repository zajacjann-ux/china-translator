import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useConversation } from '@/presentation/context/ConversationContext';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';

export function useImageAttachment() {
  const { userLanguage, partnerLanguage } = useLanguagePair();
  const { addCameraMessage } = useConversation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndTranslate = useCallback(async () => {
    if (isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setIsProcessing(true);

    try {
      const output = await container.translateCameraUseCase.execute(
        result.assets[0].uri,
        partnerLanguage,
        userLanguage,
        { speak: false },
      );

      addCameraMessage(output.result.originalText, output.result.translatedText);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }, [addCameraMessage, isProcessing, partnerLanguage, userLanguage]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    pickAndTranslate,
    isProcessing,
    error,
    clearError,
  };
}
