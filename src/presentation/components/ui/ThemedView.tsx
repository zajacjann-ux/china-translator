import { View, type ViewProps } from 'react-native';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors } from '@/presentation/theme';

interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'elevated';
}

export function ThemedView({ variant = 'background', style, ...props }: ThemedViewProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const backgroundColor =
    variant === 'surface'
      ? palette.surface
      : variant === 'elevated'
        ? palette.surfaceElevated
        : palette.background;

  return <View style={[{ backgroundColor, flex: 1 }, style]} {...props} />;
}
