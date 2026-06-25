import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.errorBackground, borderColor: palette.error }]}
      accessibilityRole="alert"
    >
      <ThemedText variant="body" color="error" style={styles.message}>
        {message}
      </ThemedText>
      {onDismiss && (
        <ThemedText variant="caption" color="error" style={styles.dismiss} onPress={onDismiss}>
          Dismiss
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
  },
  dismiss: {
    textDecorationLine: 'underline',
    alignSelf: 'flex-end',
  },
});
