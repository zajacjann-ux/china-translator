import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { LanguagePickerModal } from '@/presentation/components/language/LanguagePickerModal';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';

export function LanguageSelector() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const { userLang, partnerLang, userLanguage, partnerLanguage, setUserLanguage, setPartnerLanguage, swapLanguages } =
    useLanguagePair();

  const [pickerTarget, setPickerTarget] = useState<'user' | 'partner' | null>(null);

  const openUserPicker = () => {
    Haptics.selectionAsync();
    setPickerTarget('user');
  };

  const openPartnerPicker = () => {
    Haptics.selectionAsync();
    setPickerTarget('partner');
  };

  const handleSwap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swapLanguages();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Pressable onPress={openUserPicker} style={styles.langSide} accessibilityRole="button">
          <ThemedText style={styles.flag}>{userLang.flag}</ThemedText>
          <ThemedText variant="subtitle" numberOfLines={1}>
            {userLang.label}
          </ThemedText>
        </Pressable>

        <Pressable onPress={handleSwap} style={styles.swap} accessibilityLabel="Swap languages">
          <ThemedText variant="subtitle" color="secondary">
            ⇄
          </ThemedText>
        </Pressable>

        <Pressable onPress={openPartnerPicker} style={styles.langSide} accessibilityRole="button">
          <ThemedText style={styles.flag}>{partnerLang.flag}</ThemedText>
          <ThemedText variant="subtitle" numberOfLines={1}>
            {partnerLang.label}
          </ThemedText>
        </Pressable>
      </View>

      <Link href="/phrasebook" asChild>
        <Pressable style={styles.phrasebookLink} accessibilityRole="link">
          <ThemedText variant="caption" color="secondary">
            📖 Phrasebook
          </ThemedText>
        </Pressable>
      </Link>

      <LanguagePickerModal
        visible={pickerTarget === 'user'}
        title="I speak"
        selectedCode={userLanguage}
        onSelect={setUserLanguage}
        onClose={() => setPickerTarget(null)}
      />
      <LanguagePickerModal
        visible={pickerTarget === 'partner'}
        title="They speak"
        selectedCode={partnerLanguage}
        onSelect={setPartnerLanguage}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    minHeight: 64,
  },
  langSide: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  flag: {
    fontSize: 28,
    lineHeight: 32,
  },
  swap: {
    paddingHorizontal: Spacing.md,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phrasebookLink: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
});
