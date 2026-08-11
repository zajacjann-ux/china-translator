import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';
import type { ConversationMessage } from '@/domain/entities/ConversationMessage';
import { resolveMessageLanguages } from '@/domain/entities/ConversationMessage';
import type { LanguageCode } from '@/domain/entities/Language';
import { getLanguage } from '@/domain/entities/Language';

const BUBBLE_COLORS = {
  me: '#123F35',
  partner: '#102A4C',
} as const;

const BUBBLE_DIVIDER = 'rgba(255,255,255,0.22)';

interface ConversationBubbleProps {
  message: ConversationMessage;
  userLanguage: LanguageCode;
  partnerLanguage: LanguageCode;
  onReplay?: (message: ConversationMessage) => void;
  isReplaying?: boolean;
  replayDisabled?: boolean;
}

interface MessageTextBlockProps {
  flag: string;
  languageLabel: string;
  text: string;
  isMe: boolean;
}

function MessageTextBlock({ flag, languageLabel, text, isMe }: MessageTextBlockProps) {
  return (
    <View style={styles.textBlock}>
      <View style={styles.langRow}>
        <ThemedText style={styles.flag}>{flag}</ThemedText>
        <ThemedText
          variant="caption"
          color="inverse"
          style={[styles.langLabel, styles.langLabelOnBubble]}
        >
          {languageLabel}
        </ThemedText>
      </View>
      {text.trim() ? (
        <ThemedText
          variant="body"
          color="inverse"
          style={styles.messageText}
        >
          {text}
        </ThemedText>
      ) : null}
    </View>
  );
}

function ConversationBubbleComponent({
  message,
  userLanguage,
  partnerLanguage,
  onReplay,
  isReplaying = false,
  replayDisabled = false,
}: ConversationBubbleProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const isMe = message.speaker === 'me';
  const { sourceLanguage, targetLanguage } = resolveMessageLanguages(
    message,
    userLanguage,
    partnerLanguage,
  );
  const sourceLang = getLanguage(sourceLanguage);
  const targetLang = getLanguage(targetLanguage);
  const canReplay =
    message.source !== 'camera' &&
    Boolean(message.audioUri && message.translatedText.trim() && onReplay);

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
            ? { backgroundColor: BUBBLE_COLORS.me }
            : { backgroundColor: BUBBLE_COLORS.partner },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
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
                <ActivityIndicator size="small" color={palette.primaryText} />
              ) : (
                <ThemedText style={[styles.replayIcon, styles.replayIconOnBubble]}>
                  🔊
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>

        <MessageTextBlock
          flag={sourceLang.flag}
          languageLabel={sourceLang.label}
          text={message.originalText}
          isMe={isMe}
        />

        <View style={[styles.divider, { backgroundColor: BUBBLE_DIVIDER }]} />

        <MessageTextBlock
          flag={targetLang.flag}
          languageLabel={targetLang.label}
          text={message.translatedText}
          isMe={isMe}
        />
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
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 36,
  },
  headerSpacer: {
    flex: 1,
  },
  textBlock: {
    gap: Spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  flag: {
    fontSize: 14,
    lineHeight: 18,
  },
  langLabel: {
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  langLabelOnBubble: {
    opacity: 0.85,
  },
  messageText: {
    fontSize: 19,
    lineHeight: 26,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  replayButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayIcon: {
    fontSize: 26,
    lineHeight: 28,
  },
  replayIconOnBubble: {
    opacity: 0.95,
  },
});
