import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import { getLanguage } from '@/domain/entities/Language';

const MODE_LABEL: Record<string, string> = {
  speech: '🎤',
  camera: '📷',
  phrasebook: '📖',
  conversation: '💬',
};

interface RecentConversationsProps {
  conversations: TranslationResult[];
  onRefresh?: () => void;
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  if (conversations.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText variant="label" color="secondary">
          Recent conversations
        </ThemedText>
        <ThemedText variant="caption" color="secondary">
          Your translations will appear here
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText variant="label" color="secondary">
        Recent conversations
      </ThemedText>
      <View style={styles.list}>
        {conversations.map((item) => {
          const source = getLanguage(item.sourceLanguage);
          const target = getLanguage(item.targetLanguage);
          return (
            <View
              key={item.id}
              style={[styles.item, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.itemHeader}>
                <ThemedText variant="caption" color="secondary">
                  {MODE_LABEL[item.mode] ?? '·'} {source.flag} → {target.flag}
                </ThemedText>
              </View>
              <ThemedText variant="body" numberOfLines={2} style={styles.original}>
                {item.originalText}
              </ThemedText>
              <ThemedText variant="body" numberOfLines={2} style={styles.translated}>
                {item.translatedText}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  empty: {
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
    maxHeight: 200,
  },
  item: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
  },
  original: {
    fontSize: 14,
    opacity: 0.85,
  },
  translated: {
    fontSize: 15,
    fontWeight: '600',
  },
});
