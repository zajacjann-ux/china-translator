import type { LanguageCode } from '../entities/Language';
import type { TranslationResult } from '../entities/TranslationResult';

export type ConversationModeState =
  | 'idle'
  | 'listening-user'
  | 'listening-partner'
  | 'processing'
  | 'speaking';

export interface ConversationModeConfig {
  userLanguage: LanguageCode;
  partnerLanguage: LanguageCode;
  /** Silence duration before ending a turn (ms) */
  silenceThresholdMs: number;
  /** Max recording length per turn (ms) */
  maxTurnDurationMs: number;
}

export interface ConversationModeCallbacks {
  onStateChange?: (state: ConversationModeState) => void;
  onTurnComplete?: (result: TranslationResult) => void;
  onError?: (message: string) => void;
}

/**
 * Future: hands-free table conversation with VAD turn detection.
 * Architecture prepared — implementation in Phase 4.
 */
export class ConversationModeUseCase {
  private state: ConversationModeState = 'idle';
  private config: ConversationModeConfig | null = null;

  getState(): ConversationModeState {
    return this.state;
  }

  isAvailable(): boolean {
    return false;
  }

  async start(_config: ConversationModeConfig, _callbacks?: ConversationModeCallbacks): Promise<void> {
    throw new Error(
      'Conversation mode is coming soon. The phone will listen and speak automatically for both people.',
    );
  }

  async stop(): Promise<void> {
    this.state = 'idle';
    this.config = null;
  }

  /** Reserved for VAD-based turn detection */
  protected setState(next: ConversationModeState): void {
    this.state = next;
  }
}
