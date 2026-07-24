import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
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
import { Colors, Spacing, Typography } from '@/presentation/theme';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';
import { MIC_BUTTON_SIZE } from '@/presentation/components/ui/VoiceMicButton';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TranslationButtonProps {
  route: TranslationRoute;
  isRecording?: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function TranslationButton({
  route,
  isRecording = false,
  isProcessing = false,
  disabled = false,
  onPressIn,
  onPressOut,
}: TranslationButtonProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const isUser = route.speaker === 'user';
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  const idleColor = isUser ? palette.mic : palette.primary;
  const pressedColor = isUser ? palette.micPressed : palette.primaryPressed;
  const recordingColor = isUser ? palette.micRecording : '#60A5FA';
  const glowColor = isUser ? palette.micGlow : 'rgba(59, 130, 246, 0.35)';
  const shadowColor = isUser ? '#22C55E' : '#3B82F6';

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
        false,
      );
      ringScale.value = withRepeat(
        withSequence(withTiming(1.28, { duration: 650 }), withTiming(1.08, { duration: 650 })),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.45, { duration: 650 }), withTiming(0.1, { duration: 650 })),
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
    if (disabled || isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressIn?.();
  };

  const handlePressOut = () => {
    if (disabled || isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut?.();
  };

  const buttonColor = isRecording ? recordingColor : idleColor;
  const hintText = isProcessing
    ? 'Translating…'
    : isRecording
      ? 'Release to translate'
      : 'Press and hold';

  return (
    <View style={styles.wrapper}>
      <View style={styles.circleArea}>
        {isRecording && (
          <Animated.View
            pointerEvents="none"
            style={[styles.pulseRing, { backgroundColor: glowColor }, animatedRingStyle]}
          />
        )}
        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isProcessing}
          style={({ pressed }: { pressed: boolean }) => [
            styles.circle,
            animatedButtonStyle,
            {
              backgroundColor: pressed && !isRecording ? pressedColor : buttonColor,
              opacity: disabled ? 0.55 : 1,
              shadowColor,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${route.buttonLabel}. Press and hold to speak.`}
          accessibilityHint="Hold while speaking, release to translate"
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color={palette.primaryText} />
          ) : (
            <ThemedText style={styles.flag}>{route.buttonFlag}</ThemedText>
          )}
        </AnimatedPressable>
      </View>

      <ThemedText variant="button" style={styles.label}>
        {route.buttonLabel}
      </ThemedText>

      <ThemedText variant="caption" color="secondary" style={styles.hint}>
        {hintText}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  circleArea: {
    width: MIC_BUTTON_SIZE + 32,
    height: MIC_BUTTON_SIZE + 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: MIC_BUTTON_SIZE,
    height: MIC_BUTTON_SIZE,
    borderRadius: MIC_BUTTON_SIZE / 2,
  },
  circle: {
    width: MIC_BUTTON_SIZE,
    height: MIC_BUTTON_SIZE,
    borderRadius: MIC_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  flag: {
    fontSize: 52,
    lineHeight: 58,
  },
  label: {
    ...Typography.button,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  hint: {
    textAlign: 'center',
  },
});
