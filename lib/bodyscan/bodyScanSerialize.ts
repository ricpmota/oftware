import type { BodyScanDocument, BodyScanStatus } from '@/lib/bodyscan/bodyScanTypes';

/** Shape segura para UI (sem URLs de foto). */
export type BodyScanPublicView = {
  id: string;
  week: number;
  date: string;
  status: BodyScanStatus;
  analysisAvailable: boolean;
  unavailableReason?: string | null;
  input: {
    weightKg: number;
    abdominalCircumferenceCm?: number;
    heightCm: number;
    bmi: number;
    frontPhotoId: string;
    sidePhotoId: string;
  };
  bodyFat?: {
    estimatedMinPercent: number | null;
    estimatedCentralPercent: number | null;
    estimatedMaxPercent: number | null;
    confidence?: string;
  } | null;
  estimatedFatMassKg?: { min: number; central: number; max: number } | null;
  estimatedFatFreeMassKg?: { min: number; central: number; max: number } | null;
  confidence?: {
    overall: string;
    score: number;
    reasons: string[];
  } | null;
  morphology?: BodyScanDocument['morphology'] | null;
  imageQuality?: BodyScanDocument['imageQuality'] | null;
  limitations?: string[];
  promptVersion?: string;
  model?: string;
};

export function serializeBodyScanDoc(
  id: string,
  data: Record<string, unknown>
): BodyScanPublicView | null {
  const week = Number(data.week);
  if (!Number.isFinite(week)) return null;
  const status = data.status as BodyScanStatus;
  if (status !== 'processing' && status !== 'completed' && status !== 'failed') return null;
  const input = (data.input || {}) as BodyScanDocument['input'];
  if (!input || typeof input.weightKg !== 'number') return null;

  return {
    id,
    week,
    date: typeof data.date === 'string' ? data.date : '',
    status,
    analysisAvailable: Boolean(data.analysisAvailable),
    unavailableReason:
      typeof data.unavailableReason === 'string' ? data.unavailableReason : null,
    input: {
      weightKg: input.weightKg,
      abdominalCircumferenceCm: input.abdominalCircumferenceCm,
      heightCm: input.heightCm,
      bmi: input.bmi,
      frontPhotoId: input.frontPhotoId,
      sidePhotoId: input.sidePhotoId,
    },
    bodyFat: (data.bodyFat as BodyScanPublicView['bodyFat']) ?? null,
    estimatedFatMassKg: (data.estimatedFatMassKg as BodyScanPublicView['estimatedFatMassKg']) ?? null,
    estimatedFatFreeMassKg:
      (data.estimatedFatFreeMassKg as BodyScanPublicView['estimatedFatFreeMassKg']) ?? null,
    confidence: (data.confidence as BodyScanPublicView['confidence']) ?? null,
    morphology: (data.morphology as BodyScanPublicView['morphology']) ?? null,
    imageQuality: (data.imageQuality as BodyScanPublicView['imageQuality']) ?? null,
    limitations: Array.isArray(data.limitations)
      ? data.limitations.filter((x): x is string => typeof x === 'string')
      : undefined,
    promptVersion: typeof data.promptVersion === 'string' ? data.promptVersion : undefined,
    model: typeof data.model === 'string' ? data.model : undefined,
  };
}

export function sortBodyScansByWeekAsc(scans: BodyScanPublicView[]): BodyScanPublicView[] {
  return [...scans].sort((a, b) => a.week - b.week);
}
