import type {
  BodyScanAbdominalProjection,
  BodyScanConfidenceLevel,
  BodyScanFatDistribution,
  BodyScanGeminiRawResponse,
  BodyScanImageQualityLevel,
  BodyScanWaistDefinition,
} from '@/lib/bodyscan/bodyScanTypes';

/** Limites plausíveis de % gordura para BodyScan v1 (não clínicos validados). */
export const BODYSCAN_BODY_FAT_MIN_PERCENT = 5;
export const BODYSCAN_BODY_FAT_MAX_PERCENT = 55;

const CONFIDENCE: BodyScanConfidenceLevel[] = ['low', 'moderate', 'high'];
const QUALITY: BodyScanImageQualityLevel[] = ['high', 'moderate', 'low', 'invalid'];
const FAT_DIST: BodyScanFatDistribution[] = [
  'predominantly_central',
  'predominantly_peripheral',
  'mixed',
  'indeterminate',
];
const ABDOMINAL: BodyScanAbdominalProjection[] = ['low', 'moderate', 'high', 'indeterminate'];
const WAIST: BodyScanWaistDefinition[] = ['low', 'moderate', 'high', 'indeterminate'];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
}

function asEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function asScore(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n);
}

function asPercent(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < BODYSCAN_BODY_FAT_MIN_PERCENT || n > BODYSCAN_BODY_FAT_MAX_PERCENT) return null;
  return Math.round(n);
}

export type BodyScanValidationResult =
  | { ok: true; value: BodyScanGeminiRawResponse; analysisAvailable: boolean; unavailableReason?: string }
  | { ok: false; error: string };

/**
 * Valida e normaliza a resposta do Gemini.
 * Qualidade inválida / sem estimativa sustentável → ok com analysisAvailable=false (não é falha técnica).
 */
export function validateBodyScanGeminiResponse(raw: unknown): BodyScanValidationResult {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Resposta BodyScan inválida (não é objeto).' };
  }

  const iqRaw = raw.imageQuality;
  if (!isPlainObject(iqRaw) || !isPlainObject(iqRaw.front) || !isPlainObject(iqRaw.side)) {
    return { ok: false, error: 'imageQuality ausente ou inválido.' };
  }

  const overall = asEnum(iqRaw.overall, QUALITY);
  const frontScore = asScore(iqRaw.front.score);
  const sideScore = asScore(iqRaw.side.score);
  if (!overall || frontScore == null || sideScore == null) {
    return { ok: false, error: 'Scores/qualidade de imagem inválidos.' };
  }

  const imageQuality = {
    overall,
    front: {
      usable: Boolean(iqRaw.front.usable),
      score: frontScore,
      issues: asStringArray(iqRaw.front.issues),
    },
    side: {
      usable: Boolean(iqRaw.side.usable),
      score: sideScore,
      issues: asStringArray(iqRaw.side.issues),
    },
  };

  const morphRaw = isPlainObject(raw.morphology) ? raw.morphology : null;
  const morphology = {
    fatDistribution: asEnum(morphRaw?.fatDistribution, FAT_DIST) ?? 'indeterminate',
    abdominalProjection: asEnum(morphRaw?.abdominalProjection, ABDOMINAL) ?? 'indeterminate',
    waistDefinition: asEnum(morphRaw?.waistDefinition, WAIST) ?? 'indeterminate',
  };

  const confRaw = isPlainObject(raw.confidence) ? raw.confidence : null;
  const confidenceOverall = asEnum(confRaw?.overall, CONFIDENCE) ?? 'low';
  const confidenceScore = asScore(confRaw?.score) ?? 0;
  const confidence = {
    overall: confidenceOverall,
    score: confidenceScore,
    reasons: asStringArray(confRaw?.reasons),
  };

  const limitations = asStringArray(raw.limitations);
  if (limitations.length === 0) {
    limitations.push(
      'Estimativa baseada em fotografias e dados antropométricos',
      'Não representa exame de bioimpedância ou DXA'
    );
  }

  const bfRaw = isPlainObject(raw.bodyFat) ? raw.bodyFat : null;
  const bfConfidence = asEnum(bfRaw?.confidence, CONFIDENCE) ?? 'low';

  const qualityBlocksEstimate =
    overall === 'invalid' || !imageQuality.front.usable || !imageQuality.side.usable;

  if (qualityBlocksEstimate) {
    return {
      ok: true,
      analysisAvailable: false,
      unavailableReason:
        'Não foi possível estimar a composição corporal com segurança suficiente a partir destas fotos.',
      value: {
        version: typeof raw.version === 'string' ? raw.version : undefined,
        imageQuality,
        morphology,
        bodyFat: {
          estimatedRange: null,
          centralEstimatePercent: null,
          confidence: 'low',
        },
        confidence,
        limitations,
      },
    };
  }

  let estimatedRange: { minPercent: number; maxPercent: number } | null = null;
  let centralEstimatePercent: number | null = null;

  if (bfRaw && bfRaw.estimatedRange != null && isPlainObject(bfRaw.estimatedRange)) {
    const minP = asPercent(bfRaw.estimatedRange.minPercent);
    const maxP = asPercent(bfRaw.estimatedRange.maxPercent);
    const central = asPercent(bfRaw.centralEstimatePercent);
    if (minP != null && maxP != null && central != null && minP <= central && central <= maxP && minP < maxP) {
      estimatedRange = { minPercent: minP, maxPercent: maxP };
      centralEstimatePercent = central;
    } else if (minP != null || maxP != null || central != null) {
      // Campos presentes mas inconsistentes → descartar estimativa, não falhar o documento inteiro
      estimatedRange = null;
      centralEstimatePercent = null;
    }
  }

  if (estimatedRange == null || centralEstimatePercent == null) {
    return {
      ok: true,
      analysisAvailable: false,
      unavailableReason:
        'Não foi possível estimar a composição corporal com segurança suficiente a partir destas fotos.',
      value: {
        version: typeof raw.version === 'string' ? raw.version : undefined,
        imageQuality,
        morphology,
        bodyFat: {
          estimatedRange: null,
          centralEstimatePercent: null,
          confidence: bfConfidence === 'high' ? 'moderate' : bfConfidence,
        },
        confidence: {
          ...confidence,
          overall: confidence.overall === 'high' ? 'moderate' : confidence.overall,
        },
        limitations,
      },
    };
  }

  return {
    ok: true,
    analysisAvailable: true,
    value: {
      version: typeof raw.version === 'string' ? raw.version : undefined,
      imageQuality,
      morphology,
      bodyFat: {
        estimatedRange,
        centralEstimatePercent,
        confidence: bfConfidence,
      },
      confidence,
      limitations,
    },
  };
}
