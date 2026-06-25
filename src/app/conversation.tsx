import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';

export default function ConversationModeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ThemedText variant="subtitle">← Back</ThemedText>
        </Pressable>

        <ThemedText variant="title" style={styles.title}>
          Conversation Mode
        </ThemedText>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <ThemedText style={styles.emoji}>💬</ThemedText>
          <ThemedText variant="subtitle" style={styles.cardTitle}>
            Coming soon
          </ThemedText>
          <ThemedText variant="body" color="secondary" style={styles.description}>
            Place the phone on the table. The app will automatically listen and speak for both people — no button
            presses required.
          </ThemedText>
        </View>

        <ThemedText variant="caption" color="secondary" style={styles.arch}>
          Architecture prepared: ConversationModeUseCase with VAD turn detection, auto STT → translate → TTS loop.
        </ThemedText>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    textAlign: 'center',
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 48,
  },
  cardTitle: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 26,
  },
  arch: {
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
