import { Platform } from 'react-native';

export const Typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  button: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  mono: Platform.select({
    ios: { fontFamily: 'Menlo' },
    android: { fontFamily: 'monospace' },
    default: { fontFamily: 'monospace' },
  }),
} as const;
