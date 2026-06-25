import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing, Typography } from '@/presentation/theme';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TranslationButtonProps {
  route: TranslationRoute;
  isRecording?: boolean;
  disabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function TranslationButton({
  route,
  isRecording = false,
  disabled = false,
  onPressIn,
  onPressOut,
}: TranslationButtonProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(withTiming(1.03, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
        false,
      );
      ringScale.value = withRepeat(
        withSequence(withTiming(1.18, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.45, { duration: 650 }), withTiming(0.08, { duration: 650 })),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      scale.value = withTiming(1, { duration: 180 });
      ringScale.value = withTiming(1, { duration: 180 });
      ringOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [isRecording, ringOpacity, ringScale, scale]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressIn?.();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut?.();
  };

  const backgroundColor = isRecording
    ? palette.recording
    : disabled
      ? palette.primary
      : palette.primary;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          { backgroundColor: palette.recording },
          animatedRingStyle,
        ]}
      />
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          animatedButtonStyle,
          {
            backgroundColor: isRecording
              ? palette.recording
              : pressed
                ? palette.primaryPressed
                : backgroundColor,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${route.buttonLabel}. Press and hold to speak.`}
        accessibilityHint="Hold while speaking, release to translate"
      >
        <ThemedText variant="button" color="inverse" style={styles.flag}>
          {route.buttonFlag}
        </ThemedText>
        <ThemedText variant="button" color="inverse" style={styles.label}>
          {route.buttonLabel}
        </ThemedText>
        {isRecording && (
          <ThemedText variant="caption" color="inverse" style={styles.hint}>
            Release to translate
          </ThemedText>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    minHeight: 160,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
  },
  button: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 160,
  },
  flag: {
    fontSize: 56,
    lineHeight: 64,
  },
  label: {
    ...Typography.button,
    fontSize: 26,
    textAlign: 'center',
  },
  hint: {
    opacity: 0.9,
    textAlign: 'center',
  },
});
