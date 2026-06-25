import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LanguageCode } from '@/domain/entities/Language';
import {
  DEFAULT_PARTNER_LANGUAGE,
  DEFAULT_USER_LANGUAGE,
  getLanguage,
} from '@/domain/entities/Language';
import { buildLanguagePair } from '@/domain/entities/TranslationDirection';
import { buildSpeechRoutes } from '@/domain/entities/TranslationRoute';
import {
  loadLanguagePair,
  saveLanguagePair,
} from '@/data/storage/LanguagePreferenceStorage';

interface LanguagePairContextValue {
  userLanguage: LanguageCode;
  partnerLanguage: LanguageCode;
  userLang: ReturnType<typeof getLanguage>;
  partnerLang: ReturnType<typeof getLanguage>;
  speechRoutes: ReturnType<typeof buildSpeechRoutes>;
  userToPartnerPair: ReturnType<typeof buildLanguagePair>;
  partnerToUserPair: ReturnType<typeof buildLanguagePair>;
  setUserLanguage: (code: LanguageCode) => void;
  setPartnerLanguage: (code: LanguageCode) => void;
  swapLanguages: () => void;
  isReady: boolean;
}

const LanguagePairContext = createContext<LanguagePairContextValue | null>(null);

export function LanguagePairProvider({ children }: { children: ReactNode }) {
  const [userLanguage, setUserLanguageState] = useState<LanguageCode>(DEFAULT_USER_LANGUAGE);
  const [partnerLanguage, setPartnerLanguageState] = useState<LanguageCode>(DEFAULT_PARTNER_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadLanguagePair().then((pair) => {
      setUserLanguageState(pair.userLanguage);
      setPartnerLanguageState(pair.partnerLanguage);
      setIsReady(true);
    });
  }, []);

  const persist = useCallback(async (user: LanguageCode, partner: LanguageCode) => {
    await saveLanguagePair({ userLanguage: user, partnerLanguage: partner });
  }, []);

  const setUserLanguage = useCallback(
    (code: LanguageCode) => {
      if (code === partnerLanguage) {
        setPartnerLanguageState(userLanguage);
        setUserLanguageState(code);
        void persist(code, userLanguage);
        return;
      }
      setUserLanguageState(code);
      void persist(code, partnerLanguage);
    },
    [partnerLanguage, persist, userLanguage],
  );

  const setPartnerLanguage = useCallback(
    (code: LanguageCode) => {
      if (code === userLanguage) {
        setUserLanguageState(partnerLanguage);
        setPartnerLanguageState(code);
        void persist(partnerLanguage, code);
        return;
      }
      setPartnerLanguageState(code);
      void persist(userLanguage, code);
    },
    [persist, userLanguage, partnerLanguage],
  );

  const swapLanguages = useCallback(() => {
    setUserLanguageState(partnerLanguage);
    setPartnerLanguageState(userLanguage);
    void persist(partnerLanguage, userLanguage);
  }, [partnerLanguage, persist, userLanguage]);

  const value = useMemo<LanguagePairContextValue>(() => {
    const userLang = getLanguage(userLanguage);
    const partnerLang = getLanguage(partnerLanguage);
    return {
      userLanguage,
      partnerLanguage,
      userLang,
      partnerLang,
      speechRoutes: buildSpeechRoutes(userLanguage, partnerLanguage),
      userToPartnerPair: buildLanguagePair(userLanguage, partnerLanguage),
      partnerToUserPair: buildLanguagePair(partnerLanguage, userLanguage),
      setUserLanguage,
      setPartnerLanguage,
      swapLanguages,
      isReady,
    };
  }, [
    isReady,
    partnerLanguage,
    setPartnerLanguage,
    setUserLanguage,
    swapLanguages,
    userLanguage,
  ]);

  return <LanguagePairContext.Provider value={value}>{children}</LanguagePairContext.Provider>;
}

export function useLanguagePair(): LanguagePairContextValue {
  const ctx = useContext(LanguagePairContext);
  if (!ctx) {
    throw new Error('useLanguagePair must be used within LanguagePairProvider');
  }
  return ctx;
}
