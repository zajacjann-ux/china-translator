import { Platform } from 'react-native';
import {
  AudioModule,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  type RecordingOptions,
  IOSOutputFormat,
  AudioQuality,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import type {
  IAudioRepository,
  AudioRecording,
  StartRecordingOptions,
} from '@/domain/repositories/IAudioRepository';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';
import {
  completePipelineTiming,
  markPipelineTiming,
} from '@/infrastructure/logging/translationTiming';
import { translationDebug } from '@/infrastructure/logging/translationDebug';
import { FAST_CAPTURE_SAMPLE_RATE } from '@/config/voiceTranslation.config';
import { encodeWavPcm16, mergeInt16Chunks } from '@/shared/utils/wav';
import { generateId } from '@/shared/utils/id';

type AudioRecorderInstance = InstanceType<typeof AudioModule.AudioRecorder>;
type AudioStreamInstance = InstanceType<typeof AudioModule.AudioStream>;
type ReleasableNativeObject = { release?: () => void };
type EventSubscription = { remove: () => void };

const AUDIO_STREAM_BUFFER = 'audioStreamBuffer';

/** 16 kHz mono AAC — optimal for Whisper (native sample rate, smaller uploads). */
const WHISPER_SAMPLE_RATE = 16000;

const WHISPER_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: WHISPER_SAMPLE_RATE,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    extension: '.m4a',
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
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

function int16FromBuffer(data: ArrayBuffer, channels: number): Int16Array {
  const samples = new Int16Array(data.byteLength / 2);
  const view = new DataView(data);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true);
  }

  if (channels <= 1) {
    return samples;
  }

  const monoLength = Math.floor(samples.length / channels);
  const mono = new Int16Array(monoLength);
  for (let index = 0; index < monoLength; index += 1) {
    mono[index] = samples[index * channels] ?? 0;
  }
  return mono;
}

export class ExpoAudioRepository implements IAudioRepository {
  private recorder: AudioRecorderInstance | null = null;
  private stream: AudioStreamInstance | null = null;
  private streamBufferSubscription: EventSubscription | null = null;
  private pcmChunks: Int16Array[] = [];
  private streamSampleRate = FAST_CAPTURE_SAMPLE_RATE;
  private onPcmChunk: ((chunk: Int16Array, sampleRate: number) => void) | null = null;
  private captureProfile: StartRecordingOptions['profile'] = 'accurate';
  private player: ReturnType<typeof createAudioPlayer> | null = null;
  private recordingStartedAt = 0;
  private isRecordingActive = false;
  private playbackModeConfigured = false;
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

  async startRecording(options?: StartRecordingOptions): Promise<string> {
    return this.runExclusive(async () => {
      this.captureProfile = options?.profile ?? 'accurate';
      this.onPcmChunk = options?.onPcmChunk ?? null;

      if (this.captureProfile === 'fast' && Platform.OS !== 'web') {
        return this.startFastStreamRecording();
      }

      return this.startAccurateFileRecording();
    });
  }

  async stopRecording(): Promise<AudioRecording> {
    return this.runExclusive(async () => {
      if (this.captureProfile === 'fast' && this.stream) {
        return this.stopFastStreamRecording();
      }

      return this.stopAccurateFileRecording();
    });
  }

  async playAudio(uri: string): Promise<void> {
    return this.runExclusive(async () => {
      await this.stopPlaybackInternal();
      await this.ensurePlaybackMode();

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
    this.releaseStreamInternal();
  }

  private async ensurePlaybackMode(): Promise<void> {
    if (this.playbackModeConfigured) return;

    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    this.playbackModeConfigured = true;
  }

  private resetPlaybackMode(): void {
    this.playbackModeConfigured = false;
  }

  private async startAccurateFileRecording(): Promise<string> {
    await this.stopPlaybackInternal();
    this.releaseRecorderInternal();
    this.releaseStreamInternal();
    this.resetPlaybackMode();

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

    logger.info('Accurate recording started', {
      recorderId: this.recorder.id,
      uri: this.recorder.uri,
    });

    return this.recorder.id;
  }

  private async startFastStreamRecording(): Promise<string> {
    await this.stopPlaybackInternal();
    this.releaseRecorderInternal();
    this.releaseStreamInternal();
    this.resetPlaybackMode();

    this.pcmChunks = [];
    this.streamSampleRate = FAST_CAPTURE_SAMPLE_RATE;

    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    this.stream = new AudioModule.AudioStream({
      sampleRate: FAST_CAPTURE_SAMPLE_RATE,
      channels: 1,
      encoding: 'int16',
    });

    this.streamBufferSubscription = this.stream.addListener(AUDIO_STREAM_BUFFER, (buffer) => {
      const mono = int16FromBuffer(buffer.data, buffer.channels);
      this.streamSampleRate = buffer.sampleRate || FAST_CAPTURE_SAMPLE_RATE;
      this.pcmChunks.push(mono);
      const totalSamples = this.pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const durationMs = (totalSamples / this.streamSampleRate) * 1000;
      console.log('[FAST DEBUG] AudioStream chunk received', {
        chunkSamples: mono.length,
        totalSamples,
        durationMs: Math.round(durationMs),
        sampleRate: this.streamSampleRate,
      });
      this.onPcmChunk?.(mono, this.streamSampleRate);
    });

    await this.stream.start();
    this.recordingStartedAt = Date.now();
    this.isRecordingActive = true;

    logger.info('Fast stream recording started', {
      streamId: this.stream.id,
      sampleRate: FAST_CAPTURE_SAMPLE_RATE,
    });

    return this.stream.id;
  }

  private async stopAccurateFileRecording(): Promise<AudioRecording> {
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
  }

  private async stopFastStreamRecording(): Promise<AudioRecording> {
    if (!this.stream || !this.isRecordingActive) {
      throw new AppError('RECORDING_FAILED', 'No active recording.');
    }

    const durationMs = Date.now() - this.recordingStartedAt;
    this.stream.stop();
    this.isRecordingActive = false;

    const pcm = mergeInt16Chunks(this.pcmChunks);
    if (pcm.length === 0) {
      this.releaseStreamInternal();
      throw new AppError('RECORDING_FAILED', 'Recording file is empty.');
    }

    const wavBytes = encodeWavPcm16(pcm, this.streamSampleRate, 1);
    const file = new File(Paths.cache, `fast-${generateId()}.wav`);
    file.write(wavBytes);

    const recording: AudioRecording = {
      uri: normalizeRecordingUri(file.uri),
      durationMs,
      mimeType: 'audio/wav',
      fileSizeBytes: wavBytes.byteLength,
    };

    this.releaseStreamInternal();

    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    return recording;
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

  private releaseStreamInternal(): void {
    this.streamBufferSubscription?.remove();
    this.streamBufferSubscription = null;

    if (this.stream) {
      try {
        if (this.stream.isStreaming) {
          this.stream.stop();
        }
        (this.stream as ReleasableNativeObject).release?.();
      } catch (error) {
        logger.warn('Failed to release audio stream', error);
      }
    }

    this.stream = null;
    this.pcmChunks = [];
    this.onPcmChunk = null;
    this.recordingStartedAt = 0;
    this.isRecordingActive = false;
  }
}
