import { StyleSheet, View } from 'react-native';
import type { FlagIconProps } from './types';

/** Temporary solid circle placeholder for China. */
export function ChinaFlag({ size }: FlagIconProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#DE2910',
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
