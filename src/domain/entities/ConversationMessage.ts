import type { LanguageCode } from './Language';
import { generateId } from '@/shared/utils/id';

export type ConversationSpeaker = 'me' | 'partner';

export type ConversationMessageSource = 'voice' | 'camera';

export interface ConversationMessage {
  id: string;
  speaker: ConversationSpeaker;
  originalText: string;
  translatedText: string;
  timestamp: Date;
  source?: ConversationMessageSource;
  sourceLanguage?: LanguageCode;
  targetLanguage?: LanguageCode;
  /** Local TTS file URI from the original translation — optional, may expire */
  audioUri?: string;
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
    source: params.source ?? 'voice',
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    audioUri: params.audioUri,
  };
}

export function resolveMessageLanguages(
  message: ConversationMessage,
  userLanguage: LanguageCode,
  partnerLanguage: LanguageCode,
): { sourceLanguage: LanguageCode; targetLanguage: LanguageCode } {
  if (message.sourceLanguage && message.targetLanguage) {
    return {
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
    };
  }

  if (message.speaker === 'me') {
    return { sourceLanguage: userLanguage, targetLanguage: partnerLanguage };
  }

  return { sourceLanguage: partnerLanguage, targetLanguage: userLanguage };
}
