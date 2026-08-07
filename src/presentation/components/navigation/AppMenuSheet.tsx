import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/presentation/components/ui/ThemedText';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/presentation/theme';

interface AppMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onClearConversation: () => void;
  canClearConversation: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

export function AppMenuSheet({
  visible,
  onClose,
  onClearConversation,
  canClearConversation,
}: AppMenuSheetProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const closeAnd = (action: () => void) => {
    Haptics.selectionAsync();
    onClose();
    action();
  };

  const confirmClear = () => {
    Alert.alert(
      'New conversation',
      'Clear all messages and start a fresh session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: onClearConversation,
        },
      ],
    );
  };

  const items: MenuItem[] = [
    {
      id: 'history',
      label: 'Conversation History',
      icon: '🕘',
      onPress: () => closeAnd(() => router.push('/conversations' as Href)),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      onPress: () => closeAnd(() => router.push('/settings' as Href)),
    },
    {
      id: 'clear',
      label: 'New conversation',
      icon: '🗑',
      onPress: () => {
        onClose();
        confirmClear();
      },
      destructive: true,
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText variant="subtitle" style={styles.title}>
            Menu
          </ThemedText>

          {items.map((item) => {
            const disabled = item.id === 'clear' && !canClearConversation;
            return (
              <Pressable
                key={item.id}
                disabled={disabled}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: pressed ? palette.surfaceElevated : 'transparent',
                    opacity: disabled ? 0.4 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
                <ThemedText
                  variant="body"
                  color={item.destructive ? 'error' : 'primary'}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    overflow: 'hidden',
  },
  title: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  itemIcon: {
    fontSize: 18,
    lineHeight: 22,
    width: 24,
    textAlign: 'center',
  },
});
