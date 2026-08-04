import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors } from '@/presentation/theme';

interface HistoryMenuButtonProps {
  disabled?: boolean;
}

export function HistoryMenuButton({ disabled = false }: HistoryMenuButtonProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/conversations' as Href);
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
          opacity: disabled ? 0.4 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Conversation history"
    >
      <ThemedText style={styles.icon}>☰</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
});
