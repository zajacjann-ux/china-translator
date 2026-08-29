import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { ConversationBubble } from '@/presentation/components/conversation/ConversationBubble';
import { Spacing } from '@/presentation/theme';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';
import type { LanguageCode } from '@/domain/entities/Language';

interface ConversationHistoryProps {
  messages: ConversationMessage[];
  userLanguage: LanguageCode;
  partnerLanguage: LanguageCode;
  onReplayMessage?: (message: ConversationMessage) => void;
  replayingMessageId?: string | null;
  replayDisabled?: boolean;
}

export function ConversationHistory({
  messages,
  userLanguage,
  partnerLanguage,
  onReplayMessage,
  replayingMessageId = null,
  replayDisabled = false,
}: ConversationHistoryProps) {
  const listRef = useRef<FlatList<ConversationMessage>>(null);

  const scrollToBottom = useCallback((animated: boolean) => {
    if (messages.length === 0) return;
    listRef.current?.scrollToEnd({ animated });
  }, [messages.length]);

  const liveScrollKey =
    messages.length > 0
      ? `${messages[messages.length - 1]?.originalText.length ?? 0}:${messages[messages.length - 1]?.translatedText.length ?? 0}`
      : '0';

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, liveScrollKey, scrollToBottom]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationMessage }) => (
      <ConversationBubble
        message={item}
        userLanguage={userLanguage}
        partnerLanguage={partnerLanguage}
        onReplay={onReplayMessage}
        isReplaying={replayingMessageId === item.id}
        replayDisabled={replayDisabled}
      />
    ),
    [onReplayMessage, partnerLanguage, replayDisabled, replayingMessageId, userLanguage],
  );

  const keyExtractor = useCallback((item: ConversationMessage) => item.id, []);

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText variant="caption" color="secondary" style={styles.emptyText}>
          Hold a button and speak to start the conversation
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      extraData={liveScrollKey}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      showsVerticalScrollIndicator
      onContentSizeChange={() => scrollToBottom(true)}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
});
