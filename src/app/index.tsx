import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { VoiceMicButton } from '@/presentation/components/ui/VoiceMicButton';
import { TranslationResultCard } from '@/presentation/components/ui/TranslationResultCard';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useVoiceTranslation } from '@/presentation/hooks/useVoiceTranslation';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';
import { APP_NAME } from '@/shared/constants';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLanguage, partnerLanguage, isReady } = useLanguagePair();
  const {
    lastResult,
    error,
    isRecording,
    isProcessing,
    onPressIn,
    onPressOut,
    clearError,
  } = useVoiceTranslation(userLanguage, partnerLanguage);

  if (!isReady) {
    return (
      <SafeScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.mic} />
        </View>
      </SafeScreen>
    );
  }

  const hintText = isProcessing
    ? 'Translating…'
    : isRecording
      ? 'Release to translate'
      : 'Hold to Speak';

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <ThemedText variant="caption" color="secondary" style={styles.appName}>
          {APP_NAME}
        </ThemedText>

        <LanguageSelector />

        <View style={styles.center}>
          <VoiceMicButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          />

          <ThemedText variant="subtitle" color="secondary" style={styles.hint}>
            {hintText}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {lastResult && !isProcessing && (
            <TranslationResultCard
              translatedText={lastResult.translatedText}
              targetLanguage={lastResult.targetLanguage}
            />
          )}
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  appName: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  hint: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
