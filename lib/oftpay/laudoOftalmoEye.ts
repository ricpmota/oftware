import type { OftalmoExamType } from '@/lib/oftpay/laudoOftalmoExtraction';

export const OFTALMO_EYE_VALUES = ['od', 'oe', 'ao', 'nao_informado'] as const;
export type OftalmoEye = (typeof OFTALMO_EYE_VALUES)[number];

const EYE_LABELS: Record<OftalmoEye, string> = {
  od: 'OD',
  oe: 'OE',
  ao: 'AO',
  nao_informado: 'Não informado',
};

export function normalizeEye(raw: unknown): OftalmoEye {
  if (typeof raw !== 'string' || !raw.trim()) return 'nao_informado';
  const t = raw.trim().toLowerCase();
  if (t === 'od') return 'od';
  if (t === 'oe') return 'oe';
  if (t === 'ao' || t === 'ou' || t === 'ambos') return 'ao';
  if ((OFTALMO_EYE_VALUES as readonly string[]).includes(t)) return t as OftalmoEye;
  return 'nao_informado';
}

export function getEyeLabel(eye: OftalmoEye): string {
  return EYE_LABELS[eye];
}

type EyeDetection = {
  detectedEye: OftalmoEye;
  eyeConfidence: number;
  eyeDetectionReason: string | null;
};

function buildEyeCorpus(params: {
  fileName?: string | null;
  rawSummary?: string | null;
  avisos?: string[];
  examesNaoMapeados?: string[];
  camposEstruturados?: Record<string, string | number | null>;
}): string {
  const parts: string[] = [];
  if (params.fileName) parts.push(params.fileName);
  if (params.rawSummary) parts.push(params.rawSummary);
  if (params.avisos?.length) parts.push(params.avisos.join(' '));
  if (params.examesNaoMapeados?.length) parts.push(params.examesNaoMapeados.join(' '));
  if (params.camposEstruturados) {
    for (const v of Object.values(params.camposEstruturados)) {
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s) parts.push(s);
    }
  }
  return parts.join(' \n ');
}

/**
 * Inferência leve e não bloqueante de olho no documento.
 */
export function detectEyeFromExtraction(params: {
  fileName?: string | null;
  rawSummary?: string | null;
  avisos?: string[];
  examesNaoMapeados?: string[];
  camposEstruturados?: Record<string, string | number | null>;
}): EyeDetection {
  const corpus = buildEyeCorpus(params);
  if (!corpus.trim()) {
    return { detectedEye: 'nao_informado', eyeConfidence: 0, eyeDetectionReason: null };
  }

  const hasAO =
    /\bao\b|\bou\b|\bambos\s+os\s+olhos\b|\bbilateral\b|\bod\/oe\b/i.test(corpus);
  const hasOD = /\bod\b|\bo\.d\.\b|\bolho\s+direito\b/i.test(corpus);
  const hasOE = /\boe\b|\bo\.e\.\b|\bolho\s+esquerdo\b/i.test(corpus);

  if (hasAO) {
    return {
      detectedEye: 'ao',
      eyeConfidence: 0.9,
      eyeDetectionReason: 'Termos bilaterais detectados (AO/OU/ambos os olhos).',
    };
  }
  if (hasOD && !hasOE) {
    return {
      detectedEye: 'od',
      eyeConfidence: 0.8,
      eyeDetectionReason: 'Referência predominante a OD/olho direito.',
    };
  }
  if (hasOE && !hasOD) {
    return {
      detectedEye: 'oe',
      eyeConfidence: 0.8,
      eyeDetectionReason: 'Referência predominante a OE/olho esquerdo.',
    };
  }
  if (hasOD && hasOE) {
    return {
      detectedEye: 'ao',
      eyeConfidence: 0.65,
      eyeDetectionReason: 'Referências simultâneas a OD e OE.',
    };
  }

  return { detectedEye: 'nao_informado', eyeConfidence: 0.3, eyeDetectionReason: null };
}

type BinocularComparableInput = {
  id: string;
  fileName: string;
  examType: OftalmoExamType;
  eye: OftalmoEye;
  camposEstruturados: Record<string, string | number | null>;
};

export type BinocularStatus =
  | 'symmetric'
  | 'mild_asymmetry'
  | 'marked_asymmetry'
  | 'insufficient_data';

export type BinocularComparison = {
  examType: OftalmoExamType;
  examTypeLabel: string;
  status: BinocularStatus;
  interEyeSummary: string;
  keyAsymmetries: string[];
  comparedFields: string[];
  limitations: string[];
  odFileName: string;
  oeFileName: string;
};

const COMPARABLE_FIELDS_BY_TYPE: Record<OftalmoExamType, readonly string[]> = {
  paquimetria: ['espessura_central', 'menor_espessura'],
  topografia: ['k1', 'k2', 'km', 'astigmatismo', 'padrao_curvatura'],
  galilei: ['paquimetria_minima', 'elevacao_posterior', 'indices_ectasia'],
  microscopia: ['densidade_endotelial', 'hexagonalidade'],
  campimetria: ['md', 'psd', 'vfi', 'confiabilidade'],
  retinografia: ['disco_optico', 'macula', 'vasos', 'hemorragias', 'exsudatos', 'drusas'],
  oct_disco: ['rnfl_global', 'rnfl_superior', 'rnfl_inferior', 'escavacao'],
  oct_macula: [
    'espessura_central',
    'fluido_intrarretiniano',
    'fluido_subrretiniano',
    'cistos',
    'ped',
    'membrana_epirretiniana',
    'tracao_vitreo_macular',
  ],
};

