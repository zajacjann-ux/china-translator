/**
 * FAST-mode performance instrumentation.
 * Active only while a fast voice session is in progress (__DEV__).
 */

const PREFIX = '[FAST PERF]';

let originMs: number | null = null;
let releaseOriginMs: number | null = null;
let liveTextCount = 0;
let liveTranslationCount = 0;
let firstLiveTextMarked = false;

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

/** Call on FAST button press (t=0). */
export function beginFastPerf(): void {
  if (!__DEV__) return;
  originMs = performance.now();
  releaseOriginMs = null;
  liveTextCount = 0;
  liveTranslationCount = 0;
  firstLiveTextMarked = false;
  console.log(`${PREFIX} button_press: +0ms`);
}

/** Call on FAST button release. */
export function markFastPerfRelease(): void {
  if (!isActive()) return;
  releaseOriginMs = performance.now();
  console.log(`${PREFIX} release: +${offsetFromPressMs()}ms`);
}

/** Mark a pipeline event relative to button press. */
export function markFastPerf(event: string, detail?: Record<string, unknown>): void {
  logFromPress(event, detail);
}

/** Mark a post-release pipeline event and log TOTAL_AFTER_RELEASE when playback starts. */
export function markFastPerfAfterRelease(event: string, detail?: Record<string, unknown>): void {
  logFromRelease(event, detail);
  if (event === 'playback_start') {
    console.log(`${PREFIX} TOTAL_AFTER_RELEASE: ${offsetFromReleaseMs()}ms`);
  }
}

export function markFastLiveSourceText(text: string): void {
  if (!isActive()) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  if (!firstLiveTextMarked) {
    firstLiveTextMarked = true;
    liveTextCount = 1;
    logFromPress('first_live_text', { chars: trimmed.length });
    return;
  }

  liveTextCount += 1;
  logFromPress(`live_text_update_${liveTextCount}`, { chars: trimmed.length });
}

export function markFastLiveTranslatedText(text: string): void {
  if (!isActive()) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  liveTranslationCount += 1;
  if (liveTranslationCount === 1) {
    logFromPress('first_live_translation', { chars: trimmed.length });
    return;
  }

  logFromPress(`live_translation_update_${liveTranslationCount}`, { chars: trimmed.length });
}

export function resetFastPerf(): void {
  originMs = null;
  releaseOriginMs = null;
  liveTextCount = 0;
  liveTranslationCount = 0;
  firstLiveTextMarked = false;
}

export function isFastPerfReleasePhase(): boolean {
  return __DEV__ && releaseOriginMs !== null;
}
