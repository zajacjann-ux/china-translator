export interface OcrResult {
  text: string;
  detectedLanguages?: string[];
  confidence?: number;
}

export interface OcrOptions {
  /** Hint which languages may appear in the image */
  languageHints?: string[];
}
