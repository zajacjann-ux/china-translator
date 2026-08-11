import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { useVoiceTranslationMode } from '@/presentation/context/VoiceTranslationModeContext';
import type { VoiceTranslationMode } from '@/domain/entities/VoiceTranslationMode';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';

const OPTIONS: Array<{
  mode: VoiceTranslationMode;
  icon: string;
  label: string;
  shortLabel: string;
  hint: string;
}> = [
  {
    mode: 'conversation',
    icon: '🗣️',
    label: 'Rozprávanie',
    shortLabel: 'Rozprávanie',
    hint: 'Voice conversation with translated speech playback',
  },
  {
    mode: 'chat',
    icon: '💬',
    label: 'Chat',
    shortLabel: 'Chat',
    hint: 'Live text translation while speaking — no audio output',
  },
];

interface VoiceTranslationModeSelectorProps {
  variant?: 'inline' | 'panel';
  disabled?: boolean;
}

function VoiceTranslationModeSelectorComponent({
  variant = 'panel',
  disabled = false,
}: VoiceTranslationModeSelectorProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { mode, setMode } = useVoiceTranslationMode();
  const isInline = variant === 'inline';

  return (
    <View style={[styles.container, isInline && styles.containerInline]}>
      {!isInline && (
        <ThemedText variant="label" color="secondary" style={styles.title}>
          Translation mode
        </ThemedText>
      )}

      <View style={[styles.row, isInline && styles.rowInline]}>
        {OPTIONS.map((option) => {
          const selected = mode === option.mode;
          return (
            <Pressable
              key={option.mode}
              onPress={() => setMode(option.mode)}
              disabled={disabled}
              style={({ pressed }) => [
                isInline ? styles.optionInline : styles.optionPanel,
                {
                  backgroundColor: selected ? palette.primary : palette.surfaceElevated,
                  borderColor: selected ? palette.primary : palette.border,
                  opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={option.label}
            >
              <ThemedText style={styles.icon}>{option.icon}</ThemedText>
              <ThemedText
                variant="label"
                color={selected ? 'inverse' : 'primary'}
                style={isInline ? styles.optionLabelInline : styles.optionLabelPanel}
                numberOfLines={1}
              >
                {isInline ? option.shortLabel : option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {!isInline && (
        <ThemedText variant="caption" color="secondary" style={styles.hint}>
          {OPTIONS.find((option) => option.mode === mode)?.hint}
        </ThemedText>
      )}
    </View>
  );
}

export const VoiceTranslationModeSelector = memo(VoiceTranslationModeSelectorComponent);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  containerInline: {
    gap: 0,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rowInline: {
    gap: Spacing.xs,
  },
  optionPanel: {
    flex: 1,
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  optionInline: {
    flex: 1,
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    lineHeight: 20,
  },
  optionLabelPanel: {
    fontSize: 13,
    textAlign: 'center',
  },
  optionLabelInline: {
    fontSize: 13,
  },
  hint: {
    lineHeight: 18,
  },
});
