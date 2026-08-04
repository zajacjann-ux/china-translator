import type { ConversationSummary, SavedConversation } from '@/domain/entities/SavedConversation';
import type { ISavedConversationRepository } from '@/domain/repositories/ISavedConversationRepository';

export class SavedConversationUseCase {
  constructor(private readonly repository: ISavedConversationRepository) {}

  listSummaries(): Promise<ConversationSummary[]> {
    return this.repository.listSummaries();
  }

  getById(id: string): Promise<SavedConversation | null> {
    return this.repository.getById(id);
  }

  save(conversation: SavedConversation): Promise<void> {
    return this.repository.save(conversation);
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  deleteMany(ids: string[]): Promise<void> {
    return this.repository.deleteMany(ids);
  }

  deleteAll(): Promise<void> {
    return this.repository.deleteAll();
  }

  toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    return this.repository.setFavorite(id, isFavorite);
  }

  async search(query: string): Promise<ConversationSummary[]> {
    const normalized = query.trim().toLowerCase();
    const summaries = await this.repository.listSummaries();
    if (!normalized) return summaries;

    return summaries.filter((summary) => summary.searchText.includes(normalized));
  }
}
