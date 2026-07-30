import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';
import { createConversationMessage } from '@/domain/entities/ConversationMessage';

interface ConversationContextValue {
  messages: ConversationMessage[];
  appendMessage: (message: ConversationMessage) => void;
  updateMessage: (id: string, patch: Partial<ConversationMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  addCameraMessage: (originalText: string, translatedText: string) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const appendMessage = useCallback((message: ConversationMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ConversationMessage>) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const addCameraMessage = useCallback((originalText: string, translatedText: string) => {
    const message = createConversationMessage({
      speaker: 'partner',
      originalText,
      translatedText,
      source: 'camera',
    });
    setMessages((prev) => [...prev, message]);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      appendMessage,
      updateMessage,
      removeMessage,
      clearMessages,
      addCameraMessage,
    }),
    [addCameraMessage, appendMessage, clearMessages, messages, removeMessage, updateMessage],
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversation(): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error('useConversation must be used within ConversationProvider');
  }
  return ctx;
}
