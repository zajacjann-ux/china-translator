import type { Phrase, PhrasebookCategoryId } from '@/domain/entities/Phrasebook';
import { PHRASEBOOK_CATEGORIES } from '@/domain/entities/Phrasebook';
import type { IPhrasebookRepository } from '@/domain/repositories/IPhrasebookRepository';
import { PHRASEBOOK_PHRASES } from '@/data/phrasebook/phrases';

export class LocalPhrasebookRepository implements IPhrasebookRepository {
  getCategories() {
    return PHRASEBOOK_CATEGORIES;
  }

  getPhrasesByCategory(categoryId: PhrasebookCategoryId): Phrase[] {
    return PHRASEBOOK_PHRASES.filter((phrase) => phrase.categoryId === categoryId);
  }

  getPhrase(id: string): Phrase | undefined {
    return PHRASEBOOK_PHRASES.find((phrase) => phrase.id === id);
  }

  getAllPhrases(): Phrase[] {
    return PHRASEBOOK_PHRASES;
  }
}
