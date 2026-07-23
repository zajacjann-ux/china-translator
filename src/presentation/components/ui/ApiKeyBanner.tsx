import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { API_KEY_SETUP_MESSAGE } from '@/infrastructure/config/env';

export function ApiKeyBanner() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.errorBackground, borderColor: palette.error }]}
      accessibilityRole="alert"
    >
      <ThemedText variant="subtitle" color="error">
        API key required
      </ThemedText>
      <ThemedText variant="body" color="error" style={styles.message}>
        {API_KEY_SETUP_MESSAGE}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  message: {
    lineHeight: 22,
  },
});
