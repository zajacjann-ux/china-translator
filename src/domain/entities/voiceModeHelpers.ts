import { Platform } from 'react-native';
import type { VoiceTranslationMode } from '@/domain/entities/VoiceTranslationMode';
import { isRealtimeChatEnabled } from '@/infrastructure/config/env';

/** Native streaming capture (PCM + interim STT) for Rozprávanie and Chat. */
export function usesLiveStreamingCapture(mode: VoiceTranslationMode): boolean {
  return Platform.OS !== 'web' && (mode === 'conversation' || (mode === 'chat' && isRealtimeChatEnabled()));
}

export function isConversationMode(mode: VoiceTranslationMode): boolean {
  return mode === 'conversation';
}

export function isChatMode(mode: VoiceTranslationMode): boolean {
  return mode === 'chat';
}