const EXAM_TYPE_LABELS: Record<OftalmoExamType, string> = {
  paquimetria: 'Paquimetria',
  topografia: 'Topografia',
  galilei: 'Galilei',
  microscopia: 'Microscopia',
  campimetria: 'Campimetria',
  retinografia: 'Retinografia',
  oct_disco: 'OCT Disco',
  oct_macula: 'OCT Mácula',
};

function parseLooseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).toLowerCase().replace(/\s+/g, ' ').trim();
  return s || null;
}

export function getBinocularStatusLabel(status: BinocularStatus): string {
  if (status === 'symmetric') return 'Semelhante entre OD/OE';
  if (status === 'mild_asymmetry') return 'Assimetria leve';
  if (status === 'marked_asymmetry') return 'Assimetria relevante';
  return 'Dados insuficientes';
}

function compareSameExamTypeBetweenEyes(params: {
  examType: OftalmoExamType;
  od: BinocularComparableInput;
  oe: BinocularComparableInput;
}): BinocularComparison {
  const fields = COMPARABLE_FIELDS_BY_TYPE[params.examType] ?? [];
  const keyAsymmetries: string[] = [];
  const comparedFields: string[] = [];
  const limitations: string[] = [];
  let asymScore = 0;
  let comparisons = 0;

  for (const field of fields) {
    const odVal = params.od.camposEstruturados[field];
    const oeVal = params.oe.camposEstruturados[field];
    if (
      odVal === null ||
      odVal === undefined ||
      String(odVal).trim() === '' ||
      oeVal === null ||
      oeVal === undefined ||
      String(oeVal).trim() === ''
    ) {
      continue;
    }

    comparisons += 1;
    comparedFields.push(field);

    const odNum = parseLooseNumber(odVal);
    const oeNum = parseLooseNumber(oeVal);

    if (odNum !== null && oeNum !== null) {
      const diff = Math.abs(odNum - oeNum);
      const base = Math.max(Math.abs(odNum), Math.abs(oeNum), 1);
      const rel = diff / base;
      asymScore += rel;
      if (rel >= 0.2 && keyAsymmetries.length < 4) {
        const greater = odNum > oeNum ? 'OD' : 'OE';
        keyAsymmetries.push(`${field}: ${greater} maior (${odNum} vs ${oeNum}).`);
      }
      continue;
    }

    const a = normalizeText(odVal);
    const b = normalizeText(oeVal);
    if (!a || !b) continue;
    if (a !== b) {
      asymScore += 1;
      if (keyAsymmetries.length < 4) {
        keyAsymmetries.push(`${field}: descrição diferente entre OD e OE.`);
      }
    }
  }

  if (comparisons === 0) {
    limitations.push('Sem campos comparáveis preenchidos em ambos os olhos.');
    return {
      examType: params.examType,
      examTypeLabel: EXAM_TYPE_LABELS[params.examType],
      status: 'insufficient_data',
      interEyeSummary: 'Dados insuficientes para correlação binocular confiável.',
      keyAsymmetries: [],
      comparedFields: [],
      limitations,
      odFileName: params.od.fileName,
      oeFileName: params.oe.fileName,
    };
  }

  const meanAsym = asymScore / comparisons;
  let status: BinocularStatus = 'symmetric';
  let interEyeSummary = 'Achados estruturalmente semelhantes entre OD e OE.';

  if (meanAsym >= 0.55) {
    status = 'marked_asymmetry';
    interEyeSummary = 'Assimetria relevante entre os olhos, com diferenças de maior magnitude.';
  } else if (meanAsym >= 0.2) {
    status = 'mild_asymmetry';
    interEyeSummary = 'Assimetria leve a moderada entre OD e OE.';
  }

  if (comparisons < 2) {
    limitations.push('Poucos campos comparáveis disponíveis; interpretar com cautela.');
  }

  return {
    examType: params.examType,
    examTypeLabel: EXAM_TYPE_LABELS[params.examType],
    status,
    interEyeSummary,
    keyAsymmetries,
    comparedFields,
    limitations,
    odFileName: params.od.fileName,
    oeFileName: params.oe.fileName,
  };
}

export function buildBinocularComparisons(items: BinocularComparableInput[]): BinocularComparison[] {
  const grouped = new Map<OftalmoExamType, { od?: BinocularComparableInput; oe?: BinocularComparableInput }>();

  for (const item of items) {
    if (item.eye !== 'od' && item.eye !== 'oe') continue;
    if (!grouped.has(item.examType)) grouped.set(item.examType, {});
    const entry = grouped.get(item.examType)!;
    if (item.eye === 'od' && !entry.od) entry.od = item;
    if (item.eye === 'oe' && !entry.oe) entry.oe = item;
  }

  const out: BinocularComparison[] = [];
  for (const [examType, pair] of grouped) {
    if (!pair.od || !pair.oe) continue;
    out.push(compareSameExamTypeBetweenEyes({ examType, od: pair.od, oe: pair.oe }));
  }
  return out;
}
