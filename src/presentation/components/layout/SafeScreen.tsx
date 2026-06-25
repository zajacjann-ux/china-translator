import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/presentation/components/ui/ThemedView';
import { Spacing } from '@/presentation/theme';

interface SafeScreenProps {
  children: ReactNode;
  padded?: boolean;
}

export function SafeScreen({ children, padded = true }: SafeScreenProps) {
  return (
    <ThemedView>
      <SafeAreaView style={[styles.container, padded && styles.padded]} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
