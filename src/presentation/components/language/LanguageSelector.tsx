import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { LanguagePickerModal } from '@/presentation/components/language/LanguagePickerModal';
import { useLanguagePair } from '@/presentation/context/LanguagePairContext';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';

export function LanguageSelector() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const {
    userLang,
    partnerLang,
    userLanguage,
    partnerLanguage,
    setUserLanguage,
    setPartnerLanguage,
    swapLanguages,
  } = useLanguagePair();

  const [pickerTarget, setPickerTarget] = useState<'source' | 'target' | null>(null);

  const openSourcePicker = () => {
    Haptics.selectionAsync();
    setPickerTarget('source');
  };

  const openTargetPicker = () => {
    Haptics.selectionAsync();
    setPickerTarget('target');
  };

  const handleSwap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swapLanguages();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Pressable onPress={openSourcePicker} style={styles.langSide} accessibilityRole="button">
          <ThemedText variant="caption" color="secondary">
            From
          </ThemedText>
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

        <Pressable onPress={openTargetPicker} style={styles.langSide} accessibilityRole="button">
          <ThemedText variant="caption" color="secondary">
            To
          </ThemedText>
          <ThemedText style={styles.flag}>{partnerLang.flag}</ThemedText>
          <ThemedText variant="subtitle" numberOfLines={1}>
            {partnerLang.label}
          </ThemedText>
        </Pressable>
      </View>

      <LanguagePickerModal
        visible={pickerTarget === 'source'}
        title="Translate from"
        selectedCode={userLanguage}
        onSelect={setUserLanguage}
        onClose={() => setPickerTarget(null)}
      />
      <LanguagePickerModal
        visible={pickerTarget === 'target'}
        title="Translate to"
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
    minHeight: 72,
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
});
