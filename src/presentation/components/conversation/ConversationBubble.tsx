import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';

interface ConversationBubbleProps {
  message: ConversationMessage;
  flag: string;
}

function ConversationBubbleComponent({ message, flag }: ConversationBubbleProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const isMe = message.speaker === 'me';
  const displayText = isMe ? message.originalText : message.translatedText;

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowPartner]}>
      <View
        style={[
          styles.bubble,
          isMe
            ? { backgroundColor: palette.mic }
            : { backgroundColor: palette.surfaceElevated, borderColor: palette.border, borderWidth: 1 },
        ]}
      >
        <ThemedText style={styles.flag}>{flag}</ThemedText>
        <ThemedText
          variant="body"
          color={isMe ? 'inverse' : 'primary'}
          style={styles.text}
        >
          {displayText}
        </ThemedText>
      </View>
    </View>
  );
}

export const ConversationBubble = memo(ConversationBubbleComponent);

const styles = StyleSheet.create({
  row: {
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  rowMe: {
    alignItems: 'flex-end',
  },
  rowPartner: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  flag: {
    fontSize: 16,
    lineHeight: 20,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
