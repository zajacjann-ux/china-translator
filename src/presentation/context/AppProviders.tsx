import type { ReactNode } from 'react';
import { LanguagePairProvider } from '@/presentation/context/LanguagePairContext';
import { VoiceTranslationModeProvider } from '@/presentation/context/VoiceTranslationModeContext';
import { ConversationProvider } from '@/presentation/context/ConversationContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * App-wide React context providers.
 *
 * Order matters:
 * - LanguagePairProvider: language pair for translation routes and persistence
 * - VoiceTranslationModeProvider: fast vs accurate voice mode preference
 * - ConversationProvider: in-memory chat + saved conversations (uses language pair)
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <LanguagePairProvider>
      <VoiceTranslationModeProvider>
        <ConversationProvider>{children}</ConversationProvider>
      </VoiceTranslationModeProvider>
    </LanguagePairProvider>
  );
}
