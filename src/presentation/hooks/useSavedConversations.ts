import { useCallback, useEffect, useState } from 'react';
import type { ConversationSummary } from '@/domain/entities/SavedConversation';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';

export function useSavedConversations() {
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (query = searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await container.savedConversationUseCase.search(query);
      setSummaries(results);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void refresh(searchQuery);
    }, 200);
    return () => clearTimeout(timeout);
  }, [refresh, searchQuery]);

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    await container.savedConversationUseCase.toggleFavorite(id, isFavorite);
    await refresh(searchQuery);
  }, [refresh, searchQuery]);

  const deleteConversation = useCallback(async (id: string) => {
    await container.savedConversationUseCase.delete(id);
    await refresh(searchQuery);
  }, [refresh, searchQuery]);

  const deleteMany = useCallback(async (ids: string[]) => {
    await container.savedConversationUseCase.deleteMany(ids);
    await refresh(searchQuery);
  }, [refresh, searchQuery]);

  const deleteAll = useCallback(async () => {
    await container.savedConversationUseCase.deleteAll();
    await refresh(searchQuery);
  }, [refresh, searchQuery]);

  const favorites = summaries.filter((summary) => summary.isFavorite);
  const others = summaries.filter((summary) => !summary.isFavorite);

  return {
    summaries,
    favorites,
    others,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refresh,
    toggleFavorite,
    deleteConversation,
    deleteMany,
    deleteAll,
    clearError: () => setError(null),
  };
}
