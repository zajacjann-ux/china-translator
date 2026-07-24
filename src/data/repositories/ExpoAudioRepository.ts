import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import type { IAudioRepository, AudioRecording } from '@/domain/repositories/IAudioRepository';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

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

export class ExpoAudioRepository implements IAudioRepository {
  private recorder: AudioRecorderInstance | null = null;
  private player: ReturnType<typeof createAudioPlayer> | null = null;
  private recordingStartedAt = 0;
  private isRecordingActive = false;

  async requestPermission(): Promise<boolean> {
    const status = await requestRecordingPermissionsAsync();
    return status.granted;
  }

  async startRecording(): Promise<string> {
    await this.stopPlayback();
    this.releaseRecorder();

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    this.recorder = new AudioModule.AudioRecorder(WHISPER_RECORDING_OPTIONS);
    await this.recorder.prepareToRecordAsync(WHISPER_RECORDING_OPTIONS);

    this.recordingStartedAt = Date.now();
    this.recorder.record();
    this.isRecordingActive = true;

    logger.info('Recording started', { recorderId: this.recorder.id });

    return this.recorder.id;
  }

  async stopRecording(): Promise<AudioRecording> {
    if (!this.recorder || !this.isRecordingActive) {
      throw new AppError('RECORDING_FAILED', 'No active recording.');
    }

    const durationMs = Date.now() - this.recordingStartedAt;

    try {
      await this.recorder.stop();
    } catch (error) {
      this.isRecordingActive = false;
      throw AppError.fromUnknown(error, 'Failed to stop recording.');
    }

    this.isRecordingActive = false;

    const uri = this.recorder.uri;
    if (!uri) {
      this.releaseRecorder();
      throw new AppError('RECORDING_FAILED', 'Recording file was not saved.');
    }

    const { fileSizeBytes, mimeType } = await this.validateRecordingFile(uri);

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

    this.releaseRecorder();

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    return recording;
  }

  async playAudio(uri: string): Promise<void> {
    await this.stopPlayback();

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    try {
      const player = createAudioPlayer(uri);
      this.player = player;
      player.play();
    } catch (error) {
      logger.error('Playback failed', error);
      throw AppError.fromUnknown(error, 'Failed to play audio.');
    }
  }

  async stopPlayback(): Promise<void> {
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

  async dispose(): Promise<void> {
    await this.stopPlayback();
    this.releaseRecorder();
  }

  private async validateRecordingFile(uri: string): Promise<{ fileSizeBytes: number; mimeType: string }> {
    const file = new File(uri);

    if (!file.exists) {
      throw new AppError('RECORDING_FAILED', 'Recording file does not exist on disk.');
    }

    const fileSizeBytes = file.size;
    if (!fileSizeBytes || fileSizeBytes <= 0) {
      throw new AppError('RECORDING_FAILED', 'Recording file is empty.');
    }

    return {
      fileSizeBytes,
      mimeType: 'audio/mp4',
    };
  }

  private releaseRecorder(): void {
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
