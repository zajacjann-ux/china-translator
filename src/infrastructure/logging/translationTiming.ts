import { logger } from '@/infrastructure/logging/logger';

const PREFIX = '[Translation Timing]';

type PipelineMark =
  | 'recording_finished'
  | 'stt_start'
  | 'audio_upload_start'
  | 'audio_upload_end'
  | 'stt_end'
  | 'translation_start'
  | 'translation_end'
  | 'tts_start'
  | 'tts_end'
  | 'audio_playback_start';

class TranslationPipelineTimer {
  private readonly pipelineStartMs = Date.now();
  private readonly marks = new Map<PipelineMark, number>();

  mark(label: PipelineMark): void {
    this.marks.set(label, Date.now());
  }

  logSummary(): void {
    const recordingFinished = this.marks.get('recording_finished');
    const playbackStart = this.marks.get('audio_playback_start');

    const segments: Array<{ label: string; durationMs: number | null }> = [
      {
        label: 'Recording finalize → STT start',
        durationMs: this.segmentMs('recording_finished', 'stt_start'),
      },
      {
        label: 'Audio upload',
        durationMs: this.segmentMs('audio_upload_start', 'audio_upload_end'),
      },
      {
        label: 'STT (Whisper)',
        durationMs: this.segmentMs('stt_start', 'stt_end'),
      },
      {
        label: 'Translation (GPT)',
        durationMs: this.segmentMs('translation_start', 'translation_end'),
      },
      {
        label: 'TTS synthesis',
        durationMs: this.segmentMs('tts_start', 'tts_end'),
      },
      {
        label: 'TTS → playback start',
        durationMs: this.segmentMs('tts_end', 'audio_playback_start'),
      },
    ];

    logger.debug(`${PREFIX} Pipeline marks`, {
      pipelineStartMs: this.pipelineStartMs,
      marks: Object.fromEntries(
        Array.from(this.marks.entries()).map(([key, timestamp]) => [
          key,
          { timestamp, offsetMs: timestamp - this.pipelineStartMs },
        ]),
      ),
    });

    for (const segment of segments) {
      if (segment.durationMs !== null) {
        logger.debug(`${PREFIX} ${segment.label}: ${segment.durationMs} ms`);
      }
    }

    if (recordingFinished && playbackStart) {
      const totalMs = playbackStart - recordingFinished;
      logger.debug(`${PREFIX} Total translation time: ${totalMs} ms`);
    } else {
      logger.debug(`${PREFIX} Total translation time: unavailable (incomplete pipeline)`);
    }
  }

  private segmentMs(start: PipelineMark, end: PipelineMark): number | null {
    const startMs = this.marks.get(start);
    const endMs = this.marks.get(end);
    if (startMs === undefined || endMs === undefined) return null;
    return endMs - startMs;
  }
}

let activeTimer: TranslationPipelineTimer | null = null;

export function beginPipelineTiming(): void {
  if (!__DEV__) return;
  activeTimer = new TranslationPipelineTimer();
}

export function markPipelineTiming(label: PipelineMark): void {
  if (!__DEV__) return;
  activeTimer?.mark(label);
}

export function completePipelineTiming(): void {
  if (!__DEV__) return;
  activeTimer?.logSummary();
  activeTimer = null;
}

export function cancelPipelineTiming(): void {
  if (!__DEV__) return;
  activeTimer = null;
}
