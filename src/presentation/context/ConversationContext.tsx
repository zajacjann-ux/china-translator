import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';
import { createConversationMessage } from '@/domain/entities/ConversationMessage';
import type { SavedConversation } from '@/domain/entities/SavedConversation';
import { createSavedConversation } from '@/domain/entities/SavedConversation';
import { buildFallbackConversationTitle } from '@/config/conversationTitle.config';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { container } from '@/infrastructure/di/container';
import { generateId } from '@/shared/utils/id';
import { logger } from '@/infrastructure/logging/logger';

const SAVE_DEBOUNCE_MS = 500;

interface ConversationContextValue {
  activeConversationId: string | null;
  messages: ConversationMessage[];
  conversationTitle: string;
  isPersistenceReady: boolean;
  appendMessage: (message: ConversationMessage) => void;
  updateMessage: (id: string, patch: Partial<ConversationMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  addCameraMessage: (originalText: string, translatedText: string) => void;
  startNewConversation: () => void;
  loadConversation: (conversation: SavedConversation) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { userLanguage, partnerLanguage, setUserLanguage, setPartnerLanguage } = useLanguagePair();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationTitle, setConversationTitle] = useState('New conversation');
  const [isFavorite, setIsFavorite] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRequestedRef = useRef(false);
  const messagesRef = useRef(messages);
  const titleRef = useRef(conversationTitle);
  const favoriteRef = useRef(isFavorite);
  const createdAtRef = useRef(createdAt);
  const activeIdRef = useRef(activeConversationId);
  const languagesRef = useRef({ userLanguage, partnerLanguage });

  messagesRef.current = messages;
  titleRef.current = conversationTitle;
  favoriteRef.current = isFavorite;
  createdAtRef.current = createdAt;
  activeIdRef.current = activeConversationId;
  languagesRef.current = { userLanguage, partnerLanguage };

  const persistNow = useCallback(async () => {
    const id = activeIdRef.current;
    const currentMessages = messagesRef.current;
    if (!id || currentMessages.length === 0) return;

    const now = new Date();
    const conversation = createSavedConversation({
      id,
      title: titleRef.current,
      createdAt: createdAtRef.current ?? now,
      updatedAt: now,
      sourceLanguage: languagesRef.current.userLanguage,
      targetLanguage: languagesRef.current.partnerLanguage,
      messages: currentMessages,
      isFavorite: favoriteRef.current,
    });

    try {
      await container.savedConversationUseCase.save(conversation);
    } catch (error) {
      logger.error('Failed to persist conversation', error);
    }
  }, []);

  const schedulePersist = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void persistNow();
    }, SAVE_DEBOUNCE_MS);
  }, [persistNow]);

  const requestTitleIfNeeded = useCallback((currentMessages: ConversationMessage[]) => {
    if (titleRequestedRef.current) return;
    const hasContent = currentMessages.some(
      (message) => message.translatedText.trim() || message.originalText.trim(),
    );
    if (!hasContent) return;

    titleRequestedRef.current = true;
    const fallback = buildFallbackConversationTitle(currentMessages);
    setConversationTitle(fallback);

    void container.generateConversationTitleUseCase
      .execute(currentMessages)
      .then((title) => {
        setConversationTitle(title);
        schedulePersist();
      })
      .catch(() => {
        // Fallback title already applied.
      });
  }, [schedulePersist]);

  const resetSession = useCallback(() => {
    const now = new Date();
    setActiveConversationId(generateId());
    setMessages([]);
    setConversationTitle('New conversation');
    setIsFavorite(false);
    setCreatedAt(now);
    titleRequestedRef.current = false;
  }, []);

  useEffect(() => {
    resetSession();
    setIsPersistenceReady(true);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [resetSession]);

  useEffect(() => {
    if (!isPersistenceReady || messages.length === 0) return;
    schedulePersist();
    requestTitleIfNeeded(messages);
  }, [isPersistenceReady, messages, schedulePersist, requestTitleIfNeeded]);

  useEffect(() => {
    if (!isPersistenceReady || messages.length === 0) return;
    schedulePersist();
  }, [conversationTitle, userLanguage, partnerLanguage, isFavorite, isPersistenceReady, messages.length, schedulePersist]);

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

  const startNewConversation = useCallback(() => {
    void persistNow();
    resetSession();
  }, [persistNow, resetSession]);

  const loadConversation = useCallback(
    (conversation: SavedConversation) => {
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages);
      setConversationTitle(conversation.title);
      setIsFavorite(conversation.isFavorite);
      setCreatedAt(conversation.createdAt);
      titleRequestedRef.current = true;
      setUserLanguage(conversation.sourceLanguage);
      setPartnerLanguage(conversation.targetLanguage);
    },
    [setPartnerLanguage, setUserLanguage],
  );

  const value = useMemo(
    () => ({
      activeConversationId,
      messages,
      conversationTitle,
      isPersistenceReady,
      appendMessage,
      updateMessage,
      removeMessage,
      clearMessages,
      addCameraMessage,
      startNewConversation,
      loadConversation,
    }),
    [
      activeConversationId,
      addCameraMessage,
      appendMessage,
      clearMessages,
      conversationTitle,
      isPersistenceReady,
      loadConversation,
      messages,
      removeMessage,
      startNewConversation,
      updateMessage,
    ],
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
