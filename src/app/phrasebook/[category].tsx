import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeScreen } from '@/presentation/components/layout/SafeScreen';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { container } from '@/infrastructure/di/container';
import type { PhrasebookCategoryId } from '@/domain/entities/Phrasebook';
import { PHRASEBOOK_CATEGORIES } from '@/domain/entities/Phrasebook';
import { getErrorMessage } from '@/shared/errors/AppError';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { getLanguage } from '@/domain/entities/Language';

export default function PhrasebookCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLanguage, partnerLanguage } = useLanguagePair();
  const userLang = getLanguage(userLanguage);
  const partnerLang = getLanguage(partnerLanguage);
  const categoryId = category as PhrasebookCategoryId;
  const meta = PHRASEBOOK_CATEGORIES.find((c) => c.id === categoryId);
  const phrases = container.phrasebookUseCase.getPhrases(categoryId);

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speak = async (phraseId: string, lang: string) => {
    const phrase = phrases.find((p) => p.id === phraseId);
    if (!phrase) return;

    Haptics.selectionAsync();
    setSpeakingId(phraseId);
    setSpeakingLang(lang);
    setError(null);

    try {
      await container.phrasebookUseCase.speakPhrase(phrase, lang);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSpeakingId(null);
      setSpeakingLang(null);
    }
  };

  return (
    <SafeScreen padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ThemedText variant="subtitle">← Back</ThemedText>
          </Pressable>
          <ThemedText variant="title">
            {meta?.icon} {meta?.title}
          </ThemedText>
        </View>

        {error && (
          <ThemedText variant="caption" color="error" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {phrases.map((phrase) => (
            <View
              key={phrase.id}
              style={[styles.phraseCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.phraseRow}>
                <ThemedText variant="caption" color="secondary">
                  {userLang.flag}
                </ThemedText>
                <ThemedText variant="body" style={styles.phraseText}>
                  {phrase.translations[userLanguage] ?? '—'}
                </ThemedText>
                <Pressable
                  onPress={() => speak(phrase.id, userLanguage)}
                  style={[styles.playBtn, { borderColor: palette.border }]}
                  disabled={speakingId === phrase.id}
                >
                  {speakingId === phrase.id && speakingLang === userLanguage ? (
                    <ActivityIndicator size="small" color={palette.primary} />
                  ) : (
                    <ThemedText variant="caption">▶</ThemedText>
                  )}
                </Pressable>
              </View>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <View style={styles.phraseRow}>
                <ThemedText variant="caption" color="secondary">
                  {partnerLang.flag}
                </ThemedText>
                <ThemedText variant="body" style={styles.phraseText}>
                  {phrase.translations[partnerLanguage] ?? '—'}
                </ThemedText>
                <Pressable
                  onPress={() => speak(phrase.id, partnerLanguage)}
                  style={[styles.playBtn, { borderColor: palette.border }]}
                  disabled={speakingId === phrase.id}
                >
                  {speakingId === phrase.id && speakingLang === partnerLanguage ? (
                    <ActivityIndicator size="small" color={palette.primary} />
                  ) : (
                    <ThemedText variant="caption">▶</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  error: {
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  phraseCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
  },
  phraseText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
  },
});
