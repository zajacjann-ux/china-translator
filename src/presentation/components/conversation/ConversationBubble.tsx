import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';

interface ConversationBubbleProps {
  message: ConversationMessage;
  flag: string;
  onReplay?: (message: ConversationMessage) => void;
  isReplaying?: boolean;
  replayDisabled?: boolean;
}

function ConversationBubbleComponent({
  message,
  flag,
  onReplay,
  isReplaying = false,
  replayDisabled = false,
}: ConversationBubbleProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const isMe = message.speaker === 'me';
  const displayText = isMe ? message.originalText : message.translatedText;
  const canReplay =
    message.source !== 'camera' && Boolean(message.translatedText.trim() && onReplay);

  const handleReplay = () => {
    if (!canReplay || replayDisabled || isReplaying) return;
    onReplay?.(message);
  };

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
        <View style={styles.headerRow}>
          <ThemedText style={styles.flag}>{flag}</ThemedText>
          {canReplay && (
            <Pressable
              onPress={handleReplay}
              disabled={replayDisabled || isReplaying}
              style={({ pressed }) => [
                styles.replayButton,
                { opacity: replayDisabled ? 0.4 : pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Replay translation audio"
            >
              {isReplaying ? (
                <ActivityIndicator
                  size="small"
                  color={isMe ? palette.inverse : palette.primary}
                />
              ) : (
                <ThemedText style={[styles.replayIcon, isMe && styles.replayIconInverse]}>
                  🔊
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  flag: {
    fontSize: 16,
    lineHeight: 20,
  },
  replayButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  replayIconInverse: {
    opacity: 0.95,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
