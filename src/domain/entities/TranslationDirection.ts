import type { LanguageCode } from './Language';
import { getLanguage, makeDirection } from './Language';

export type TranslationDirection = string;

export interface LanguagePairSelection {
  userLanguage: LanguageCode;
  partnerLanguage: LanguageCode;
}

export interface LanguagePair {
  direction: TranslationDirection;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sourceLabel: string;
  targetLabel: string;
  sourceFlag: string;
  targetFlag: string;
}

export function buildLanguagePair(source: LanguageCode, target: LanguageCode): LanguagePair {
  const sourceLang = getLanguage(source);
  const targetLang = getLanguage(target);
  return {
    direction: makeDirection(source, target),
    sourceLanguage: source,
    targetLanguage: target,
    sourceLabel: sourceLang.label,
    targetLabel: targetLang.label,
    sourceFlag: sourceLang.flag,
    targetFlag: targetLang.flag,
  };
}

export function getLanguagePairFromDirection(direction: TranslationDirection): LanguagePair {
  const parts = direction.split('-to-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid translation direction: ${direction}`);
  }
  return buildLanguagePair(parts[0], parts[1]);
}

export function getLanguagePair(source: LanguageCode, target: LanguageCode): LanguagePair {
  return buildLanguagePair(source, target);
}
