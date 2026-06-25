export type AsyncResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
