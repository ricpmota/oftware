import type { OftalmoExamType } from '@/lib/oftpay/laudoOftalmoExtraction';
import { getEyeLabel, normalizeEye, type OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';

export type TemporalStatus =
  | 'stable'
  | 'possible_progression'
  | 'possible_improvement'
  | 'insufficient_data';

export type TemporalComparableInput = {
  id: string;
  fileName: string;
  examType: OftalmoExamType;
  eye: OftalmoEye;
  dataExame?: string | null;
  camposEstruturados: Record<string, string | number | null>;
  sourceOrder?: number;
};

export type TemporalComparison = {
  examType: OftalmoExamType;
  examTypeLabel: string;
  eye: OftalmoEye;
  eyeLabel: string;
  previousDate: string | null;
  currentDate: string | null;
  status: TemporalStatus;
  progressionSummary: string;
  keyTemporalChanges: string[];
  temporalLimitations: string[];
  comparedFields: string[];
  previousFileName: string;
  currentFileName: string;
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

const TEMPORAL_FIELDS_BY_TYPE: Record<OftalmoExamType, readonly string[]> = {
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

function parseDateISO(s: unknown): number | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const ms = Date.parse(`${t}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

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

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
}

function compareTemporalSameExamType(
  previous: TemporalComparableInput,
  current: TemporalComparableInput
): TemporalComparison {
  const fields = TEMPORAL_FIELDS_BY_TYPE[current.examType] ?? [];
  const keyTemporalChanges: string[] = [];
  const comparedFields: string[] = [];
  const temporalLimitations: string[] = [];
  let worsening = 0;
  let improving = 0;

  for (const field of fields) {
    const prev = previous.camposEstruturados[field];
    const curr = current.camposEstruturados[field];
    if (!isFilled(prev) || !isFilled(curr)) continue;
    comparedFields.push(field);

    const pNum = parseLooseNumber(prev);
    const cNum = parseLooseNumber(curr);
    if (pNum !== null && cNum !== null) {
      const diff = cNum - pNum;
      const rel = Math.abs(diff) / Math.max(Math.abs(pNum), Math.abs(cNum), 1);
      if (rel < 0.1) continue;

      if (field === 'vfi' || field.startsWith('rnfl')) {
        if (diff < 0) worsening += 1;
        else improving += 1;
      } else if (field === 'escavacao' || field === 'psd') {
        if (diff > 0) worsening += 1;
        else improving += 1;
      } else if (field === 'md') {
        if (cNum < pNum) worsening += 1;
        else improving += 1;
      } else {
        if (rel >= 0.25) worsening += 1;
      }

      if (keyTemporalChanges.length < 4) {
        keyTemporalChanges.push(`${field}: ${pNum} -> ${cNum}.`);
      }
      continue;
    }

    const pText = normalizeText(prev);
    const cText = normalizeText(curr);
    if (!pText || !cText || pText === cText) continue;
    if (
      /(piora|progress|fluido|hemorrag|exsud|drusa|defeito|aument)/i.test(cText) &&
      !/(piora|progress|fluido|hemorrag|exsud|drusa|defeito|aument)/i.test(pText)
    ) {
      worsening += 1;
    }
    if (
      /(melhor|est[aá]vel|sem fluido|redu[cç][aã]o|resolu)/i.test(cText) &&
      !/(melhor|est[aá]vel|sem fluido|redu[cç][aã]o|resolu)/i.test(pText)
    ) {
      improving += 1;
    }
    if (keyTemporalChanges.length < 4) {
      keyTemporalChanges.push(`${field}: descrição temporal diferente.`);
    }
  }

  if (comparedFields.length === 0) {
    temporalLimitations.push('Campos temporais comparáveis insuficientes entre os exames.');
  }
  const prevTs = parseDateISO(previous.dataExame);
  const currTs = parseDateISO(current.dataExame);
  if (prevTs === null || currTs === null) {
    temporalLimitations.push('Ao menos uma data do exame não está disponível no padrão esperado.');
  }

  let status: TemporalStatus = 'stable';
  let progressionSummary = `Achados temporais sem mudança relevante em ${getEyeLabel(
    current.eye
  )}.`;

  if (comparedFields.length === 0) {
    status = 'insufficient_data';
    progressionSummary = 'Dados insuficientes para afirmar progressão temporal.';
  } else if (worsening >= 2 && worsening > improving) {
    status = 'possible_progression';
    progressionSummary = `Possível progressão no ${getEyeLabel(
      current.eye
    )}, a correlacionar com contexto clínico.`;
  } else if (improving >= 2 && improving > worsening) {
    status = 'possible_improvement';
    progressionSummary = `Possível melhora no ${getEyeLabel(
      current.eye
    )}, mantendo correlação clínica.`;
  }

  if (comparedFields.length < 2 && status !== 'insufficient_data') {
    temporalLimitations.push('Poucos campos comparáveis; interpretação temporal com cautela.');
  }

  return {
    examType: current.examType,
    examTypeLabel: EXAM_TYPE_LABELS[current.examType],
    eye: current.eye,
    eyeLabel: getEyeLabel(current.eye),
    previousDate: previous.dataExame ?? null,
    currentDate: current.dataExame ?? null,
    status,
    progressionSummary,
    keyTemporalChanges,
    temporalLimitations,
    comparedFields,
    previousFileName: previous.fileName,
    currentFileName: current.fileName,
  };
}

export function getTemporalStatusLabel(status: TemporalStatus): string {
  if (status === 'stable') return 'Sem mudança relevante';
  if (status === 'possible_progression') return 'Possível progressão';
  if (status === 'possible_improvement') return 'Possível melhora';
  return 'Dados insuficientes';
}

export function buildTemporalComparisons(items: TemporalComparableInput[]): TemporalComparison[] {
  const grouped = new Map<string, TemporalComparableInput[]>();
  for (const item of items) {
    const eye = normalizeEye(item.eye);
    const key = `${item.examType}::${eye}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ ...item, eye });
  }

  const out: TemporalComparison[] = [];
  for (const arr of grouped.values()) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort((a, b) => {
      const aTs = parseDateISO(a.dataExame);
      const bTs = parseDateISO(b.dataExame);
      if (aTs !== null && bTs !== null) return aTs - bTs;
      if (aTs !== null) return -1;
      if (bTs !== null) return 1;
      return (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0);
    });
    const current = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    if (!current || !previous) continue;
    out.push(compareTemporalSameExamType(previous, current));
  }
  return out;
}
