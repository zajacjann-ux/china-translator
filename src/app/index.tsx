import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { TextTranslationInput } from '@/presentation/components/ui/TextTranslationInput';
import { PrimaryButton } from '@/presentation/components/ui/PrimaryButton';
import { ResultDisplay } from '@/presentation/components/ui/ResultDisplay';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ApiKeyBanner } from '@/presentation/components/ui/ApiKeyBanner';
import { RecentConversations } from '@/presentation/components/home/RecentConversations';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useTextTranslation } from '@/presentation/hooks/useTextTranslation';
import { useRecentConversations } from '@/presentation/hooks/useRecentConversations';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing } from '@/presentation/theme';
import { APP_NAME } from '@/shared/constants';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLanguage, partnerLanguage, isReady } = useLanguagePair();
  const { conversations, refresh } = useRecentConversations(5);
  const {
    inputText,
    setInputText,
    lastResult,
    isTranslating,
    isReplaying,
    copyFeedback,
    error,
    translate,
    replaySpeech,
    copyTranslation,
    clearError,
    apiKeyMissing,
  } = useTextTranslation(userLanguage, partnerLanguage);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (lastResult) void refresh();
  }, [lastResult, refresh]);

  if (!isReady) {
    return (
      <SafeScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </SafeScreen>
    );
  }

  const isBusy = isTranslating || isReplaying;

  return (
    <SafeScreen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.container}>
          <ThemedText variant="caption" color="secondary" style={styles.appName}>
            {APP_NAME}
          </ThemedText>

          <LanguageSelector />

          {apiKeyMissing && <ApiKeyBanner />}

          <TextTranslationInput
            value={inputText}
            onChangeText={setInputText}
            sourceLanguage={userLanguage}
            editable={!isBusy}
          />

          <PrimaryButton
            label="Translate"
            onPress={translate}
            loading={isTranslating}
            disabled={isBusy || apiKeyMissing || !inputText.trim()}
          />

          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {lastResult && (
            <ResultDisplay
              result={lastResult}
              onReplay={replaySpeech}
              onCopy={copyTranslation}
              isReplaying={isReplaying}
              copyFeedback={copyFeedback}
            />
          )}

          <ScrollView style={styles.recent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <RecentConversations conversations={conversations} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  appName: {
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recent: {
    flexShrink: 0,
    maxHeight: 180,
  },
});
