import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { Spacing } from '@/presentation/theme';

export default function NotFoundScreen() {
  return (
    <SafeScreen>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <ThemedText variant="title">Page not found</ThemedText>
        <Link href="/">
          <ThemedText variant="body" color="secondary">
            Go to home
          </ThemedText>
        </Link>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
});
