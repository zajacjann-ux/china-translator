export { Colors, type ThemeColors } from './colors';
export { Spacing, BorderRadius } from './spacing';
export { Typography } from './typography';

import { Colors } from './colors';
import { Spacing, BorderRadius } from './spacing';
import { Typography } from './typography';

export const Theme = {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} as const;
