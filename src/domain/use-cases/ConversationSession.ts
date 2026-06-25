import type { TranslationResult } from '../entities/TranslationResult';

import type { SpeakerRole } from '../entities/TranslationRoute';

/**
 * Future: continuous conversation mode with turn-taking and context window.
 */
export interface ConversationTurn {
  result: TranslationResult;
  speaker: SpeakerRole;
}

export interface IConversationSession {
  readonly turns: ConversationTurn[];
  addTurn(turn: ConversationTurn): void;
  clear(): void;
}

export class ConversationSession implements IConversationSession {
  readonly turns: ConversationTurn[] = [];

  addTurn(turn: ConversationTurn): void {
    this.turns.push(turn);
  }

  clear(): void {
    this.turns.length = 0;
  }
}
