import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from '@/domain/entities/Language';
import {
  DEFAULT_PARTNER_LANGUAGE,
  DEFAULT_USER_LANGUAGE,
} from '@/domain/entities/Language';

const STORAGE_KEY = '@rabbitalk/language-pair';

export interface StoredLanguagePair {
  userLanguage: LanguageCode;
  partnerLanguage: LanguageCode;
}

export async function loadLanguagePair(): Promise<StoredLanguagePair> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        userLanguage: DEFAULT_USER_LANGUAGE,
        partnerLanguage: DEFAULT_PARTNER_LANGUAGE,
      };
    }
    const parsed = JSON.parse(raw) as StoredLanguagePair;
    return {
      userLanguage: parsed.userLanguage ?? DEFAULT_USER_LANGUAGE,
      partnerLanguage: parsed.partnerLanguage ?? DEFAULT_PARTNER_LANGUAGE,
    };
  } catch {
    return {
      userLanguage: DEFAULT_USER_LANGUAGE,
      partnerLanguage: DEFAULT_PARTNER_LANGUAGE,
    };
  }
}

export async function saveLanguagePair(pair: StoredLanguagePair): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
}
