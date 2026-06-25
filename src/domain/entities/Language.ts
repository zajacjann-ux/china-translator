import {
  LANGUAGE_CONFIG,
  type LanguageDefinition,
  type OpenAiTtsVoice,
} from '@/config/languages.config';
import { AppError } from '@/shared/errors/AppError';

export type LanguageCode = string;

/** Runtime language record — sourced from languages.config.ts */
export type Language = LanguageDefinition;

export type { OpenAiTtsVoice };

class LanguageRegistryImpl {
  private readonly languages = new Map<LanguageCode, Language>();

  constructor() {
    LANGUAGE_CONFIG.languages.forEach((lang) => this.register(lang));
  }

  register(language: Language): void {
    this.languages.set(language.code, language);
  }

  get(code: LanguageCode): Language {
    const language = this.languages.get(code);
    if (!language) {
      throw new Error(`Unknown language code: ${code}`);
    }
    return language;
  }

  tryGet(code: LanguageCode): Language | undefined {
    return this.languages.get(code);
  }

  getAll(): Language[] {
    return LANGUAGE_CONFIG.languages.filter((lang) => this.languages.has(lang.code));
  }

  getSttEnabled(): Language[] {
    return this.getAll().filter((lang) => lang.sttEnabled);
  }
}

export const languageRegistry = new LanguageRegistryImpl();

export function getLanguage(code: LanguageCode): Language {
  return languageRegistry.get(code);
}

export function getAllLanguages(): Language[] {
  return languageRegistry.getAll();
}

export function makeDirection(source: LanguageCode, target: LanguageCode): string {
  return `${source}-to-${target}`;
}

export function assertLanguageSupportsStt(code: LanguageCode): void {
  const lang = getLanguage(code);
  if (!lang.sttEnabled) {
    throw new AppError('TRANSLATION_FAILED', `${lang.label} does not support speech-to-text.`);
  }
}

export function assertLanguageSupportsTranslation(source: LanguageCode, target: LanguageCode): void {
  const sourceLang = getLanguage(source);
  const targetLang = getLanguage(target);
  if (!sourceLang.translationEnabled || !targetLang.translationEnabled) {
    throw new AppError('TRANSLATION_FAILED', 'Translation is not supported for this language pair.');
  }
}

export function assertLanguageSupportsTts(code: LanguageCode): void {
  const lang = getLanguage(code);
  if (!lang.ttsEnabled) {
    throw new AppError('TTS_FAILED', `${lang.label} does not support text-to-speech.`);
  }
}

export const DEFAULT_USER_LANGUAGE: LanguageCode = LANGUAGE_CONFIG.defaultSourceLanguage;
export const DEFAULT_PARTNER_LANGUAGE: LanguageCode = LANGUAGE_CONFIG.defaultTargetLanguage;
