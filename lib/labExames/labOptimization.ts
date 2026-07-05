import type {
  LabRange,
  LabTargetQuartile,
  LabIdealRange,
  LabExamMeta,
  LabScoreGroup,
} from '@/types/labRanges';

export type ReferenceStatus = 'below_reference' | 'above_reference' | 'within_reference' | 'unknown';

export type OptimizationStatus =
  | 'ideal'
  | 'normal_but_not_ideal'
  | 'below_ideal'
  | 'above_ideal'
  | 'not_applicable'
  | 'unknown';

export interface LabOptimizationResult {
  referenceStatus: ReferenceStatus;
  optimizationStatus: OptimizationStatus;
  targetQuartile?: LabTargetQuartile;
  message: string;
}

/**
 * Avalia o status de otimização de um exame laboratorial em relação à faixa ideal Oftware.
 * Não altera getLabRange — opera sobre o resultado já resolvido.
 */
export function getLabOptimizationStatus(params: {
  value: number | null | undefined;
  range: LabRange | null;
  meta?: LabExamMeta | null;
}): LabOptimizationResult {
  const { value, range, meta } = params;

  if (meta?.qualitative) {
    return {
      referenceStatus: 'unknown',
      optimizationStatus: 'not_applicable',
      message: 'Exame qualitativo — sem otimização numérica.',
    };
  }

  if (value == null || range == null) {
    return {
      referenceStatus: 'unknown',
      optimizationStatus: 'unknown',
      message: 'Valor ou faixa de referência indisponível.',
    };
  }

  const referenceStatus: ReferenceStatus =
    value < range.min
      ? 'below_reference'
      : value > range.max
        ? 'above_reference'
        : 'within_reference';

  const ideal = meta?.ideal;
  const targetQuartile = ideal?.targetQuartile ?? 'NONE';

  if (!ideal || targetQuartile === 'NONE' || meta?.scoreEligible === false) {
    const msg =
      referenceStatus === 'within_reference'
        ? 'Dentro da referência laboratorial.'
        : referenceStatus === 'below_reference'
          ? 'Abaixo da referência laboratorial.'
          : 'Acima da referência laboratorial.';
    return { referenceStatus, optimizationStatus: 'not_applicable', targetQuartile, message: msg };
  }

  if (referenceStatus !== 'within_reference') {
    const msg =
      referenceStatus === 'below_reference'
        ? 'Abaixo da referência laboratorial.'
        : 'Acima da referência laboratorial.';
    const optStatus: OptimizationStatus =
      referenceStatus === 'below_reference' ? 'below_ideal' : 'above_ideal';
    return { referenceStatus, optimizationStatus: optStatus, targetQuartile, message: msg };
  }

  const withinIdeal = isWithinIdeal(value, ideal, range, targetQuartile);

  if (withinIdeal) {
    return {
      referenceStatus: 'within_reference',
      optimizationStatus: 'ideal',
      targetQuartile,
      message: 'Dentro da faixa ideal Oftware.',
    };
  }

  const optStatus: OptimizationStatus = resolveNonIdealDirection(value, ideal, range, targetQuartile);
  const msg =
    optStatus === 'below_ideal'
      ? 'Dentro da referência, mas abaixo do ideal Oftware.'
      : optStatus === 'above_ideal'
        ? 'Dentro da referência, mas acima do ideal Oftware.'
        : 'Dentro da referência, mas fora do ideal Oftware.';

  return { referenceStatus: 'within_reference', optimizationStatus: optStatus, targetQuartile, message: msg };
}

function isWithinIdeal(
  value: number,
  ideal: LabIdealRange,
  range: LabRange,
  quartile: LabTargetQuartile
): boolean {
  const idealMin = ideal.min ?? range.min;
  const idealMax = ideal.max ?? range.max;

  if (ideal.min != null || ideal.max != null) {
    return value >= idealMin && value <= idealMax;
  }

  switch (quartile) {
    case 'LOW': {
      const q1 = range.min + (range.max - range.min) * 0.25;
      return value <= q1;
    }
    case 'HIGH': {
      const q3 = range.min + (range.max - range.min) * 0.75;
      return value >= q3;
    }
    case 'MID': {
      const q1 = range.min + (range.max - range.min) * 0.25;
      const q3 = range.min + (range.max - range.min) * 0.75;
      return value >= q1 && value <= q3;
    }
    default:
      return true;
  }
}

