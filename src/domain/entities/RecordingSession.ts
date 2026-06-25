import type { TranslationDirection } from './TranslationDirection';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

export interface RecordingSession {
  id: string;
  direction: TranslationDirection;
  status: RecordingStatus;
  startedAt?: Date;
  endedAt?: Date;
  audioUri?: string;
  errorMessage?: string;
}

export function createRecordingSession(direction: TranslationDirection): RecordingSession {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    direction,
    status: 'idle',
  };
}
