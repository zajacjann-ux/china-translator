import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AppProviders } from '@/presentation/context/AppProviders';
import { useColorScheme } from '@/presentation/hooks/useColorScheme';
import { Colors } from '@/presentation/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];

  const navigationTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: palette.background,
            card: palette.surface,
            text: palette.text,
            border: palette.border,
            primary: palette.primary,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: palette.background,
            card: palette.surface,
            text: palette.text,
            border: palette.border,
            primary: palette.primary,
          },
        };

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppProviders>
        <ThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="camera" />
            <Stack.Screen name="conversations" />
            <Stack.Screen name="settings" />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
