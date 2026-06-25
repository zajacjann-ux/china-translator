import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ResultDisplay } from '@/presentation/components/ui/ResultDisplay';
import { ErrorBanner } from '@/presentation/components/ui/ErrorBanner';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { container } from '@/infrastructure/di/container';
import { getErrorMessage } from '@/shared/errors/AppError';
import type { TranslationResult } from '@/domain/entities/TranslationResult';

export default function CameraScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLanguage, partnerLanguage } = useLanguagePair();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [speechUri, setSpeechUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const captureAndTranslate = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, shutterSound: false });
      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      const output = await container.translateCameraUseCase.execute(
        photo.uri,
        userLanguage,
        partnerLanguage,
      );

      await container.conversationHistoryRepository.saveConversation(output.result);
      setResult(output.result);
      setSpeechUri(output.speechAudioUri);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, partnerLanguage, userLanguage]);

  const replaySpeech = async () => {
    const uri = speechUri ?? result?.speechAudioUri;
    if (!uri) return;
    setIsReplaying(true);
    try {
      await container.translateSpeechUseCase.replaySpeech(uri);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsReplaying(false);
    }
  };

  const copyTranslation = async () => {
    if (!result?.translatedText) return;
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(result.translatedText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

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

        {!result ? (
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
        ) : (
          <View style={styles.resultWrap}>
            <ResultDisplay
              result={result}
              onReplay={replaySpeech}
              onCopy={copyTranslation}
              isReplaying={isReplaying}
              copyFeedback={copyFeedback}
            />
            <Pressable
              onPress={() => {
                setResult(null);
                setSpeechUri(null);
              }}
              style={[styles.retakeButton, { borderColor: palette.border }]}
            >
              <ThemedText variant="subtitle">Take another photo</ThemedText>
            </Pressable>
          </View>
        )}

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!result && (
          <Pressable
            onPress={captureAndTranslate}
            disabled={isProcessing}
            style={[styles.captureButton, { backgroundColor: palette.primary, opacity: isProcessing ? 0.6 : 1 }]}
          >
            <ThemedText variant="button" color="inverse">
              {isProcessing ? 'Processing…' : 'Capture & Translate'}
            </ThemedText>
          </Pressable>
        )}
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
    ...StyleSheet.absoluteFillObject,
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
  resultWrap: {
    flex: 1,
    gap: Spacing.md,
  },
  retakeButton: {
    minHeight: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
