import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { Spacing } from '@/presentation/theme';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ThemedText variant="subtitle">← Back</ThemedText>
          </Pressable>
          <ThemedText variant="title">Settings</ThemedText>
          <View style={styles.back} />
        </View>

        <ThemedText variant="body" color="secondary" style={styles.placeholder}>
          App settings will appear here.
        </ThemedText>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    minHeight: 44,
  },
  back: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  placeholder: {
    lineHeight: 22,
  },
});
