export const BODYSCAN_PROMPT_VERSION = 'bodyscan-v1';

export const BODYSCAN_SUBCOLLECTION = 'bodyScans';

export type BodyScanStatus = 'processing' | 'completed' | 'failed';

export type BodyScanConfidenceLevel = 'low' | 'moderate' | 'high';

export type BodyScanImageQualityLevel = 'high' | 'moderate' | 'low' | 'invalid';

export type BodyScanFatDistribution =
  | 'predominantly_central'
  | 'predominantly_peripheral'
  | 'mixed'
  | 'indeterminate';

export type BodyScanAbdominalProjection = 'low' | 'moderate' | 'high' | 'indeterminate';

export type BodyScanWaistDefinition = 'low' | 'moderate' | 'high' | 'indeterminate';

export type BodyScanRangeKg = {
  min: number;
  central: number;
  max: number;
};

export type BodyScanInputSnapshot = {
  weightKg: number;
  abdominalCircumferenceCm?: number;
  heightCm: number;
  bmi: number;
  frontPhotoId: string;
  sidePhotoId: string;
};

export type BodyScanImageSideQuality = {
  usable: boolean;
  score: number;
  issues: string[];
};

export type BodyScanImageQuality = {
  overall: BodyScanImageQualityLevel;
  front: BodyScanImageSideQuality;
  side: BodyScanImageSideQuality;
};

export type BodyScanMorphology = {
  fatDistribution: BodyScanFatDistribution;
  abdominalProjection: BodyScanAbdominalProjection;
  waistDefinition: BodyScanWaistDefinition;
};

export type BodyScanBodyFatStored = {
  estimatedMinPercent: number | null;
  estimatedCentralPercent: number | null;
  estimatedMaxPercent: number | null;
  confidence: BodyScanConfidenceLevel;
};

export type BodyScanConfidence = {
  overall: BodyScanConfidenceLevel;
  score: number;
  reasons: string[];
};

/** Documento Firestore `pacientes_completos/{id}/bodyScans/week-{N}` */
export type BodyScanDocument = {
  patientId: string;
  week: number;
  date: string;
  status: BodyScanStatus;
  analysisAvailable: boolean;
  unavailableReason?: string | null;
  input: BodyScanInputSnapshot;
  imageQuality?: BodyScanImageQuality | null;
  morphology?: BodyScanMorphology | null;
  bodyFat?: BodyScanBodyFatStored | null;
  estimatedFatMassKg?: BodyScanRangeKg | null;
  estimatedFatFreeMassKg?: BodyScanRangeKg | null;
  confidence?: BodyScanConfidence | null;
  limitations?: string[];
  model?: string;
  promptVersion: string;
  errorMessage?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/** Resposta bruta esperada do Gemini (antes do cálculo de massas). */
export type BodyScanGeminiRawResponse = {
  version?: string;
  imageQuality: BodyScanImageQuality;
  morphology: BodyScanMorphology;
  bodyFat: {
    estimatedRange: { minPercent: number; maxPercent: number } | null;
    centralEstimatePercent: number | null;
    confidence: BodyScanConfidenceLevel;
  };
  confidence: BodyScanConfidence;
  limitations: string[];
};

export function bodyScanDocIdForWeek(week: number): string {
  return `week-${week}`;
}
