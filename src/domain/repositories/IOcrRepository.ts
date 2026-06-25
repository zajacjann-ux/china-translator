import type { OcrResult, OcrOptions } from '@/domain/entities/OcrResult';

/**
 * OCR abstraction — swap OpenAI Vision, ML Kit, or on-device OCR without changing use cases.
 */
export interface IOcrRepository {
  extractText(imageUri: string, options?: OcrOptions): Promise<OcrResult>;
}
