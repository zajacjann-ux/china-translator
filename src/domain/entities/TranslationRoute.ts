import type { LanguageCode } from './Language';
import { getLanguage, makeDirection } from './Language';
import type { TranslationDirection } from './TranslationDirection';

export type SpeakerRole = 'user' | 'partner';

export interface TranslationRoute {
  id: string;
  direction: TranslationDirection;
  buttonLabel: string;
  buttonFlag: string;
  speaker: SpeakerRole;
}

export function buildSpeechRoutes(
  userLanguage: LanguageCode,
  partnerLanguage: LanguageCode,
): TranslationRoute[] {
  const user = getLanguage(userLanguage);
  const partner = getLanguage(partnerLanguage);

  return [
    {
      id: 'i-speak',
      direction: makeDirection(userLanguage, partnerLanguage),
      buttonLabel: 'I Speak',
      buttonFlag: user.flag,
      speaker: 'user',
    },
    {
      id: 'partner-speaks',
      direction: makeDirection(partnerLanguage, userLanguage),
      buttonLabel: 'Other Person Speaks',
      buttonFlag: partner.flag,
      speaker: 'partner',
    },
  ];
}
