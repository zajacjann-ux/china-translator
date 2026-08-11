import { Platform } from 'react-native';
import type { VoiceTranslationMode } from '@/domain/entities/VoiceTranslationMode';

/** Native streaming capture (PCM + interim STT) for Rozprávanie and Chat. */
export function usesLiveStreamingCapture(mode: VoiceTranslationMode): boolean {
  return (mode === 'conversation' || mode === 'chat') && Platform.OS !== 'web';
}

export function isConversationMode(mode: VoiceTranslationMode): boolean {
  return mode === 'conversation';
}

export function isChatMode(mode: VoiceTranslationMode): boolean {
  return mode === 'chat';
}
