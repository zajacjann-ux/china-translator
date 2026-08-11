import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_VOICE_TRANSLATION_MODE,
  normalizeVoiceTranslationMode,
  type VoiceTranslationMode,
} from '@/domain/entities/VoiceTranslationMode';

const STORAGE_KEY = '@rabbitalk/voice-translation-mode';

export async function loadVoiceTranslationMode(): Promise<VoiceTranslationMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_TRANSLATION_MODE;
    const parsed = JSON.parse(raw) as { mode?: unknown };
    return normalizeVoiceTranslationMode(parsed.mode);
  } catch {
    return DEFAULT_VOICE_TRANSLATION_MODE;
  }
}

export async function saveVoiceTranslationMode(mode: VoiceTranslationMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }));
}
