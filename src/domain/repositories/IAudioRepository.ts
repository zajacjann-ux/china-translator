export interface AudioRecording {
  uri: string;
  durationMs: number;
  mimeType: string;
}

export interface IAudioRepository {
  /** Request microphone permission from the OS */
  requestPermission(): Promise<boolean>;

  /** Start recording audio. Returns session id for tracking. */
  startRecording(): Promise<string>;

  /** Stop recording and return the captured audio file metadata */
  stopRecording(): Promise<AudioRecording>;

  /** Play audio from a URI (used for TTS playback) */
  playAudio(uri: string): Promise<void>;

  /** Stop any currently playing audio */
  stopPlayback(): Promise<void>;

  /** Release native resources */
  dispose(): Promise<void>;
}
