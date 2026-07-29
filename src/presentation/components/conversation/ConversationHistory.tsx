import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { ConversationBubble } from '@/presentation/components/conversation/ConversationBubble';
import { Spacing } from '@/presentation/theme';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';

interface ConversationHistoryProps {
  messages: ConversationMessage[];
  userFlag: string;
  partnerFlag: string;
}

export function ConversationHistory({ messages, userFlag, partnerFlag }: ConversationHistoryProps) {
  const listRef = useRef<FlatList<ConversationMessage>>(null);

  const scrollToBottom = useCallback((animated: boolean) => {
    if (messages.length === 0) return;
    listRef.current?.scrollToEnd({ animated });
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationMessage }) => (
      <ConversationBubble
        message={item}
        flag={item.speaker === 'me' ? userFlag : partnerFlag}
      />
    ),
    [partnerFlag, userFlag],
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
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      showsVerticalScrollIndicator
      onContentSizeChange={() => scrollToBottom(messages.length > 1)}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingVertical: Spacing.sm,
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
