import type { LanguageCode } from './Language';
import type { ConversationMessage } from './ConversationMessage';
import { generateId } from '@/shared/utils/id';

export interface SavedConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  messages: ConversationMessage[];
  isFavorite: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  messageCount: number;
  isFavorite: boolean;
  searchText: string;
}

export interface StoredConversationMessage {
  id: string;
  speaker: ConversationMessage['speaker'];
  originalText: string;
  translatedText: string;
  timestamp: string;
  source?: ConversationMessage['source'];
  sourceLanguage?: LanguageCode;
  targetLanguage?: LanguageCode;
  audioUri?: string;
}

export interface StoredSavedConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  messages: StoredConversationMessage[];
  isFavorite: boolean;
}

export interface StoredConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  messageCount: number;
  isFavorite: boolean;
  searchText: string;
}

export function createSavedConversation(
  params: Omit<SavedConversation, 'id' | 'createdAt' | 'updatedAt' | 'title' | 'isFavorite'> & {
    id?: string;
    title?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isFavorite?: boolean;
  },
): SavedConversation {
  const now = new Date();
  return {
    id: params.id ?? generateId(),
    title: params.title ?? 'New conversation',
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    messages: params.messages,
    isFavorite: params.isFavorite ?? false,
  };
}

export function buildSearchText(conversation: SavedConversation): string {
  const parts = [
    conversation.title,
    ...conversation.messages.flatMap((message) => [message.originalText, message.translatedText]),
  ];
  return parts.join(' ').toLowerCase();
}

export function toStoredConversation(conversation: SavedConversation): StoredSavedConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    sourceLanguage: conversation.sourceLanguage,
    targetLanguage: conversation.targetLanguage,
    isFavorite: conversation.isFavorite,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      speaker: message.speaker,
      originalText: message.originalText,
      translatedText: message.translatedText,
      timestamp: message.timestamp.toISOString(),
      source: message.source,
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
      audioUri: message.audioUri,
    })),
  };
}

export function fromStoredConversation(stored: StoredSavedConversation): SavedConversation {
  return {
    id: stored.id,
    title: stored.title,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    sourceLanguage: stored.sourceLanguage,
    targetLanguage: stored.targetLanguage,
    isFavorite: stored.isFavorite ?? false,
    messages: stored.messages.map((message) => ({
      id: message.id,
      speaker: message.speaker,
      originalText: message.originalText,
      translatedText: message.translatedText,
      timestamp: new Date(message.timestamp),
      source: message.source,
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
      audioUri: message.audioUri,
    })),
  };
}

export function toStoredSummary(conversation: SavedConversation): StoredConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    sourceLanguage: conversation.sourceLanguage,
    targetLanguage: conversation.targetLanguage,
    messageCount: conversation.messages.length,
    isFavorite: conversation.isFavorite,
    searchText: buildSearchText(conversation),
  };
}

export function fromStoredSummary(stored: StoredConversationSummary): ConversationSummary {
  return {
    id: stored.id,
    title: stored.title,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    sourceLanguage: stored.sourceLanguage,
    targetLanguage: stored.targetLanguage,
    messageCount: stored.messageCount,
    isFavorite: stored.isFavorite ?? false,
    searchText: stored.searchText,
  };
}

export function summaryFromConversation(conversation: SavedConversation): ConversationSummary {
  return fromStoredSummary(toStoredSummary(conversation));
}
