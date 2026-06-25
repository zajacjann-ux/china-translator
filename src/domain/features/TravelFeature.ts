export type TravelFeatureId = 'speech' | 'camera' | 'phrasebook' | 'conversation';

export interface TravelFeature {
  id: TravelFeatureId;
  label: string;
  description: string;
  enabled: boolean;
  route?: string;
}

export const TRAVEL_FEATURES: TravelFeature[] = [
  {
    id: 'speech',
    label: 'Voice Translate',
    description: 'Press and hold to speak',
    enabled: true,
    route: '/',
  },
  {
    id: 'camera',
    label: 'Camera Translate',
    description: 'Photo OCR for menus and signs',
    enabled: true,
    route: '/camera',
  },
  {
    id: 'phrasebook',
    label: 'Phrasebook',
    description: 'Offline travel phrases',
    enabled: true,
    route: '/phrasebook',
  },
  {
    id: 'conversation',
    label: 'Conversation Mode',
    description: 'Hands-free table translation',
    enabled: false,
    route: '/conversation',
  },
];
