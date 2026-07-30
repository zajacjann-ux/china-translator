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
import { Colors } from '@/presentation/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MIC_BUTTON_SIZE = 140;
/** Compact size for side-by-side voice buttons on the home screen. */
export const HORIZONTAL_MIC_BUTTON_SIZE = 112;

interface VoiceMicButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

export function VoiceMicButton({
  isRecording,
  isProcessing,
  disabled = false,
  onPressIn,
  onPressOut,
}: VoiceMicButtonProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false,
      );
      ringScale.value = withRepeat(
        withSequence(withTiming(1.28, { duration: 600 }), withTiming(1.08, { duration: 600 })),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.45, { duration: 600 }), withTiming(0.1, { duration: 600 })),
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
    onPressIn();
  };

  const handlePressOut = () => {
    if (disabled || isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut();
  };

  const buttonColor = isRecording ? palette.micRecording : palette.mic;

  return (
    <View style={styles.wrapper}>
      {isRecording && (
        <Animated.View
          pointerEvents="none"
          style={[styles.pulseRing, { backgroundColor: palette.micGlow }, animatedRingStyle]}
        />
      )}
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isProcessing}
        style={({ pressed }) => [
          styles.button,
          animatedButtonStyle,
          {
            backgroundColor: pressed && !isRecording ? palette.micPressed : buttonColor,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Hold to speak"
        accessibilityHint="Press and hold to record, release to translate"
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color={palette.primaryText} />
        ) : (
          <ThemedText style={styles.micIcon}>🎤</ThemedText>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: MIC_BUTTON_SIZE + 40,
    height: MIC_BUTTON_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: MIC_BUTTON_SIZE,
    height: MIC_BUTTON_SIZE,
    borderRadius: MIC_BUTTON_SIZE / 2,
  },
  button: {
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
  micIcon: {
    fontSize: 54,
    lineHeight: 60,
  },
});
