import { StyleSheet, View } from 'react-native';
import type { FlagIconProps } from './types';

/** Temporary solid circle placeholder for Indonesia. */
export function IndonesiaFlag({ size }: FlagIconProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FF0000',
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
