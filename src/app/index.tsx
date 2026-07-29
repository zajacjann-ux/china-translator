import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { TranslationButton } from '@/presentation/components/ui/TranslationButton';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ConversationHistory } from '@/presentation/components/conversation/ConversationHistory';
import { ClearConversationButton } from '@/presentation/components/conversation/ClearConversationButton';
import { useVoiceTranslation } from '@/presentation/hooks/useVoiceTranslation';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { speechRoutes, userLang, partnerLang, isReady } = useLanguagePair();
  const {
    messages,
    error,
    isRecording,
    isProcessing,
    activeRouteId,
    onPressIn,
    onPressOut,
    clearError,
    clearConversation,
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
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <ClearConversationButton
            onClear={clearConversation}
            disabled={isRecording || isProcessing || messages.length === 0}
          />
        </View>

        <LanguageSelector />

        <ConversationHistory
          messages={messages}
          userFlag={userLang.flag}
          partnerFlag={partnerLang.flag}
        />

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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 40,
  },
  headerSpacer: {
    flex: 1,
  },
  buttons: {
    gap: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xs,
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
