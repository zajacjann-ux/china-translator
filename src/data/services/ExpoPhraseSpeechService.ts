import * as Speech from 'expo-speech';
import type { IPhraseSpeechService } from '@/domain/use-cases/PhrasebookUseCase';
import type { LanguageCode } from '@/domain/entities/Language';
import { getLanguage } from '@/domain/entities/Language';

export class ExpoPhraseSpeechService implements IPhraseSpeechService {
  async speak(text: string, languageCode: LanguageCode): Promise<void> {
    const language = getLanguage(languageCode);
    await this.stop();
    return new Promise((resolve, reject) => {
      Speech.speak(text, {
        language: language.speechLocale,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }

  async stop(): Promise<void> {
    Speech.stop();
  }
}
