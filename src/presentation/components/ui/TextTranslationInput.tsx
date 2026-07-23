import { StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors, BorderRadius, Spacing } from '@/presentation/theme';
import { getLanguage } from '@/domain/entities/Language';

interface TextTranslationInputProps {
  value: string;
  onChangeText: (text: string) => void;
  sourceLanguage: string;
  editable?: boolean;
}

export function TextTranslationInput({
  value,
  onChangeText,
  sourceLanguage,
  editable = true,
}: TextTranslationInputProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const source = getLanguage(sourceLanguage);

  return (
    <View style={styles.container}>
      <ThemedText variant="label" color="secondary">
        {source.flag} Type in {source.label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        placeholder={`Enter ${source.label} text…`}
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        textAlignVertical="top"
        accessibilityLabel={`Text input in ${source.label}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    flex: 1,
  },
  input: {
    flex: 1,
    minHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 18,
    lineHeight: 26,
  },
});
