import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const visibleMessage = message.trim() || 'Something went wrong. Please try again.';
  const messageColor = scheme === 'dark' ? '#FEE2E2' : '#7F1D1D';

  return (
    <View
      style={[styles.container, { backgroundColor: palette.errorBackground, borderColor: palette.error }]}
      accessibilityRole="alert"
    >
      <ThemedText variant="body" color="error" style={[styles.message, { color: messageColor }]}>
        {visibleMessage}
      </ThemedText>
      {(onRetry || onDismiss) && (
        <View style={styles.actions}>
          {onRetry && (
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              hitSlop={8}
            >
              <ThemedText variant="caption" color="error" style={styles.action}>
                Retry
              </ThemedText>
            </Pressable>
          )}
          {onDismiss && (
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              hitSlop={8}
            >
              <ThemedText variant="caption" color="error" style={styles.action}>
                Dismiss
              </ThemedText>
            </Pressable>
          )}
        </View>
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
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 56,
  },
  message: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  action: {
    textDecorationLine: 'underline',
  },
});
