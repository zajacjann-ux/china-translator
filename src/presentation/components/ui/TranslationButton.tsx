import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, Spacing, Typography } from '@/presentation/theme';
import type { TranslationRoute } from '@/domain/entities/TranslationRoute';

/** Premium 3D voice button diameter (110–130px range). */
export const VOICE_BUTTON_3D_SIZE = 138;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TranslationButtonProps {
  route: TranslationRoute;
  isRecording?: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

interface ButtonTheme {
  face: string;
  facePressed: string;
  rim: string;
  shadow: string;
  glow: string;
  groundShadow: string;
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
  const buttonSize = VOICE_BUTTON_3D_SIZE;

  const pulseScale = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const theme: ButtonTheme = isUser
    ? {
        face: palette.mic,
        facePressed: palette.micPressed,
        rim: '#4ADE80',
        shadow: '#15803D',
        glow: palette.micGlow,
        groundShadow: 'rgba(21, 128, 61, 0.45)',
      }
    : {
        face: palette.primary,
        facePressed: palette.primaryPressed,
        rim: '#93C5FD',
        shadow: '#1D4ED8',
        glow: 'rgba(59, 130, 246, 0.45)',
        groundShadow: 'rgba(29, 78, 216, 0.42)',
      };

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false,
      );
      ringScale.value = withRepeat(
        withSequence(withTiming(1.22, { duration: 700 }), withTiming(1.06, { duration: 700 })),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 700 }), withTiming(0.12, { duration: 700 })),
        -1,
        false,
      );
      glowOpacity.value = withTiming(1, { duration: 180 });
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      pulseScale.value = withTiming(1, { duration: 180 });
      ringScale.value = withTiming(1, { duration: 180 });
      ringOpacity.value = withTiming(0, { duration: 180 });
      glowOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [glowOpacity, isRecording, pulseScale, ringOpacity, ringScale]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * pressScale.value }],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || isProcessing) return;
    pressScale.value = withTiming(0.94, { duration: 90 });
    glowOpacity.value = withTiming(0.85, { duration: 120 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressIn?.();
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 160 });
    if (!isRecording) {
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut?.();
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.circleArea, { width: buttonSize + 36, height: buttonSize + 36 }]}>
        <View
          pointerEvents="none"
          style={[
            styles.groundShadow,
            {
              width: buttonSize - 8,
              height: buttonSize - 8,
              borderRadius: (buttonSize - 8) / 2,
              backgroundColor: theme.groundShadow,
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowRing,
            {
              width: buttonSize + 10,
              height: buttonSize + 10,
              borderRadius: (buttonSize + 10) / 2,
              backgroundColor: theme.glow,
            },
            animatedGlowStyle,
          ]}
        />

        {isRecording && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
                backgroundColor: theme.glow,
              },
              animatedRingStyle,
            ]}
          />
        )}

        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={(disabled && !isRecording) || isProcessing}
          style={[
            styles.buttonShell,
            animatedButtonStyle,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              opacity: disabled ? 0.5 : 1,
              shadowColor: theme.shadow,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={route.buttonLabel}
          accessibilityHint="Hold while speaking, release to translate"
        >
          <View
            style={[
              styles.buttonFace,
              {
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
                backgroundColor: isRecording ? theme.rim : theme.face,
                borderColor: theme.rim,
              },
            ]}
          >
            <View style={styles.topSheen} pointerEvents="none" />
            <View style={styles.innerRim} pointerEvents="none" />

            {isProcessing ? (
              <ActivityIndicator size="small" color={palette.primaryText} />
            ) : (
              <ThemedText style={styles.flag}>{route.buttonFlag}</ThemedText>
            )}
          </View>
        </AnimatedPressable>
      </View>

      <ThemedText variant="button" style={styles.label} numberOfLines={2}>
        {route.buttonLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.sm,
    minWidth: 0,
  },
  circleArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundShadow: {
    position: 'absolute',
    top: 10,
    transform: [{ scaleX: 0.92 }],
  },
  glowRing: {
    position: 'absolute',
  },
  pulseRing: {
    position: 'absolute',
  },
  buttonShell: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 14,
  },
  buttonFace: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  innerRim: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    right: 10,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  flag: {
    fontSize: 53,
    lineHeight: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  label: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 21,
    textAlign: 'center',
    letterSpacing: 0.25,
    paddingHorizontal: Spacing.xs,
  },
});
