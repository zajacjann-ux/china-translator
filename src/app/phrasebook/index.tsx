import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { container } from '@/infrastructure/di/container';

export default function PhrasebookScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const categories = container.phrasebookUseCase.getCategories();

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ThemedText variant="subtitle">← Back</ThemedText>
          </Pressable>
          <ThemedText variant="title">Phrasebook</ThemedText>
          <ThemedText variant="caption" color="secondary">
            Offline phrases · tap category
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {categories.map((category) => (
            <Link key={category.id} href={`/phrasebook/${category.id}`} asChild>
              <Pressable
                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <ThemedText style={styles.icon}>{category.icon}</ThemedText>
                <ThemedText variant="subtitle">{category.title}</ThemedText>
              </Pressable>
            </Link>
          ))}
        </ScrollView>

        <Link href="/conversation" asChild>
          <Pressable style={styles.conversationLink}>
            <ThemedText variant="caption" color="secondary">
              💬 Conversation mode (coming soon)
            </ThemedText>
          </Pressable>
        </Link>
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
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  card: {
    width: '47%',
    minHeight: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
  },
  conversationLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
});
