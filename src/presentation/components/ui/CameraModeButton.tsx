import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing, Typography } from '@/presentation/theme';

interface CameraModeButtonProps {
  disabled?: boolean;
}

export function CameraModeButton({ disabled = false }: CameraModeButtonProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/camera');
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? palette.surfaceElevated : palette.surface,
            borderColor: palette.border,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Translate with camera"
      >
        <ThemedText style={styles.icon}>📷</ThemedText>
        <ThemedText variant="button" style={styles.label}>
          Translate with Camera
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 100,
  },
  button: {
    flex: 1,
    minHeight: 100,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 40,
    lineHeight: 48,
  },
  label: {
    ...Typography.button,
    fontSize: 22,
    textAlign: 'center',
  },
});
