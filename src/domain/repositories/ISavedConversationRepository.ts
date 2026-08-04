import type { ConversationSummary, SavedConversation } from '@/domain/entities/SavedConversation';

/** Local persistence for full chat sessions — cloud sync can wrap this interface later. */
export interface ISavedConversationRepository {
  listSummaries(): Promise<ConversationSummary[]>;
  getById(id: string): Promise<SavedConversation | null>;
  save(conversation: SavedConversation): Promise<void>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  deleteAll(): Promise<void>;
  setFavorite(id: string, isFavorite: boolean): Promise<void>;
}
