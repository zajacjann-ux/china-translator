import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_VOICE_TRANSLATION_MODE,
  type VoiceTranslationMode,
} from '@/domain/entities/VoiceTranslationMode';
import {
  loadVoiceTranslationMode,
  saveVoiceTranslationMode,
} from '@/data/storage/VoiceTranslationModeStorage';

interface VoiceTranslationModeContextValue {
  mode: VoiceTranslationMode;
  setMode: (mode: VoiceTranslationMode) => void;
  isReady: boolean;
}

const VoiceTranslationModeContext = createContext<VoiceTranslationModeContextValue | null>(null);

export function VoiceTranslationModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<VoiceTranslationMode>(DEFAULT_VOICE_TRANSLATION_MODE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadVoiceTranslationMode().then((storedMode) => {
      setModeState(storedMode);
      setIsReady(true);
    });
  }, []);

  const setMode = useCallback((nextMode: VoiceTranslationMode) => {
    setModeState(nextMode);
    void saveVoiceTranslationMode(nextMode);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isReady,
    }),
    [isReady, mode, setMode],
  );

  return (
    <VoiceTranslationModeContext.Provider value={value}>
      {children}
    </VoiceTranslationModeContext.Provider>
  );
}

export function useVoiceTranslationMode(): VoiceTranslationModeContextValue {
  const ctx = useContext(VoiceTranslationModeContext);
  if (!ctx) {
    throw new Error('useVoiceTranslationMode must be used within VoiceTranslationModeProvider');
  }
  return ctx;
}
