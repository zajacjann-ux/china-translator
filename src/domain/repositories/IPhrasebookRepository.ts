import type { Phrase, PhrasebookCategory, PhrasebookCategoryId } from '@/domain/entities/Phrasebook';

export interface IPhrasebookRepository {
  getCategories(): PhrasebookCategory[];
  getPhrasesByCategory(categoryId: PhrasebookCategoryId): Phrase[];
  getPhrase(id: string): Phrase | undefined;
  getAllPhrases(): Phrase[];
}
