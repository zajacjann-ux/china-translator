/**
 * Rabbitalk — single language configuration file.
 *
 * To add a new language in the future, append an entry to `languages` below.
 * All features (selector, STT, translation, TTS, phrasebook) read from here.
 */

export type OpenAiTtsVoice = 'alloy' | 'nova' | 'shimmer' | 'echo' | 'fable' | 'onyx';

export interface LanguageDefinition {
  /** ISO 639-1 language code */
  code: string;
  /** English display name */
  label: string;
  /** Name in the language itself */
  nativeLabel: string;
  flag: string;
  /** ISO 639-1 code passed to Whisper STT */
  whisperCode: string;
  /** BCP 47 locale for on-device phrasebook pronunciation (expo-speech) */
  speechLocale: string;
  sttEnabled: boolean;
  translationEnabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: OpenAiTtsVoice;
}

export interface LanguageConfig {
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  languages: LanguageDefinition[];
}

export const LANGUAGE_CONFIG: LanguageConfig = {
  defaultSourceLanguage: 'sk',
  defaultTargetLanguage: 'zh',
  languages: [
    {
      code: 'sk',
      label: 'Slovak',
      nativeLabel: 'Slovenčina',
      flag: '🇸🇰',
      whisperCode: 'sk',
      speechLocale: 'sk-SK',
      sttEnabled: true,
      translationEnabled: true,
      ttsEnabled: true,
      ttsVoice: 'nova',
    },
    {
      code: 'en',
      label: 'English',
      nativeLabel: 'English',
      flag: '🇬🇧',
      whisperCode: 'en',
      speechLocale: 'en-US',
      sttEnabled: true,
      translationEnabled: true,
      ttsEnabled: true,
      ttsVoice: 'alloy',
    },
    {
      code: 'de',
      label: 'German',
      nativeLabel: 'Deutsch',
      flag: '🇩🇪',
      whisperCode: 'de',
      speechLocale: 'de-DE',
      sttEnabled: true,
      translationEnabled: true,
      ttsEnabled: true,
      ttsVoice: 'onyx',
    },
    {
      code: 'zh',
      label: 'Chinese (Simplified)',
      nativeLabel: '简体中文',
      flag: '🇨🇳',
      whisperCode: 'zh',
      speechLocale: 'zh-CN',
      sttEnabled: true,
      translationEnabled: true,
      ttsEnabled: true,
      ttsVoice: 'nova',
    },
    {
      code: 'id',
      label: 'Indonesian',
      nativeLabel: 'Bahasa Indonesia',
      flag: '🇮🇩',
      whisperCode: 'id',
      speechLocale: 'id-ID',
      sttEnabled: true,
      translationEnabled: true,
      ttsEnabled: true,
      ttsVoice: 'nova',
    },
  ],
};
