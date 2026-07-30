import type { LanguageCode } from '@/domain/entities/Language';
import { getLanguage } from '@/domain/entities/Language';

export type TravelLocation =
  | 'hotel'
  | 'restaurant'
  | 'taxi'
  | 'shopping'
  | 'airport'
  | 'general';

/** Optional context passed into GPT translation (extensible for future UI). */
export interface TranslationContext {
  situation?: string;
  location?: TravelLocation;
  scenarioDescription?: string;
}

export const DEFAULT_TRANSLATION_CONTEXT: TranslationContext = {
  scenarioDescription: 'Travel conversation in China.',
};

const LOCATION_HINTS: Record<TravelLocation, string> = {
  hotel: 'The conversation is taking place at a hotel (check-in, room, amenities).',
  restaurant: 'The conversation is taking place at a restaurant (ordering food, payment, dietary needs).',
  taxi: 'The conversation is taking place in a taxi or ride (directions, fare, drop-off).',
  shopping: 'The conversation is taking place while shopping (prices, sizes, payment).',
  airport: 'The conversation is taking place at an airport (check-in, security, gates, luggage).',
  general: 'Everyday travel conversation.',
};

function getLanguageDisplayName(code: LanguageCode): string {
  const lang = getLanguage(code);
  if (code === 'zh') {
    return 'Simplified Chinese (简体中文)';
  }
  return lang.nativeLabel !== lang.label ? `${lang.label} (${lang.nativeLabel})` : lang.label;
}

function getLanguagePairGuidance(sourceLanguage: LanguageCode, targetLanguage: LanguageCode): string {
  if (sourceLanguage === 'sk' && targetLanguage === 'zh') {
    return [
      'Translate into natural Simplified Chinese used in mainland China.',
      'Use conversational phrasing a native Chinese speaker would use in daily life.',
      'Preserve politeness level (formal vs casual) from the Slovak original.',
    ].join(' ');
  }

  if (sourceLanguage === 'zh' && targetLanguage === 'sk') {
    return [
      'Translate into natural conversational Slovak.',
      'Do not produce literal word-for-word Slovak.',
      'Preserve politeness, intent, and cultural meaning from the Chinese original.',
    ].join(' ');
  }

  if (targetLanguage === 'zh') {
    return 'Use natural Simplified Chinese (简体中文) suitable for mainland China.';
  }

  return 'Use natural phrasing that a native speaker of the target language would use in conversation.';
}

function buildContextBlock(context: TranslationContext): string {
  const parts: string[] = [];

  if (context.scenarioDescription) {
    parts.push(context.scenarioDescription);
  }

  if (context.situation) {
    parts.push(context.situation);
  }

  if (context.location) {
    parts.push(LOCATION_HINTS[context.location]);
  }

  parts.push(
    'The user is travelling in China. The translation should sound like a native speaker would say it in real life.',
  );

  return parts.join('\n');
}

export function buildTranslationSystemPrompt(
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
  context: TranslationContext = DEFAULT_TRANSLATION_CONTEXT,
): string {
  const sourceName = getLanguageDisplayName(sourceLanguage);
  const targetName = getLanguageDisplayName(targetLanguage);
  const pairGuidance = getLanguagePairGuidance(sourceLanguage, targetLanguage);
  const contextBlock = buildContextBlock(context);

  return [
    'You are Rabbitalk, a professional real-time travel translator.',
    '',
    `You translate naturally between ${sourceName} and ${targetName}.`,
    '',
    'Rules:',
    '- Never translate word-by-word.',
    '- Translate the meaning and intention.',
    '- Use natural expressions used by native speakers.',
    '- Optimize translations for real conversations while travelling.',
    '- Consider situations like hotels, restaurants, taxis, shopping, airports and everyday conversations in China.',
    '- Keep sentences short and clear.',
    '- Do not add explanations.',
    '- Do not include quotes.',
    '- Return only the translated sentence.',
    '',
    pairGuidance,
    '',
    'Context:',
    contextBlock,
  ].join('\n');
}

export function sanitizeTranslatedText(text: string): string {
  return text
    .trim()
    .replace(/^["'「『""]|["'」』""]$/u, '')
    .trim();
}
