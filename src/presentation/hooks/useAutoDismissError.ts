import { useEffect } from 'react';

export const ERROR_AUTO_DISMISS_MS = 5000;

export function useAutoDismissError(
  error: string | null,
  onDismiss: () => void,
  delayMs = ERROR_AUTO_DISMISS_MS,
): void {
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(onDismiss, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, error, onDismiss]);
}
