import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { TranslationButton } from '@/presentation/components/ui/TranslationButton';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { useVoiceTranslation } from '@/presentation/hooks/useVoiceTranslation';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { speechRoutes, isReady } = useLanguagePair();
  const {
    error,
    isRecording,
    isProcessing,
    activeRouteId,
    onPressIn,
    onPressOut,
    clearError,
  } = useVoiceTranslation();

  if (!isReady) {
    return (
      <SafeScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.mic} />
        </View>
      </SafeScreen>
    );
  }

  const [userRoute, partnerRoute] = speechRoutes;

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <LanguageSelector />

        <View style={styles.buttons}>
          <TranslationButton
            route={userRoute}
            isRecording={isRecording && activeRouteId === userRoute.id}
            isProcessing={isProcessing && activeRouteId === userRoute.id}
            disabled={isProcessing || (isRecording && activeRouteId !== userRoute.id)}
            onPressIn={() => onPressIn(userRoute)}
            onPressOut={onPressOut}
          />

          <TranslationButton
            route={partnerRoute}
            isRecording={isRecording && activeRouteId === partnerRoute.id}
            isProcessing={isProcessing && activeRouteId === partnerRoute.id}
            disabled={isProcessing || (isRecording && activeRouteId !== partnerRoute.id)}
            onPressIn={() => onPressIn(partnerRoute)}
            onPressOut={onPressOut}
          />
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
    gap: Spacing.md,
  },
  buttons: {
    flex: 1,
    gap: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
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
