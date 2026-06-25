import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import {
  fromStoredResult,
  toStoredResult,
  type StoredTranslationResult,
} from '@/domain/entities/TranslationResult';

import { MAX_CONVERSATION_HISTORY } from '@/shared/constants';

export interface IConversationHistoryRepository {
  saveConversation(result: TranslationResult): Promise<void>;
  getRecentConversations(limit?: number): Promise<TranslationResult[]>;
  clearHistory(): Promise<void>;
}

const STORAGE_KEY = '@rabbitalk/conversations';

export class AsyncStorageConversationRepository implements IConversationHistoryRepository {
  async saveConversation(result: TranslationResult): Promise<void> {
    const existing = await this.loadStored();
    const stored = toStoredResult(result);
    const updated = [stored, ...existing.filter((item) => item.id !== stored.id)].slice(
      0,
      MAX_CONVERSATION_HISTORY,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async getRecentConversations(limit = MAX_CONVERSATION_HISTORY): Promise<TranslationResult[]> {
    const stored = await this.loadStored();
    return stored.slice(0, limit).map(fromStoredResult);
  }

  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  private async loadStored(): Promise<StoredTranslationResult[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as StoredTranslationResult[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

/** @deprecated Use IConversationHistoryRepository */
export type IOfflineCacheRepository = IConversationHistoryRepository;

/** @deprecated Use AsyncStorageConversationRepository */
export { AsyncStorageConversationRepository as PersistentConversationRepository };
