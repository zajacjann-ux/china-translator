import { useMemo } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Typography } from '@/presentation/theme';

type ThemedTextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'button';

interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  color?: 'primary' | 'secondary' | 'error' | 'inverse';
}

export function ThemedText({
  variant = 'body',
  color = 'primary',
  style,
  ...props
}: ThemedTextProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const textColor = useMemo(() => {
    switch (color) {
      case 'secondary':
        return palette.textSecondary;
      case 'error':
        return palette.error;
      case 'inverse':
        return palette.primaryText;
      default:
        return palette.text;
    }
  }, [color, palette]);

  return (
    <Text
      style={[styles.base, Typography[variant], { color: textColor }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
