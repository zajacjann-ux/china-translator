import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useConversation } from '@/presentation/context/ConversationContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';

export default function CameraScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLanguage, partnerLanguage } = useLanguagePair();
  const { addCameraMessage } = useConversation();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureAndTranslate = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, shutterSound: false });
      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      const output = await container.translateCameraUseCase.execute(
        photo.uri,
        partnerLanguage,
        userLanguage,
        { speak: false },
      );

      addCameraMessage(output.result.originalText, output.result.translatedText, {
        sourceLanguage: partnerLanguage,
        targetLanguage: userLanguage,
        audioUri: output.speechAudioUri ?? undefined,
      });
      router.back();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }, [addCameraMessage, isProcessing, partnerLanguage, router, userLanguage]);

  if (!permission) {
    return (
      <SafeScreen>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeScreen>
    );
  }

  if (!permission.granted) {
    return (
      <SafeScreen>
        <View style={styles.permissionBox}>
          <ThemedText variant="subtitle" style={styles.permissionText}>
            Camera access is needed to translate menus, signs, and labels.
          </ThemedText>
          <Pressable
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: palette.primary }]}
          >
            <ThemedText variant="button" color="inverse">
              Allow Camera
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText variant="caption" color="secondary">
              Go back
            </ThemedText>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText variant="subtitle">← Back</ThemedText>
          </Pressable>
          <ThemedText variant="subtitle">Camera Translate</ThemedText>
          <View style={styles.backButton} />
        </View>

        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          {isProcessing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#fff" />
              <ThemedText variant="subtitle" color="inverse">
                Reading text…
              </ThemedText>
            </View>
          )}
        </View>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <Pressable
          onPress={captureAndTranslate}
          disabled={isProcessing}
          style={[
            styles.captureButton,
            { backgroundColor: palette.primary, opacity: isProcessing ? 0.6 : 1 },
          ]}
        >
          <ThemedText variant="button" color="inverse">
            {isProcessing ? 'Processing…' : 'Capture & Translate'}
          </ThemedText>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  backButton: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  cameraWrap: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minHeight: 320,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  captureButton: {
    minHeight: 64,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  permissionText: {
    textAlign: 'center',
  },
  permissionButton: {
    minHeight: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
});
