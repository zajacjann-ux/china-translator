import { ExpoAudioRepository } from '@/data/repositories/ExpoAudioRepository';
import { OpenAISpeechToTextRepository } from '@/data/repositories/OpenAISpeechToTextRepository';
import { OpenAITranslationRepository } from '@/data/repositories/OpenAITranslationRepository';
import { OpenAITextToSpeechRepository } from '@/data/repositories/OpenAITextToSpeechRepository';
import { OpenAIVisionOcrRepository } from '@/data/repositories/OpenAIVisionOcrRepository';
import { LocalPhrasebookRepository } from '@/data/repositories/LocalPhrasebookRepository';
import { ExpoPhraseSpeechService } from '@/data/services/ExpoPhraseSpeechService';
import { AsyncStorageConversationRepository } from '@/data/storage/ConversationHistoryRepository';
import { TranslateTextUseCase } from '@/domain/use-cases/TranslateTextUseCase';
import { TranslateSpeechUseCase } from '@/domain/use-cases/TranslateSpeechUseCase';
import { TranslateCameraUseCase } from '@/domain/use-cases/TranslateCameraUseCase';
import { PhrasebookUseCase } from '@/domain/use-cases/PhrasebookUseCase';
import { ConversationModeUseCase } from '@/domain/use-cases/ConversationModeUseCase';

class Container {
  readonly audioRepository = new ExpoAudioRepository();
  readonly speechToTextRepository = new OpenAISpeechToTextRepository();
  readonly translationRepository = new OpenAITranslationRepository();
  readonly textToSpeechRepository = new OpenAITextToSpeechRepository();
  readonly ocrRepository = new OpenAIVisionOcrRepository();
  readonly phrasebookRepository = new LocalPhrasebookRepository();
  readonly phraseSpeechService = new ExpoPhraseSpeechService();
  readonly conversationHistoryRepository = new AsyncStorageConversationRepository();

  readonly translateTextUseCase = new TranslateTextUseCase(
    this.translationRepository,
    this.textToSpeechRepository,
    this.audioRepository,
  );

  readonly translateSpeechUseCase = new TranslateSpeechUseCase(
    this.audioRepository,
    this.speechToTextRepository,
    this.translationRepository,
    this.textToSpeechRepository,
  );

  readonly translateCameraUseCase = new TranslateCameraUseCase(
    this.ocrRepository,
    this.translationRepository,
    this.textToSpeechRepository,
    this.audioRepository,
  );

  readonly phrasebookUseCase = new PhrasebookUseCase(
    this.phrasebookRepository,
    this.phraseSpeechService,
  );

  readonly conversationModeUseCase = new ConversationModeUseCase();
}

export const container = new Container();
