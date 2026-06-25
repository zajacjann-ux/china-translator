import type { LanguageCode } from '../entities/Language';
import type { Phrase } from '../entities/Phrasebook';
import type { IPhrasebookRepository } from '../repositories/IPhrasebookRepository';

export interface IPhraseSpeechService {
  speak(text: string, languageCode: LanguageCode): Promise<void>;
  stop(): Promise<void>;
}

export class PhrasebookUseCase {
  constructor(
    private readonly phrasebookRepository: IPhrasebookRepository,
    private readonly phraseSpeechService: IPhraseSpeechService,
  ) {}

  getCategories() {
    return this.phrasebookRepository.getCategories();
  }

  getPhrases(categoryId: Phrase['categoryId']) {
    return this.phrasebookRepository.getPhrasesByCategory(categoryId);
  }

  async speakPhrase(phrase: Phrase, languageCode: LanguageCode): Promise<void> {
    const text = phrase.translations[languageCode];
    if (!text) {
      throw new Error(`Phrase has no translation for ${languageCode}`);
    }
    await this.phraseSpeechService.speak(text, languageCode);
  }

  stopSpeaking(): Promise<void> {
    return this.phraseSpeechService.stop();
  }
}
