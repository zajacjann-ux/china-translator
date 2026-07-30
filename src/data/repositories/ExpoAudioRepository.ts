import { Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import type { IAudioRepository, AudioRecording } from '@/domain/repositories/IAudioRepository';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import {
  completePipelineTiming,
  markPipelineTiming,
} from '@/infrastructure/logging/translationTiming';
import { translationDebug } from '@/infrastructure/logging/translationDebug';

type AudioRecorderInstance = InstanceType<typeof AudioModule.AudioRecorder>;
type ReleasableNativeObject = { release?: () => void };

/** Whisper-friendly AAC recording in .m4a container. */
const WHISPER_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
};

const FILE_READY_ATTEMPTS = 15;
const FILE_READY_DELAY_MS = 40;
const MIN_RECORDING_BYTES = 512;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRecordingUri(uri: string): string {
  if (uri.startsWith('file://')) return uri;
  return Platform.OS === 'android' ? `file://${uri}` : `file://${uri}`;
}

async function waitForRecordingFile(uri: string): Promise<{ fileSizeBytes: number; mimeType: string }> {
  let lastSize = 0;
  let stableReads = 0;

  for (let attempt = 0; attempt < FILE_READY_ATTEMPTS; attempt += 1) {
    const file = new File(uri);
    if (file.exists && file.size > 0) {
      if (file.size === lastSize) {
        stableReads += 1;
      } else {
        stableReads = 0;
        lastSize = file.size;
      }

      if (stableReads >= 1 && file.size >= MIN_RECORDING_BYTES) {
        return {
          fileSizeBytes: file.size,
          mimeType: 'audio/m4a',
        };
      }
    }

    if (attempt > 0) {
      await sleep(FILE_READY_DELAY_MS);
    }
  }

  if (lastSize > 0) {
    return {
      fileSizeBytes: lastSize,
      mimeType: 'audio/m4a',
    };
  }

  throw new AppError('RECORDING_FAILED', 'Recording file is empty.');
}

export class ExpoAudioRepository implements IAudioRepository {
  private recorder: AudioRecorderInstance | null = null;
  private player: ReturnType<typeof createAudioPlayer> | null = null;
  private recordingStartedAt = 0;
  private isRecordingActive = false;
  private operationQueue: Promise<unknown> = Promise.resolve();

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operationQueue.then(operation, operation);
    this.operationQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async requestPermission(): Promise<boolean> {
    const status = await requestRecordingPermissionsAsync();
    return status.granted;
  }

  async startRecording(): Promise<string> {
    return this.runExclusive(async () => {
      await this.stopPlaybackInternal();
      this.releaseRecorderInternal();

      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      this.recorder = new AudioModule.AudioRecorder(WHISPER_RECORDING_OPTIONS);
      await this.recorder.prepareToRecordAsync(WHISPER_RECORDING_OPTIONS);
      this.recorder.record();

      if (!this.recorder.isRecording) {
        this.releaseRecorderInternal();
        throw new AppError('RECORDING_FAILED', 'Microphone failed to start recording.');
      }

      this.recordingStartedAt = Date.now();
      this.isRecordingActive = true;

      logger.info('Recording started', {
        recorderId: this.recorder.id,
        uri: this.recorder.uri,
      });

      return this.recorder.id;
    });
  }

  async stopRecording(): Promise<AudioRecording> {
    return this.runExclusive(async () => {
      if (!this.recorder || !this.isRecordingActive) {
        throw new AppError('RECORDING_FAILED', 'No active recording.');
      }

      const durationMs = Date.now() - this.recordingStartedAt;
      const recorder = this.recorder;

      try {
        await recorder.stop();
      } catch (error) {
        this.isRecordingActive = false;
        throw AppError.fromUnknown(error, 'Failed to stop recording.');
      }

      this.isRecordingActive = false;

      const rawUri = recorder.uri;
      if (!rawUri) {
        this.releaseRecorderInternal();
        throw new AppError('RECORDING_FAILED', 'Recording file was not saved.');
      }

      const uri = normalizeRecordingUri(rawUri);
      const { fileSizeBytes, mimeType } = await waitForRecordingFile(uri);

      logger.info('Recording stopped', {
        uri,
        fileSizeBytes,
        durationMs,
        mimeType,
      });

      const recording: AudioRecording = {
        uri,
        durationMs,
        mimeType,
        fileSizeBytes,
      };

      this.releaseRecorderInternal();

      void setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      return recording;
    });
  }

  async playAudio(uri: string): Promise<void> {
    return this.runExclusive(async () => {
      await this.stopPlaybackInternal();

      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      try {
        const player = createAudioPlayer(uri);
        this.player = player;
        player.play();
        markPipelineTiming('audio_playback_start');
        translationDebug.audioPlaybackStarted({ uri });
        completePipelineTiming();
      } catch (error) {
        logger.error('Playback failed', error);
        throw AppError.fromUnknown(error, 'Failed to play audio.');
      }
    });
  }

  async stopPlayback(): Promise<void> {
    return this.runExclusive(async () => {
      await this.stopPlaybackInternal();
    });
  }

  async dispose(): Promise<void> {
    await this.stopPlayback();
    this.releaseRecorderInternal();
  }

  private async stopPlaybackInternal(): Promise<void> {
    if (!this.player) return;

    try {
      this.player.pause();
      this.player.remove();
    } catch (error) {
      logger.warn('Failed to release audio player', error);
    } finally {
      this.player = null;
    }
  }

  private releaseRecorderInternal(): void {
    if (!this.recorder) return;

    try {
      (this.recorder as ReleasableNativeObject).release?.();
    } catch (error) {
      logger.warn('Failed to release recorder', error);
    } finally {
      this.recorder = null;
      this.recordingStartedAt = 0;
      this.isRecordingActive = false;
    }
  }
}
