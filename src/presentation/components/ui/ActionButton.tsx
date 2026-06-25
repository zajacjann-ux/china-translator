import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function ActionButton({ label, onPress, disabled = false }: ActionButtonProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? palette.surfaceElevated : palette.surface,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <ThemedText variant="subtitle" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  label: {
    textAlign: 'center',
  },
});
