import { generateId } from '@/shared/utils/id';

export type ConversationSpeaker = 'me' | 'partner';

export interface ConversationMessage {
  id: string;
  speaker: ConversationSpeaker;
  originalText: string;
  translatedText: string;
  timestamp: Date;
}

export function createConversationMessage(
  params: Omit<ConversationMessage, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: Date;
  },
): ConversationMessage {
  return {
    id: params.id ?? generateId(),
    timestamp: params.timestamp ?? new Date(),
    speaker: params.speaker,
    originalText: params.originalText,
    translatedText: params.translatedText,
  };
}
