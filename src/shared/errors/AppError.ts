export type AppErrorCode =
  | 'PERMISSION_DENIED'
  | 'RECORDING_FAILED'
  | 'EMPTY_TRANSCRIPTION'
  | 'TRANSLATION_FAILED'
  | 'TTS_FAILED'
  | 'NETWORK_ERROR'
  | 'API_KEY_MISSING'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }

  static fromUnknown(error: unknown, fallbackMessage = 'Something went wrong'): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError('UNKNOWN', error.message, error);
    }
    return new AppError('UNKNOWN', fallbackMessage, error);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
