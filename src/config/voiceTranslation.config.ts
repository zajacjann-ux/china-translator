/** Minimum PCM audio before an interim Whisper request (milliseconds). */
export const FAST_INTERIM_STT_MIN_MS = 280;

/** Fallback polling interval for interim speech recognition while recording. */
export const FAST_INTERIM_STT_INTERVAL_MS = 400;

/** Debounce after PCM arrives before running interim STT. */
export const FAST_PCM_DEBOUNCE_MS = 120;

/** Debounce before firing a background translation on partial text. */
export const FAST_TRANSLATION_DEBOUNCE_MS = 450;

/** Minimum characters before fast mode starts background translation. */
export const FAST_TRANSLATION_MIN_CHARS = 4;

/** PCM sample rate for fast capture — matches Whisper-friendly 16 kHz mono. */
export const FAST_CAPTURE_SAMPLE_RATE = 16000;

/** Chat mode — lower-latency interim STT tuning. */
export const CHAT_INTERIM_STT_MIN_MS = 200;

export const CHAT_INTERIM_STT_INTERVAL_MS = 350;

export const CHAT_PCM_DEBOUNCE_MS = 50;

/** Minimum interval between live translation requests while speaking. */
export const CHAT_TRANSLATION_THROTTLE_MS = 350;

export const CHAT_TRANSLATION_MIN_CHARS = 3;
