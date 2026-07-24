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
import { Colors, Spacing, Typography } from '@/presentation/theme';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';
import { MIC_BUTTON_SIZE } from '@/presentation/components/ui/VoiceMicButton';

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
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressIn?.();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut?.();
  };

  const buttonColor = isRecording ? palette.micRecording : palette.mic;

  return (
    <View style={styles.wrapper}>
      <View style={styles.circleArea}>
        {isRecording && (
          <Animated.View
            pointerEvents="none"
            style={[styles.pulseRing, { backgroundColor: palette.micGlow }, animatedRingStyle]}
          />
        )}
        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={({ pressed }: { pressed: boolean }) => [
            styles.circle,
            animatedButtonStyle,
            {
              backgroundColor: pressed && !isRecording ? palette.micPressed : buttonColor,
              opacity: disabled ? 0.55 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${route.buttonLabel}. Press and hold to speak.`}
          accessibilityHint="Hold while speaking, release to translate"
        >
          <ThemedText style={styles.flag}>{route.buttonFlag}</ThemedText>
        </AnimatedPressable>
      </View>

      <ThemedText variant="button" style={styles.label}>
        {route.buttonLabel}
      </ThemedText>

      {isRecording && (
        <ThemedText variant="caption" color="secondary" style={styles.hint}>
          Release to translate
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
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
    shadowColor: '#22C55E',
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
    fontSize: 20,
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
});
