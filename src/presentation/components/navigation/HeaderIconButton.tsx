import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors } from '@/presentation/theme';

const ICON_SIZE = 26;

type HeaderIconButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
} & (
  | { variant: 'emoji'; icon: string }
  | { variant: 'material'; icon: keyof typeof MaterialIcons.glyphMap }
);

export function HeaderIconButton(props: HeaderIconButtonProps) {
  const { label, onPress, disabled = false, loading = false } = props;
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? palette.surfaceElevated : palette.surface,
          borderColor: palette.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.primary} />
      ) : props.variant === 'material' ? (
        <MaterialIcons name={props.icon} size={ICON_SIZE} color={palette.text} />
      ) : (
        <ThemedText style={styles.emoji}>{props.icon}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 29,
  },
});
