import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import type { Language } from '@/domain/entities/Language';
import { getAllLanguages } from '@/domain/entities/Language';

interface LanguagePickerModalProps {
  visible: boolean;
  title: string;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function LanguagePickerModal({
  visible,
  title,
  selectedCode,
  onSelect,
  onClose,
}: LanguagePickerModalProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const languages = getAllLanguages();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedText variant="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {languages.map((lang) => (
              <LanguageRow
                key={lang.code}
                language={lang}
                selected={lang.code === selectedCode}
                onPress={() => {
                  onSelect(lang.code);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LanguageRow({
  language,
  selected,
  onPress,
}: {
  language: Language;
  selected: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: selected ? palette.surfaceElevated : 'transparent',
          borderColor: palette.border,
        },
      ]}
    >
      <ThemedText style={styles.rowFlag}>{language.flag}</ThemedText>
      <View style={styles.rowText}>
        <ThemedText variant="body">{language.label}</ThemedText>
        <ThemedText variant="caption" color="secondary">
          {language.nativeLabel}
        </ThemedText>
      </View>
      {selected && (
        <ThemedText variant="caption" color="secondary">
          ✓
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minHeight: 56,
  },
  rowFlag: {
    fontSize: 28,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
