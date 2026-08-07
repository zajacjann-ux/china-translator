import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { LanguageSelector } from '@/presentation/components/language/LanguageSelector';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';

interface LanguageSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageSelectorSheet({ visible, onClose }: LanguageSelectorSheetProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.background, borderColor: palette.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText variant="title">Translating</ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText variant="subtitle" color="secondary">
                Done
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText variant="caption" color="secondary" style={styles.hint}>
            Choose source and target languages for voice and camera translation.
          </ThemedText>

          <LanguageSelector />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: {
    lineHeight: 20,
  },
});
