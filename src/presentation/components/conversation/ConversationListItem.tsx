import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';
import type { ConversationSummary } from '@/domain/entities/SavedConversation';
import { getLanguage } from '@/domain/entities/Language';

interface ConversationListItemProps {
  summary: ConversationSummary;
  selectionMode?: boolean;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleFavorite: () => void;
  onToggleSelect?: () => void;
}

function formatDateTime(date: Date): { date: string; time: string } {
  return {
    date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

function ConversationListItemComponent({
  summary,
  selectionMode = false,
  selected = false,
  onPress,
  onLongPress,
  onToggleFavorite,
  onToggleSelect,
}: ConversationListItemProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const source = getLanguage(summary.sourceLanguage);
  const target = getLanguage(summary.targetLanguage);
  const { date, time } = formatDateTime(summary.updatedAt);

  return (
    <Pressable
      onPress={selectionMode ? onToggleSelect : onPress}
      onLongPress={selectionMode ? undefined : onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? palette.surfaceElevated : palette.surface,
          borderColor: selected ? palette.primary : palette.border,
        },
      ]}
    >
      {selectionMode && (
        <View style={[styles.checkbox, { borderColor: palette.border }]}>
          <ThemedText variant="caption">{selected ? '✓' : ''}</ThemedText>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText variant="subtitle" numberOfLines={1} style={styles.title}>
            {summary.title}
          </ThemedText>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            style={styles.starButton}
          >
            <ThemedText style={styles.star}>{summary.isFavorite ? '⭐' : '☆'}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <ThemedText variant="caption" color="secondary">
            {date} · {time}
          </ThemedText>
          <ThemedText variant="caption" color="secondary">
            {summary.messageCount} {summary.messageCount === 1 ? 'message' : 'messages'}
          </ThemedText>
        </View>

        <ThemedText variant="caption" color="secondary">
          {source.flag} → {target.flag}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export const ConversationListItem = memo(ConversationListItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
  },
  starButton: {
    minWidth: 28,
    alignItems: 'center',
  },
  star: {
    fontSize: 18,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});
