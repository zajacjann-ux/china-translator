import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import type { IAudioRepository, AudioRecording } from '@/domain/repositories/IAudioRepository';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/infrastructure/logging/logger';

type AudioRecorderInstance = InstanceType<typeof AudioModule.AudioRecorder>;
type ReleasableNativeObject = { release?: () => void };

export class ExpoAudioRepository implements IAudioRepository {
  private recorder: AudioRecorderInstance | null = null;
  private player: ReturnType<typeof createAudioPlayer> | null = null;
  private recordingStartedAt = 0;

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

    this.recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await this.recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);

    this.recordingStartedAt = Date.now();
    this.recorder.record();

    return this.recorder.id;
  }

  async stopRecording(): Promise<AudioRecording> {
    if (!this.recorder?.isRecording) {
      throw new AppError('RECORDING_FAILED', 'No active recording.');
    }

    const durationMs = Date.now() - this.recordingStartedAt;

    try {
      await this.recorder.stop();
    } catch (error) {
      throw AppError.fromUnknown(error, 'Failed to stop recording.');
    }

    const uri = this.recorder.uri;
    if (!uri) {
      throw new AppError('RECORDING_FAILED', 'Recording file was not saved.');
    }

    const recording: AudioRecording = {
      uri,
      durationMs,
      mimeType: 'audio/mp4',
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

  private releaseRecorder(): void {
    if (!this.recorder) return;

    try {
      (this.recorder as ReleasableNativeObject).release?.();
    } catch (error) {
      logger.warn('Failed to release recorder', error);
    } finally {
      this.recorder = null;
      this.recordingStartedAt = 0;
    }
  }
}
