import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { getLanguage } from '@/domain/entities/Language';

interface TranslationResultCardProps {
  translatedText: string;
  targetLanguage: string;
}

export function TranslationResultCard({ translatedText, targetLanguage }: TranslationResultCardProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const target = getLanguage(targetLanguage);

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <ThemedText variant="caption" color="secondary">
        {target.flag} {target.label}
      </ThemedText>
      <ThemedText variant="body" style={styles.text}>
        {translatedText}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    maxWidth: 340,
    width: '100%',
  },
  text: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
});
