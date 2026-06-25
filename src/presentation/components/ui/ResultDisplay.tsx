import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { ActionButton } from '@/presentation/components/ui/ActionButton';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import { getLanguage } from '@/domain/entities/Language';

interface ResultDisplayProps {
  result: TranslationResult;
  onReplay: () => void;
  onCopy: () => void;
  isReplaying?: boolean;
  copyFeedback?: boolean;
}

export function ResultDisplay({
  result,
  onReplay,
  onCopy,
  isReplaying = false,
  copyFeedback = false,
}: ResultDisplayProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const source = getLanguage(result.sourceLanguage);
  const target = getLanguage(result.targetLanguage);

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.section}>
        <ThemedText variant="label" color="secondary">
          {source.flag} Original
        </ThemedText>
        <ThemedText variant="body" style={styles.text}>
          {result.originalText}
        </ThemedText>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.section}>
        <ThemedText variant="label" color="secondary">
          {target.flag} Translation
        </ThemedText>
        <ThemedText variant="body" style={styles.text}>
          {result.translatedText}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <ActionButton label={isReplaying ? 'Playing…' : 'Replay speech'} onPress={onReplay} disabled={isReplaying} />
        <ActionButton label={copyFeedback ? 'Copied!' : 'Copy text'} onPress={onCopy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
  },
  text: {
    fontSize: 20,
    lineHeight: 30,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
