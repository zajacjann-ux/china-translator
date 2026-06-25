export type PhrasebookCategoryId =
  | 'restaurant'
  | 'hotel'
  | 'taxi'
  | 'shopping'
  | 'emergency'
  | 'hospital'
  | 'customs'
  | 'airport';

export interface PhrasebookCategory {
  id: PhrasebookCategoryId;
  title: string;
  icon: string;
}

export interface Phrase {
  id: string;
  categoryId: PhrasebookCategoryId;
  /** Map of language code → phrase text */
  translations: Record<string, string>;
}

export const PHRASEBOOK_CATEGORIES: PhrasebookCategory[] = [
  { id: 'restaurant', title: 'Restaurant', icon: '🍽️' },
  { id: 'hotel', title: 'Hotel', icon: '🏨' },
  { id: 'taxi', title: 'Taxi', icon: '🚕' },
  { id: 'shopping', title: 'Shopping', icon: '🛍️' },
  { id: 'emergency', title: 'Emergency', icon: '🚨' },
  { id: 'hospital', title: 'Hospital', icon: '🏥' },
  { id: 'customs', title: 'Customs', icon: '🛃' },
  { id: 'airport', title: 'Airport', icon: '✈️' },
];
