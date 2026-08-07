import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HeaderIconButton } from '@/presentation/components/navigation/HeaderIconButton';
import { AppMenuSheet } from '@/presentation/components/navigation/AppMenuSheet';
import { LanguageSelectorSheet } from '@/presentation/components/navigation/LanguageSelectorSheet';
import { Spacing } from '@/presentation/theme';

interface TopNavigationBarProps {
  disabled?: boolean;
  attachmentProcessing?: boolean;
  onPickAttachment: () => void;
  onClearConversation: () => void;
  canClearConversation: boolean;
}

export function TopNavigationBar({
  disabled = false,
  attachmentProcessing = false,
  onPickAttachment,
  onClearConversation,
  canClearConversation,
}: TopNavigationBarProps) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);

  const openCamera = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/camera');
  };

  const openLanguages = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguageVisible(true);
  };

  return (
    <>
      <View style={styles.bar}>
        <View style={styles.iconGroup}>
          <HeaderIconButton
            variant="emoji"
            icon="☰"
            label="Menu"
            onPress={() => setMenuVisible(true)}
            disabled={disabled}
          />
          <HeaderIconButton
            variant="emoji"
            icon="📷"
            label="Camera"
            onPress={openCamera}
            disabled={disabled}
          />
          <HeaderIconButton
            variant="emoji"
            icon="📎"
            label="Gallery"
            onPress={onPickAttachment}
            disabled={disabled}
            loading={attachmentProcessing}
          />
        </View>

        <HeaderIconButton
          variant="material"
          icon="translate"
          label="Translate languages"
          onPress={openLanguages}
          disabled={disabled}
        />
      </View>

      <AppMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onClearConversation={onClearConversation}
        canClearConversation={canClearConversation}
      />

      <LanguageSelectorSheet
        visible={languageVisible}
        onClose={() => setLanguageVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
