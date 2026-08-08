import { type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LanguageCode } from '@/domain/entities/Language';
import { ChinaFlag } from './ChinaFlag';
import { EnglishFlag } from './EnglishFlag';
import { GermanyFlag } from './GermanyFlag';
import { IndonesiaFlag } from './IndonesiaFlag';
import { SlovakiaFlag } from './SlovakiaFlag';
import type { FlagIconProps } from './types';

const FLAG_COMPONENTS: Record<string, ComponentType<FlagIconProps>> = {
  sk: SlovakiaFlag,
  zh: ChinaFlag,
  en: EnglishFlag,
  de: GermanyFlag,
  id: IndonesiaFlag,
};

interface VoiceButtonFlagProps {
  languageCode: LanguageCode;
  size: number;
}

export function VoiceButtonFlag({ languageCode, size }: VoiceButtonFlagProps) {
  const FlagComponent = FLAG_COMPONENTS[languageCode] ?? SlovakiaFlag;

  return (
    <View style={[styles.wrapper, { width: size, height: size, borderRadius: size / 2 }]}>
      <FlagComponent size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
});
