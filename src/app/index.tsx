import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { VoiceMicButton } from '@/presentation/components/ui/VoiceMicButton';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useVoiceTranslation } from '@/presentation/hooks/useVoiceTranslation';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLanguage, partnerLanguage, isReady } = useLanguagePair();
  const { error, isRecording, isProcessing, onPressIn, onPressOut, clearError } = useVoiceTranslation(
    userLanguage,
    partnerLanguage,
  );

  if (!isReady) {
    return (
      <SafeScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.mic} />
        </View>
      </SafeScreen>
    );
  }

  const statusText = isProcessing
    ? 'Translating…'
    : isRecording
      ? 'Listening…'
      : 'Hold to Speak';

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <LanguageSelector />

        <View style={styles.center}>
          <VoiceMicButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          />

          <ThemedText variant="subtitle" color="secondary" style={styles.status}>
            {statusText}
          </ThemedText>
        </View>

        {error && (
          <View style={styles.footer}>
            <ErrorBanner message={error} onDismiss={clearError} />
          </View>
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  status: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
