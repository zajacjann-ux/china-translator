import { useCallback, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { TranslationButton } from '@/presentation/components/ui/TranslationButton';
import { CameraModeButton } from '@/presentation/components/ui/CameraModeButton';
import { ResultDisplay } from '@/presentation/components/ui/ResultDisplay';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { RecentConversations } from '@/presentation/components/home/RecentConversations';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useTranslationFlow } from '@/presentation/hooks/useTranslationFlow';
import { useRecentConversations } from '@/presentation/hooks/useRecentConversations';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';
import { isApiKeyConfigured } from '@/infrastructure/config/env';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { speechRoutes } = useLanguagePair();
  const { conversations, refresh } = useRecentConversations(5);
  const {
    status,
    activePair,
    lastResult,
    error,
    isReplaying,
    copyFeedback,
    onPressIn,
    onPressOut,
    replaySpeech,
    copyTranslation,
    clearError,
  } = useTranslationFlow();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (lastResult) void refresh();
  }, [lastResult, refresh]);

  const isProcessing = status === 'processing';
  const isBusy = isProcessing || isReplaying;
  const apiKeyMissing = !isApiKeyConfigured();
  const showResult = Boolean(lastResult);

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <LanguageSelector />

        <View style={[styles.main, showResult && styles.mainCompact]}>
          <View style={styles.speechButtons}>
            {speechRoutes.map((route) => (
              <TranslationButton
                key={route.id}
                route={route}
                isRecording={activePair?.direction === route.direction && status === 'recording'}
                disabled={isBusy}
                onPressIn={() => onPressIn(route.direction)}
                onPressOut={onPressOut}
              />
            ))}
          </View>
          <CameraModeButton disabled={isBusy} />
        </View>

        {isProcessing && (
          <View style={styles.processing}>
            <ActivityIndicator size="large" color={palette.primary} />
            <ThemedText variant="subtitle" color="secondary">
              Translating…
            </ThemedText>
          </View>
        )}

        {apiKeyMissing && !showResult && (
          <ThemedText variant="caption" color="secondary" style={styles.setupText}>
            Add your OpenAI API key in .env
          </ThemedText>
        )}

        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        {showResult && lastResult && (
          <ResultDisplay
            result={lastResult}
            onReplay={replaySpeech}
            onCopy={copyTranslation}
            isReplaying={isReplaying}
            copyFeedback={copyFeedback}
          />
        )}

        <ScrollView style={styles.recent} showsVerticalScrollIndicator={false} onScrollEndDrag={refresh}>
          <RecentConversations conversations={conversations} onRefresh={refresh} />
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  main: {
    flex: 1,
    gap: Spacing.sm,
  },
  mainCompact: {
    flex: 0.55,
  },
  speechButtons: {
    flex: 1,
    gap: Spacing.sm,
  },
  processing: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  setupText: {
    textAlign: 'center',
  },
  recent: {
    flexShrink: 0,
    maxHeight: 220,
  },
});
