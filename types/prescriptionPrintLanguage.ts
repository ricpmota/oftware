export type PrescriptionPrintLanguage = 'pt' | 'en';

export function prescriptionPrintLanguageOrDefault(value: unknown): PrescriptionPrintLanguage {
  return value === 'en' ? 'en' : 'pt';
}
