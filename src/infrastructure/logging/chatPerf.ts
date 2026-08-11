/**
 * Chat-mode performance instrumentation.
 * Active only while a chat voice session is in progress (__DEV__).
 */

const PREFIX = '[CHAT PERF]';

let originMs: number | null = null;
let releaseOriginMs: number | null = null;
let firstSourceTextMarked = false;
let firstTranslationStartedMarked = false;
let firstTranslationVisibleMarked = false;

function isActive(): boolean {
  return __DEV__ && originMs !== null;
}

function offsetFromPressMs(): number {
  if (originMs === null) return 0;
  return Math.round(performance.now() - originMs);
}

function offsetFromReleaseMs(): number {
  if (releaseOriginMs === null) return 0;
  return Math.round(performance.now() - releaseOriginMs);
}

function logFromPress(event: string, detail?: Record<string, unknown>): void {
  if (!isActive()) return;
  const suffix = detail ? ` ${JSON.stringify(detail)}` : '';
  console.log(`${PREFIX} ${event}: +${offsetFromPressMs()}ms${suffix}`);
}

function logFromRelease(event: string, detail?: Record<string, unknown>): void {
  if (!isActive() || releaseOriginMs === null) return;
  const suffix = detail ? ` ${JSON.stringify(detail)}` : '';
  console.log(`${PREFIX} ${event}: +${offsetFromReleaseMs()}ms (after release)${suffix}`);
}

export function beginChatPerf(): void {
  if (!__DEV__) return;
  originMs = performance.now();
  releaseOriginMs = null;
  firstSourceTextMarked = false;
  firstTranslationStartedMarked = false;
  firstTranslationVisibleMarked = false;
  logFromPress('recording_started');
}

export function markChatPerfRelease(): void {
  if (!isActive() || releaseOriginMs !== null) return;
  releaseOriginMs = performance.now();
  logFromPress('release');
}

export function markChatPerf(event: string, detail?: Record<string, unknown>): void {
  logFromPress(event, detail);
}

export function markChatPerfAfterRelease(event: string, detail?: Record<string, unknown>): void {
  logFromRelease(event, detail);
}

export function markChatFirstSourceText(text: string): void {
  if (!isActive() || firstSourceTextMarked) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  firstSourceTextMarked = true;
  logFromPress('first_source_text', { chars: trimmed.length });
}

export function markChatFirstTranslationRequest(): void {
  if (!isActive() || firstTranslationStartedMarked) return;
  firstTranslationStartedMarked = true;
  logFromPress('first_translation_request');
}

/** @deprecated use markChatFirstTranslationRequest */
export function markChatFirstTranslationStarted(): void {
  markChatFirstTranslationRequest();
}

export function markChatFirstTranslationVisible(text: string): void {
  if (!isActive() || firstTranslationVisibleMarked) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  firstTranslationVisibleMarked = true;
  logFromPress('first_translation_visible', { chars: trimmed.length });
}

export function resetChatPerf(): void {
  originMs = null;
  releaseOriginMs = null;
  firstSourceTextMarked = false;
  firstTranslationStartedMarked = false;
  firstTranslationVisibleMarked = false;
}
