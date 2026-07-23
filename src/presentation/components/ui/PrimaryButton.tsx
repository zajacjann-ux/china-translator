import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing, Typography } from '@/presentation/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({ label, onPress, disabled = false, loading = false }: PrimaryButtonProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled
            ? palette.primary
            : pressed
              ? palette.primaryPressed
              : palette.primary,
          opacity: isDisabled ? 0.55 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={palette.primaryText} />
      ) : (
        <ThemedText variant="button" color="inverse" style={styles.label}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  label: {
    ...Typography.button,
    fontSize: 20,
  },
});
