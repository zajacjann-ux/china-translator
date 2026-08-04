import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ConversationListItem } from '@/presentation/components/conversation/ConversationListItem';
import { useSavedConversations } from '@/presentation/hooks/useSavedConversations';
import { useConversation } from '@/presentation/context/ConversationContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';
import { container } from '@/infrastructure/di/container';
import type { ConversationSummary } from '@/domain/entities/SavedConversation';
import { getErrorMessage } from '@/shared/errors/AppError';

export default function ConversationsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { loadConversation } = useConversation();
  const {
    favorites,
    others,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    toggleFavorite,
    deleteConversation,
    deleteMany,
    deleteAll,
    clearError,
  } = useSavedConversations();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openingId, setOpeningId] = useState<string | null>(null);

  const allSummaries = [...favorites, ...others];

  const openConversation = useCallback(
    async (summary: ConversationSummary) => {
      Haptics.selectionAsync();
      setOpeningId(summary.id);
      try {
        const conversation = await container.savedConversationUseCase.getById(summary.id);
        if (!conversation) {
          Alert.alert('Not found', 'This conversation could not be loaded.');
          return;
        }
        loadConversation(conversation);
        router.back();
      } catch (err) {
        Alert.alert('Error', getErrorMessage(err));
      } finally {
        setOpeningId(null);
      }
    },
    [loadConversation, router],
  );

  const confirmDeleteOne = useCallback(
    (id: string) => {
      Alert.alert('Delete conversation', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteConversation(id),
        },
      ]);
    },
    [deleteConversation],
  );

  const confirmDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete selected',
      `Delete ${selectedIds.size} conversation${selectedIds.size === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteMany(Array.from(selectedIds)).then(() => {
              setSelectedIds(new Set());
              setSelectionMode(false);
            });
          },
        },
      ],
    );
  }, [deleteMany, selectedIds]);

  const confirmDeleteAll = useCallback(() => {
    if (allSummaries.length === 0) return;
    Alert.alert('Delete all conversations', 'This will permanently remove all saved chats.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: () => void deleteAll(),
      },
    ]);
  }, [allSummaries.length, deleteAll]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => (
      <ConversationListItem
        summary={item}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.id)}
        onPress={() => openConversation(item)}
        onLongPress={() => confirmDeleteOne(item.id)}
        onToggleFavorite={() => void toggleFavorite(item.id, !item.isFavorite)}
        onToggleSelect={() => toggleSelect(item.id)}
      />
    ),
    [confirmDeleteOne, openConversation, selectedIds, selectionMode, toggleFavorite, toggleSelect],
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search conversations…"
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.searchInput,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {favorites.length > 0 && !selectionMode && (
        <View style={styles.section}>
          <ThemedText variant="label" color="secondary" style={styles.sectionTitle}>
            ⭐ Favorites
          </ThemedText>
          <View style={styles.sectionList}>
            {favorites.map((item) => (
              <View key={item.id}>
                <ConversationListItem
                  summary={item}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onPress={() => openConversation(item)}
                  onLongPress={() => confirmDeleteOne(item.id)}
                  onToggleFavorite={() => void toggleFavorite(item.id, !item.isFavorite)}
                  onToggleSelect={() => toggleSelect(item.id)}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {others.length > 0 && favorites.length > 0 && !selectionMode && (
        <ThemedText variant="label" color="secondary" style={styles.sectionTitle}>
          All conversations
        </ThemedText>
      )}
    </View>
  );

  const displayData = selectionMode ? allSummaries : others;

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerAction}>
            <ThemedText variant="subtitle">← Back</ThemedText>
          </Pressable>
          <ThemedText variant="title" style={styles.headerTitle}>
            History
          </ThemedText>
          <Pressable
            onPress={() => {
              if (selectionMode) {
                setSelectionMode(false);
                setSelectedIds(new Set());
                return;
              }
              setSelectionMode(true);
            }}
            style={styles.headerAction}
          >
            <ThemedText variant="caption" color="secondary">
              {selectionMode ? 'Done' : 'Select'}
            </ThemedText>
          </Pressable>
        </View>

        {selectionMode && (
          <View style={styles.selectionBar}>
            <Pressable
              onPress={confirmDeleteSelected}
              disabled={selectedIds.size === 0}
              style={[styles.selectionButton, { opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
            >
              <ThemedText variant="caption" color="error">
                Delete ({selectedIds.size})
              </ThemedText>
            </Pressable>
            <Pressable onPress={confirmDeleteAll} style={styles.selectionButton}>
              <ThemedText variant="caption" color="error">
                Delete all
              </ThemedText>
            </Pressable>
          </View>
        )}

        {isLoading && allSummaries.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : allSummaries.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText variant="subtitle" color="secondary" style={styles.emptyTitle}>
              No conversations yet
            </ThemedText>
            <ThemedText variant="caption" color="secondary" style={styles.emptyText}>
              Your voice and camera translations will appear here automatically.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={selectionMode ? null : listHeader}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {openingId && (
          <View style={styles.openingOverlay}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        )}

        {error && (
          <View style={styles.errorWrap}>
            <ErrorBanner message={error} onDismiss={clearError} />
          </View>
        )}
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
    paddingBottom: Spacing.md,
    minHeight: 44,
  },
  headerAction: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
  },
  selectionButton: {
    minHeight: 36,
    justifyContent: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  listHeader: {
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionList: {
    gap: Spacing.sm,
  },
  listContent: {
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  separator: {
    height: Spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  openingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    marginTop: Spacing.sm,
  },
});
