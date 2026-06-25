import { useCallback, useEffect, useState } from 'react';
import type { TranslationResult } from '@/domain/entities/TranslationResult';
import { container } from '@/infrastructure/di/container';

export function useRecentConversations(limit = 5) {
  const [conversations, setConversations] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await container.conversationHistoryRepository.getRecentConversations(limit);
      setConversations(items);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { conversations, isLoading, refresh };
}
