import { StyleSheet, View } from 'react-native';
import type { FlagIconProps } from './types';

/** Temporary solid circle placeholder for English (UK). */
export function EnglishFlag({ size }: FlagIconProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#012169',
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
