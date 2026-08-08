import { StyleSheet, View } from 'react-native';
import type { FlagIconProps } from './types';

/** Temporary solid circle placeholder for Germany. */
export function GermanyFlag({ size }: FlagIconProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#DD0000',
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
