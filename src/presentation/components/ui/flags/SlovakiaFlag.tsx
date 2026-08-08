import { StyleSheet, View } from 'react-native';
import type { FlagIconProps } from './types';

/** Temporary solid circle placeholder for Slovakia. */
export function SlovakiaFlag({ size }: FlagIconProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#0B4EA2',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
  },
});
