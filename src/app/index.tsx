import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { TranslationButton } from '@/presentation/components/ui/TranslationButton';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ConversationHistory } from '@/presentation/components/conversation/ConversationHistory';
import { ClearConversationButton } from '@/presentation/components/conversation/ClearConversationButton';
import { CameraHeaderButton } from '@/presentation/components/conversation/CameraHeaderButton';
import { HistoryMenuButton } from '@/presentation/components/conversation/HistoryMenuButton';
import { useVoiceTranslation } from '@/presentation/hooks/useVoiceTranslation';
import { useReplayTranslationAudio } from '@/presentation/hooks/useReplayTranslationAudio';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { speechRoutes, userLang, partnerLang, userLanguage, partnerLanguage, isReady } =
    useLanguagePair();
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
  const {
    replayMessage,
    replayingMessageId,
    replayError,
    clearReplayError,
  } = useReplayTranslationAudio(userLanguage, partnerLanguage);

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
          <View style={styles.headerLeft}>
            <HistoryMenuButton disabled={isRecording || isProcessing} />
            <CameraHeaderButton disabled={isRecording || isProcessing} />
          </View>
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
          onReplayMessage={replayMessage}
          replayingMessageId={replayingMessageId}
          replayDisabled={isRecording || isProcessing}
        />

        <View style={styles.bottomBar}>
          <View style={styles.buttonsRow}>
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
        </View>

        {error && (
          <View style={styles.footer}>
            <ErrorBanner message={error} onDismiss={clearError} />
          </View>
        )}

        {replayError && (
          <View style={styles.footer}>
            <ErrorBanner message={replayError} onDismiss={clearReplayError} />
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
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerSpacer: {
    flex: 1,
  },
  bottomBar: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
