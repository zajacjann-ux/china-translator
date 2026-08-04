import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConversationSummary, SavedConversation } from '@/domain/entities/SavedConversation';
import {
  fromStoredConversation,
  fromStoredSummary,
  toStoredConversation,
  toStoredSummary,
  type StoredConversationSummary,
  type StoredSavedConversation,
} from '@/domain/entities/SavedConversation';
import type { ISavedConversationRepository } from '@/domain/repositories/ISavedConversationRepository';

const INDEX_KEY = '@rabbitalk/v2/conversation-index';
const conversationKey = (id: string) => `@rabbitalk/v2/conversation/${id}`;

/**
 * Index + per-conversation storage keeps list/search fast without loading every message.
 * A future cloud sync layer can mirror the same SavedConversation shape.
 */
export class AsyncStorageSavedConversationRepository implements ISavedConversationRepository {
  async listSummaries(): Promise<ConversationSummary[]> {
    const index = await this.loadIndex();
    return index
      .map(fromStoredSummary)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getById(id: string): Promise<SavedConversation | null> {
    try {
      const raw = await AsyncStorage.getItem(conversationKey(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredSavedConversation;
      return fromStoredConversation(parsed);
    } catch {
      return null;
    }
  }

  async save(conversation: SavedConversation): Promise<void> {
    const stored = toStoredConversation(conversation);
    const summary = toStoredSummary(conversation);

    await AsyncStorage.setItem(conversationKey(conversation.id), JSON.stringify(stored));

    const index = await this.loadIndex();
    const withoutCurrent = index.filter((item) => item.id !== conversation.id);
    const updatedIndex = [summary, ...withoutCurrent];
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(updatedIndex));
  }

  async delete(id: string): Promise<void> {
    await AsyncStorage.removeItem(conversationKey(id));
    const index = await this.loadIndex();
    await AsyncStorage.setItem(
      INDEX_KEY,
      JSON.stringify(index.filter((item) => item.id !== id)),
    );
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => AsyncStorage.removeItem(conversationKey(id))));
    const idSet = new Set(ids);
    const index = await this.loadIndex();
    await AsyncStorage.setItem(
      INDEX_KEY,
      JSON.stringify(index.filter((item) => !idSet.has(item.id))),
    );
  }

  async deleteAll(): Promise<void> {
    const index = await this.loadIndex();
    await Promise.all(index.map((item) => AsyncStorage.removeItem(conversationKey(item.id))));
    await AsyncStorage.removeItem(INDEX_KEY);
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const conversation = await this.getById(id);
    if (!conversation) return;

    const updated: SavedConversation = {
      ...conversation,
      isFavorite,
      updatedAt: new Date(),
    };
    await this.save(updated);
  }

  private async loadIndex(): Promise<StoredConversationSummary[]> {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as StoredConversationSummary[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
