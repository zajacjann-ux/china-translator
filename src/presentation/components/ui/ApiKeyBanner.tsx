import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { API_KEY_MISSING_MESSAGE } from '@/infrastructure/config/env';

export function ApiKeyBanner() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}
      accessibilityRole="text"
    >
      <ThemedText variant="body" color="secondary" style={styles.message}>
        {API_KEY_MISSING_MESSAGE}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
