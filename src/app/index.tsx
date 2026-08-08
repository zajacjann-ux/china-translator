import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { TranslationButton } from '@/presentation/components/ui/TranslationButton';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ConversationHistory } from '@/presentation/components/conversation/ConversationHistory';
import { TopNavigationBar } from '@/presentation/components/navigation/TopNavigationBar';
import { useVoiceTranslation } from '@/presentation/hooks/useVoiceTranslation';
import { useReplayTranslationAudio } from '@/presentation/hooks/useReplayTranslationAudio';
import { useImageAttachment } from '@/presentation/hooks/useImageAttachment';
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
  const {
    pickAndTranslate,
    isProcessing: isAttachmentProcessing,
    error: attachmentError,
    clearError: clearAttachmentError,
  } = useImageAttachment();

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
  const navDisabled = isRecording || isProcessing || isAttachmentProcessing;

  const isRouteBlocked = (routeId: string) =>
    isAttachmentProcessing ||
    ((isRecording || isProcessing) && activeRouteId !== null && activeRouteId !== routeId);

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <TopNavigationBar
          disabled={navDisabled}
          attachmentProcessing={isAttachmentProcessing}
          onPickAttachment={pickAndTranslate}
          onClearConversation={clearConversation}
          canClearConversation={messages.length > 0}
        />

        <ConversationHistory
          messages={messages}
          userLanguage={userLanguage}
          partnerLanguage={partnerLanguage}
          onReplayMessage={replayMessage}
          replayingMessageId={replayingMessageId}
          replayDisabled={navDisabled}
        />

        <View style={styles.bottomBar}>
          <View style={styles.buttonsRow}>
            <TranslationButton
              route={userRoute}
              isRecording={isRecording && activeRouteId === userRoute.id}
              isProcessing={isProcessing && activeRouteId === userRoute.id}
              disabled={isRouteBlocked(userRoute.id)}
              onPressIn={() => onPressIn(userRoute)}
              onPressOut={onPressOut}
            />

            <TranslationButton
              route={partnerRoute}
              isRecording={isRecording && activeRouteId === partnerRoute.id}
              isProcessing={isProcessing && activeRouteId === partnerRoute.id}
              disabled={isRouteBlocked(partnerRoute.id)}
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

        {attachmentError && (
          <View style={styles.footer}>
            <ErrorBanner message={attachmentError} onDismiss={clearAttachmentError} />
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
    gap: Spacing.sm,
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
