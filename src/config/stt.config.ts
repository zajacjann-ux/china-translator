import type { LanguageCode } from '@/domain/entities/Language';
import { getLanguage } from '@/domain/entities/Language';

/**
 * Short context prompts improve Whisper accuracy for travel vocabulary
 * without adding measurable latency (sent as a lightweight API parameter).
 */
const WHISPER_PROMPTS: Partial<Record<LanguageCode, string>> = {
  sk: 'Cestovná konverzácia. Slovenčina. hotel, reštaurácia, taxi, letisko, cena, prosím, ďakujem.',
  en: 'Travel conversation in English. hotel, restaurant, taxi, airport, price, please, thank you.',
  de: 'Reisegespräch auf Deutsch. Hotel, Restaurant, Taxi, Flughafen, Preis, bitte, danke.',
  zh: '旅行对话。中文。酒店，餐厅，出租车，机场，价格，请问，谢谢。',
  id: 'Percakapan perjalanan dalam Bahasa Indonesia. hotel, restoran, taksi, bandara, harga, tolong, terima kasih.',
};

const GENERIC_TRAVEL_PROMPT =
  'Travel conversation. hotel, restaurant, taxi, airport, menu, price, directions, please, thank you.';

/** Whisper `temperature` — 0 reduces random hallucinations in short utterances. */
export const WHISPER_TEMPERATURE = 0;

export function getWhisperPrompt(languageCode: LanguageCode): string {
  const specific = WHISPER_PROMPTS[languageCode];
  if (specific) return specific;

  const lang = getLanguage(languageCode);
  return `${GENERIC_TRAVEL_PROMPT} Language: ${lang.nativeLabel}.`;
}