function resolveNonIdealDirection(
  value: number,
  ideal: LabIdealRange,
  range: LabRange,
  quartile: LabTargetQuartile
): OptimizationStatus {
  const idealMin = ideal.min ?? range.min;
  const idealMax = ideal.max ?? range.max;

  if (ideal.min != null || ideal.max != null) {
    if (value < idealMin) return 'below_ideal';
    if (value > idealMax) return 'above_ideal';
    return 'normal_but_not_ideal';
  }

  switch (quartile) {
    case 'LOW':
      return 'above_ideal';
    case 'HIGH':
      return 'below_ideal';
    case 'MID': {
      const mid = (range.min + range.max) / 2;
      return value < mid ? 'below_ideal' : 'above_ideal';
    }
    default:
      return 'normal_but_not_ideal';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Registro de metadados de otimização por chave de exame
// ─────────────────────────────────────────────────────────────────────────────

export const LAB_EXAM_META: Record<string, LabExamMeta> = {
  // ─── Metabolismo Básico ────────────────────────────────────────────────────
  fastingGlucose: {
    ideal: { max: 90, targetQuartile: 'LOW' },
    scoreGroup: 'glicidico',
    scoreEligible: true,
  },
  hba1c: {
    ideal: { max: 5.3, targetQuartile: 'LOW' },
    scoreGroup: 'glicidico',
    scoreEligible: true,
  },

  // ─── Metabolismo Avançado ──────────────────────────────────────────────────
  fastingInsulin: {
    ideal: { max: 8, targetQuartile: 'LOW' },
    scoreGroup: 'resistenciaInsulinica',
    scoreEligible: true,
  },
  homaIr: {
    ideal: { max: 1.5, targetQuartile: 'LOW' },
    scoreGroup: 'resistenciaInsulinica',
    scoreEligible: true,
  },
  leptina: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'resistenciaInsulinica',
    scoreEligible: true,
  },
  adiponectina: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'resistenciaInsulinica',
    scoreEligible: true,
  },

  // ─── Renal / Metabólico ────────────────────────────────────────────────────
  urea: { scoreGroup: 'complementar', scoreEligible: false },
  creatinine: { scoreGroup: 'complementar', scoreEligible: false },
  egfr: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'complementar',
    scoreEligible: true,
  },
  uricAcid: {
    ideal: { max: 5.5, targetQuartile: 'LOW' },
    scoreGroup: 'inflamatorio',
    scoreEligible: true,
  },
  sodium: { scoreGroup: 'complementar', scoreEligible: false },
  potassium: { scoreGroup: 'complementar', scoreEligible: false },

  // ─── Inflamação / Risco Cardiovascular ─────────────────────────────────────
  pcrUltra: {
    ideal: { max: 1, targetQuartile: 'LOW' },
    scoreGroup: 'inflamatorio',
    scoreEligible: true,
  },
  fibrinogen: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'inflamatorio',
    scoreEligible: true,
  },
  homocysteine: {
    ideal: { max: 10, targetQuartile: 'LOW' },
    scoreGroup: 'inflamatorio',
    scoreEligible: true,
  },
  apolipoproteinB: {
    ideal: { max: 80, targetQuartile: 'LOW' },
    scoreGroup: 'cardiovascular',
    scoreEligible: true,
  },

  // ─── Perfil Lipídico ──────────────────────────────────────────────────────
  cholTotal: { scoreGroup: 'cardiovascular', scoreEligible: false },
  hdl: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'cardiovascular',
    scoreEligible: true,
  },
  ldl: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'cardiovascular',
    scoreEligible: true,
  },
  vldl: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'cardiovascular',
    scoreEligible: true,
  },
  tg: {
    ideal: { max: 100, targetQuartile: 'LOW' },
    scoreGroup: 'cardiovascular',
    scoreEligible: true,
  },
  apolipoproteinA1: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'cardiovascular',
    scoreEligible: true,
  },

  // ─── Hepatobiliar ─────────────────────────────────────────────────────────
  alt: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'hepatometabolico',
    scoreEligible: true,
  },
  ast: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'hepatometabolico',
    scoreEligible: true,
  },
  ggt: {
    ideal: { max: 25, targetQuartile: 'LOW' },
    scoreGroup: 'hepatometabolico',
    scoreEligible: true,
  },
  alp: { scoreGroup: 'hepatometabolico', scoreEligible: false },
  bilirubinTotal: { scoreGroup: 'hepatometabolico', scoreEligible: false },
  bilirubinDirect: { scoreGroup: 'hepatometabolico', scoreEligible: false },
  bilirubinIndirect: { scoreGroup: 'hepatometabolico', scoreEligible: false },

  // ─── Tireoide ─────────────────────────────────────────────────────────────
  tsh: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'tireoidiano',
    scoreEligible: true,
  },
  ft4: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'tireoidiano',
    scoreEligible: true,
  },
  t3Livre: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'tireoidiano',
    scoreEligible: true,
  },
  antiTPO: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'tireoidiano',
    scoreEligible: true,
  },
  antiTg: {
    ideal: { targetQuartile: 'LOW' },
    scoreGroup: 'tireoidiano',
    scoreEligible: true,
  },

  // ─── Hormônios Sexuais ────────────────────────────────────────────────────
  testosteronaTotal: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'hormonal',
    scoreEligible: true,
  },
  testosteronaLivre: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'hormonal',
    scoreEligible: true,
  },
  shbg: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'hormonal',
    scoreEligible: true,
  },
  lh: { scoreGroup: 'hormonal', scoreEligible: false },
  fsh: { scoreGroup: 'hormonal', scoreEligible: false },
  estradiol: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'hormonal',
    scoreEligible: true,
  },
  psa: { scoreGroup: 'complementar', scoreEligible: false, optional: true },
  psaLivre: { scoreGroup: 'complementar', scoreEligible: false, optional: true },
  psaLivreTotalRatio: { scoreGroup: 'complementar', scoreEligible: false, optional: true },

  // ─── Eixo Adrenal / Estresse ──────────────────────────────────────────────
  cortisol8h: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'adrenal',
    scoreEligible: true,
  },
  cortisol16h: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'adrenal',
    scoreEligible: true,
  },
  acth: { scoreGroup: 'adrenal', scoreEligible: false },
  dheas: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'adrenal',
    scoreEligible: true,
  },

  // ─── Performance / Recuperação ────────────────────────────────────────────
  igf1: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'performance',
    scoreEligible: true,
  },
  cpk: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'performance',
    scoreEligible: true,
  },
  pth: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'performance',
    scoreEligible: true,
  },

  // ─── Estado Nutricional / Inflamatório ────────────────────────────────────
  totalProteins: { scoreGroup: 'nutricional', scoreEligible: false },
  albumin: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'nutricional',
    scoreEligible: true,
  },
  globulins: { scoreGroup: 'nutricional', scoreEligible: false },
  ferritin: {
    ideal: { targetQuartile: 'MID' },
    scoreGroup: 'nutricional',
    scoreEligible: true,
  },
  b12: {
    ideal: { targetQuartile: 'HIGH' },
    scoreGroup: 'nutricional',
    scoreEligible: true,
  },
  vitaminD: {
    ideal: { min: 40, max: 70, targetQuartile: 'HIGH' },
    scoreGroup: 'nutricional',
    scoreEligible: true,
  },

  // ─── Hemograma ────────────────────────────────────────────────────────────
  hgb: { scoreGroup: 'complementar', scoreEligible: false },
  wbc: { scoreGroup: 'complementar', scoreEligible: false },
  platelets: { scoreGroup: 'complementar', scoreEligible: false },

  // ─── Infecções / Triagem ──────────────────────────────────────────────────
  antiHcv: {
    qualitative: true,
    scoreGroup: 'complementar',
    scoreEligible: false,
  },

  // ─── Metais Tóxicos ───────────────────────────────────────────────────────
  aluminumSerum: { scoreGroup: 'complementar', scoreEligible: false },

  // ─── Parasitologia ────────────────────────────────────────────────────────
  stoolParasitologySeries: {
    qualitative: true,
    scoreGroup: 'complementar',
    scoreEligible: false,
  },

  // ─── Marcadores Tumorais Complementares ───────────────────────────────────
  cea: {
    optional: true,
    scoreGroup: 'complementar',
    scoreEligible: false,
    ideal: { targetQuartile: 'NONE' },
  },
  ca125: {
    optional: true,
    scoreGroup: 'complementar',
    scoreEligible: false,
    ideal: { targetQuartile: 'NONE' },
  },
  ca199: {
    optional: true,
    scoreGroup: 'complementar',
    scoreEligible: false,
    ideal: { targetQuartile: 'NONE' },
  },

  // ─── Estresse Oxidativo / Defesa Antioxidante ─────────────────────────────
  g6pd: {
    ideal: { min: 6.0, max: 13.5, targetQuartile: 'MID' },
    scoreGroup: 'complementar',
    scoreEligible: true,
  },
  vitaminC: {
    ideal: { min: 0.8, max: 2.0, targetQuartile: 'HIGH' },
    scoreGroup: 'complementar',
    scoreEligible: true,
  },

  // ─── Outros Complementares ────────────────────────────────────────────────
  calcitonin: { scoreGroup: 'complementar', scoreEligible: false },
  iron: { scoreGroup: 'nutricional', scoreEligible: false },
  amylase: { scoreGroup: 'complementar', scoreEligible: false },
  lipase: { scoreGroup: 'complementar', scoreEligible: false },
  dht: { scoreGroup: 'hormonal', scoreEligible: false },
  prolactina: { scoreGroup: 'hormonal', scoreEligible: false },
  progesterona: { scoreGroup: 'hormonal', scoreEligible: false },
  oh17Progesterona: { scoreGroup: 'hormonal', scoreEligible: false },
  amh: { scoreGroup: 'hormonal', scoreEligible: false },
};

/** Retorna o meta de otimização para um exame, ou undefined se não registrado. */
export function getLabExamMeta(examKey: string): LabExamMeta | undefined {
  return LAB_EXAM_META[examKey];
}

/** Conta exames elegíveis para score por grupo. */
export function countScoreEligibleByGroup(): Record<LabScoreGroup, number> {
  const counts = {} as Record<LabScoreGroup, number>;
  for (const meta of Object.values(LAB_EXAM_META)) {
    if (!meta.scoreGroup) continue;
    if (!counts[meta.scoreGroup]) counts[meta.scoreGroup] = 0;
    if (meta.scoreEligible) counts[meta.scoreGroup]++;
  }
  return counts;
}
