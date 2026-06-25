import { useColorScheme as useRNColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export function useColorScheme(): ColorScheme {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
