/**
 * Pós-processamento leve, validação suave e avaliação de qualidade da extração oftalmológica.
 * Não altera dados clínicos de propósito — apenas limpa, padroniza flags e sinaliza revisão.
 */

import {
  getExamTypeLabel,
  OFTALMO_EXAM_TYPES,
  STRUCTURED_FIELDS_BY_TYPE,
  type OftalmoExamType,
} from '@/lib/oftpay/laudoOftalmoExtraction';
import { buildChecklistCoverage, getChecklistStatusLabel } from '@/lib/oftpay/laudoOftalmoChecklist';
import {
  detectEyeFromExtraction,
  getEyeLabel,
  normalizeEye,
  type OftalmoEye,
} from '@/lib/oftpay/laudoOftalmoEye';
import type {
  LaudoOftalmoExtracaoData,
  LaudoQualityFlag,
  LaudoReviewStatus,
} from '@/lib/oftpay/laudoOftalmoExtracaoData';

/** Flags canônicas (snake_case); legadas do modelo são mapeadas quando possível. */
export const CANONICAL_QUALITY_FLAGS: readonly LaudoQualityFlag[] = [
  'missing_key_fields',
  'low_confidence_extraction',
  'possible_ocr_issue',
  'exam_type_fallback_used',
  'possible_exam_type_mismatch',
  'limited_interpretability',
  'review_recommended',
] as const;

/** Rótulos curtos para UI (PT-BR). */
export const QUALITY_FLAG_LABELS_PT: Record<LaudoQualityFlag, string> = {
  missing_key_fields: 'Campos-chave ausentes',
  low_confidence_extraction: 'Baixa confiança na extração',
  possible_ocr_issue: 'Possível problema de OCR/imagem',
  exam_type_fallback_used: 'Tipo de exame genérico (fallback)',
  possible_exam_type_mismatch: 'Possível divergência do tipo de exame',
  limited_interpretability: 'Interpretabilidade limitada',
  review_recommended: 'Revisão recomendada',
};

/** Labels amigáveis por chave estruturada (todas modalidades). */
const STRUCTURED_FIELD_LABELS: Record<string, string> = {
  espessura_central: 'Espessura central',
  menor_espessura: 'Menor espessura',
  localizacao_ponto_mais_fino: 'Ponto mais fino',
  assimetria_ou_observacoes: 'Assimetria / obs.',
  k1: 'K1',
  k2: 'K2',
  km: 'Km',
  astigmatismo: 'Astigmatismo',
  eixo: 'Eixo',
  padrao_curvatura: 'Padrão de curvatura',
  sinais_sugestivos_ectasia: 'Sinais (ectasia)',
  paquimetria_minima: 'Paquimetria mín.',
  elevacao_anterior: 'Elevação anterior',
  elevacao_posterior: 'Elevação posterior',
  indices_ectasia: 'Índices (ectasia)',
  densidade_endotelial: 'Densidade endotelial',
  hexagonalidade: 'Hexagonalidade',
  polimegatismo: 'Polimegatismo',
  pleomorfismo: 'Pleomorfismo',
  observacoes_endoteliais: 'Obs. endoteliais',
  confiabilidade: 'Confiabilidade',
  perdas_fixacao: 'Perdas de fixação',
  falso_positivo: 'Falso positivo',
  falso_negativo: 'Falso negativo',
  md: 'MD',
  psd: 'PSD',
  vfi: 'VFI',
  ght: 'GHT',
  padrao_defeito: 'Padrão do defeito',
  disco_optico: 'Disco óptico',
  escavacao: 'Escavação',
  macula: 'Mácula',
  vasos: 'Vasos',
  hemorragias: 'Hemorragias',
  exsudatos: 'Exsudatos',
  drusas: 'Drusas',
  outras_alteracoes: 'Outras alterações',
  rnfl_global: 'RNFL global',
  rnfl_superior: 'RNFL superior',
  rnfl_inferior: 'RNFL inferior',
  rnfl_nasal: 'RNFL nasal',
  rnfl_temporal: 'RNFL temporal',
  assimetria: 'Assimetria',
  observacoes_estruturais: 'Obs. estruturais',
  fluido_intrarretiniano: 'Fluido intrarretiniano',
  fluido_subrretiniano: 'Fluido subretiniano',
  cistos: 'Cistos',
  ped: 'PED',
  membrana_epirretiniana: 'Membrana epirretiniana',
  tracao_vitreo_macular: 'Tração vitreomacular',
  observacoes_maculares: 'Obs. maculares',
};

function isFilled(v: string | number | null | undefined): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
}

/** Limpa strings; preserva números; não “corrige” clinicamente. */
export function postProcessStructuredFields(
  examType: OftalmoExamType,
  raw: Record<string, string | number | null>
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};

  for (const key of STRUCTURED_FIELDS_BY_TYPE[examType]) {
    const v = raw[key];
    if (v === null || v === undefined) {
      out[key] = null;
      continue;
    }
    if (typeof v === 'number') {
      out[key] = Number.isFinite(v) ? v : null;
      continue;
    }
    if (typeof v === 'string') {
      let s = v.replace(/\s+/g, ' ').trim();
      if (s === '') {
        out[key] = null;
        continue;
      }
      out[key] = s;
      continue;
    }
    out[key] = String(v).replace(/\s+/g, ' ').trim() || null;
  }

  return out;
}

function mapLegacyQualityFlag(raw: string): LaudoQualityFlag | null {
  const t = raw.trim().toLowerCase();
  const map: Record<string, LaudoQualityFlag> = {
    imagem_tremida: 'possible_ocr_issue',
    baixa_resolucao: 'possible_ocr_issue',
    baixa_resolução: 'possible_ocr_issue',
    ocr: 'possible_ocr_issue',
    documento_incompleto: 'limited_interpretability',
    ilegivel: 'possible_ocr_issue',
    ilegível: 'possible_ocr_issue',
  };
  if (map[t]) return map[t];
  if ((CANONICAL_QUALITY_FLAGS as readonly string[]).includes(t)) return t as LaudoQualityFlag;
  return null;
}

function normalizeQualityFlagsList(
  fromModel: string[],
  extras: LaudoQualityFlag[]
): LaudoQualityFlag[] {
  const set = new Set<LaudoQualityFlag>();
  for (const x of fromModel) {
    const c = mapLegacyQualityFlag(x);
    if (c) set.add(c);
  }
  for (const x of extras) set.add(x);
  return Array.from(set);
}

type ExamTypeSuggestion = {
  suggestedExamType: OftalmoExamType;
  examTypeConfidence: number;
  examTypeSuggestionReason: string;
};

const EXAM_TYPE_CUES: Record<OftalmoExamType, Array<{ pattern: RegExp; weight: number; reason: string }>> = {
  oct_disco: [
    { pattern: /\brnfl\b/i, weight: 3, reason: 'RNFL' },
    { pattern: /\bclock\s*hours?\b/i, weight: 2, reason: 'clock hours' },
    { pattern: /\bquadrantes?\b/i, weight: 1.5, reason: 'quadrantes' },
    { pattern: /\bnervo[\s-]*o[óo]ptico\b/i, weight: 1.5, reason: 'nervo óptico' },
  ],
  oct_macula: [
    { pattern: /\bespessura\s+macular\b/i, weight: 2.5, reason: 'espessura macular' },
    { pattern: /\bfluido\s+sub[\s-]*retiniano\b/i, weight: 2.5, reason: 'fluido sub-retiniano' },
    { pattern: /\bfluido\s+intra[\s-]*retiniano\b/i, weight: 2.5, reason: 'fluido intrarretiniano' },
    { pattern: /\bped\b/i, weight: 2.2, reason: 'PED' },
    { pattern: /\bmembrana\s+epirretiniana\b/i, weight: 2.2, reason: 'membrana epirretiniana' },
    { pattern: /\btra[cç][aã]o\s+vitreo[\s-]*macular\b/i, weight: 2.2, reason: 'tração vitreomacular' },
  ],
  campimetria: [
    { pattern: /\bmd\b/i, weight: 2.2, reason: 'MD' },
    { pattern: /\bpsd\b/i, weight: 2.2, reason: 'PSD' },
    { pattern: /\bvfi\b/i, weight: 2.2, reason: 'VFI' },
    { pattern: /\bght\b/i, weight: 2.2, reason: 'GHT' },
    { pattern: /\bfixation\s+losses?\b/i, weight: 2, reason: 'fixation losses' },
    { pattern: /\bperdas?\s+de\s+fixa[cç][aã]o\b/i, weight: 2, reason: 'perdas de fixação' },
  ],
  topografia: [
    { pattern: /\bk1\b/i, weight: 1.8, reason: 'K1' },
    { pattern: /\bk2\b/i, weight: 1.8, reason: 'K2' },
    { pattern: /\bkm\b/i, weight: 1.8, reason: 'Km' },
    { pattern: /\bastigmatismo\b/i, weight: 2, reason: 'astigmatismo' },
    { pattern: /\beixo\b/i, weight: 1.8, reason: 'eixo' },
  ],
  galilei: [
    { pattern: /\beleva[cç][aã]o\s+posterior\b/i, weight: 2.4, reason: 'elevação posterior' },
    { pattern: /\bpaquimetria\s+m[ií]nima\b/i, weight: 2.4, reason: 'paquimetria mínima' },
    { pattern: /\bectasia\b/i, weight: 2, reason: 'ectasia' },
  ],
  microscopia: [
    { pattern: /\bdensidade\s+endotelial\b/i, weight: 3, reason: 'densidade endotelial' },
    { pattern: /\bhexagonalidade\b/i, weight: 2.4, reason: 'hexagonalidade' },
    { pattern: /\bpolimegatismo\b/i, weight: 2, reason: 'polimegatismo' },
  ],
  retinografia: [
    { pattern: /\bdrusas\b/i, weight: 2.4, reason: 'drusas' },
    { pattern: /\bhemorragias?\b/i, weight: 2, reason: 'hemorragias' },
    { pattern: /\bexsudatos?\b/i, weight: 2, reason: 'exsudatos' },
    { pattern: /\bvasos?\b/i, weight: 1.5, reason: 'vasos' },
    { pattern: /\bdisco\s+[oó]ptico\b/i, weight: 1.8, reason: 'disco óptico' },
  ],
  paquimetria: [
    { pattern: /\bespessura\s+central\b/i, weight: 2, reason: 'espessura central' },
    { pattern: /\bponto\s+mais\s+fino\b/i, weight: 2, reason: 'ponto mais fino' },
  ],
};

function buildSuggestionCorpus(
  campos: Record<string, string | number | null>,
  rawSummary: string | null,
  avisos: string[],
  examesNaoMapeados: string[]
): string {
  const chunks: string[] = [];
  if (rawSummary) chunks.push(rawSummary);
  if (avisos.length > 0) chunks.push(avisos.join(' '));
  if (examesNaoMapeados.length > 0) chunks.push(examesNaoMapeados.join(' '));
  for (const value of Object.values(campos)) {
    if (!isFilled(value)) continue;
    chunks.push(String(value));
  }
  return chunks.join(' \n ').trim();
}

export function suggestExamTypeFromExtraction(
  params: {
    examType: OftalmoExamType;
    camposEstruturados: Record<string, string | number | null>;
    rawSummary: string | null;
    avisos: string[];
    examesNaoMapeados: string[];
  }
): ExamTypeSuggestion | null {
  const corpus = buildSuggestionCorpus(
    params.camposEstruturados,
    params.rawSummary,
    params.avisos,
    params.examesNaoMapeados
  );
  if (!corpus) return null;

  const scoreByType: Record<OftalmoExamType, number> = {
    paquimetria: 0,
    topografia: 0,
    galilei: 0,
    microscopia: 0,
    campimetria: 0,
    retinografia: 0,
    oct_disco: 0,
    oct_macula: 0,
  };
  const reasonsByType: Record<OftalmoExamType, string[]> = {
    paquimetria: [],
    topografia: [],
    galilei: [],
    microscopia: [],
    campimetria: [],
    retinografia: [],
    oct_disco: [],
    oct_macula: [],
  };

  for (const type of OFTALMO_EXAM_TYPES) {
    for (const cue of EXAM_TYPE_CUES[type]) {
      if (!cue.pattern.test(corpus)) continue;
      scoreByType[type] += cue.weight;
      if (reasonsByType[type].length < 3) reasonsByType[type].push(cue.reason);
    }
  }

  const ranked = [...OFTALMO_EXAM_TYPES]
    .map((type) => ({ type, score: scoreByType[type] }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.score < 2.4) return null;

  const gap = Math.max(0, top.score - (second?.score ?? 0));
  const confidenceRaw = Math.min(0.97, 0.45 + top.score / 10 + gap / 12);
  const examTypeConfidence = Number(confidenceRaw.toFixed(2));
  if (examTypeConfidence < 0.55) return null;

  const reasonTokens = reasonsByType[top.type];
  const examTypeSuggestionReason =
    reasonTokens.length > 0
      ? `Pistas detectadas: ${reasonTokens.join(', ')}.`
      : `Termos do conteúdo sugerem ${getExamTypeLabel(top.type)}.`;

  return {
    suggestedExamType: top.type,
    examTypeConfidence,
    examTypeSuggestionReason,
  };
}

/** Campos mínimos esperados por modalidade (presença de pelo menos um reduz missing_key_fields). */
const KEY_GROUPS: Record<OftalmoExamType, string[][]> = {
  paquimetria: [['espessura_central', 'menor_espessura', 'localizacao_ponto_mais_fino']],
  topografia: [['k1', 'k2', 'km']],
  galilei: [['k1', 'k2', 'km', 'paquimetria_minima']],
  microscopia: [['densidade_endotelial', 'observacoes_endoteliais']],
  campimetria: [['confiabilidade', 'md', 'psd', 'vfi', 'ght']],
  retinografia: [['disco_optico', 'macula', 'vasos', 'hemorragias', 'exsudatos', 'drusas', 'outras_alteracoes']],
  oct_disco: [['rnfl_global', 'rnfl_superior', 'rnfl_inferior', 'rnfl_nasal', 'rnfl_temporal']],
  oct_macula: [
    [
      'espessura_central',
      'fluido_intrarretiniano',
      'fluido_subrretiniano',
      'cistos',
      'ped',
      'observacoes_maculares',
    ],
  ],
};

function hasAnyFilled(
  campos: Record<string, string | number | null>,
  keys: string[]
): boolean {
  return keys.some((k) => isFilled(campos[k]));
}

function runSoftModalValidation(
  examType: OftalmoExamType,
  campos: Record<string, string | number | null>,
  avisos: string[]
): LaudoQualityFlag[] {
  const flags: LaudoQualityFlag[] = [];
  const keys = STRUCTURED_FIELDS_BY_TYPE[examType];
  const total = keys.length;
  const filled = keys.filter((k) => isFilled(campos[k])).length;
  const ratio = total > 0 ? filled / total : 0;

  if (ratio < 0.2 && total >= 4) {
    flags.push('limited_interpretability');
  }
  if (ratio < 0.35 && (avisos.length > 0 || ratio > 0)) {
    flags.push('low_confidence_extraction');
  }

  const groups = KEY_GROUPS[examType] ?? [];
  let anyGroupOk = false;
  for (const group of groups) {
    if (hasAnyFilled(campos, group)) anyGroupOk = true;
  }
  if (groups.length > 0 && !anyGroupOk) {
    flags.push('missing_key_fields');
  }

  const avisosJoined = avisos.join(' ').toLowerCase();
  if (
    /ilegí|ilegi|ocr|baixa resolu|tremid|sombra|cortad|desfocad|ruído|ruido/i.test(avisosJoined)
  ) {
    flags.push('possible_ocr_issue');
  }

  return flags;
}

export function getStructuredFieldLabel(_examType: OftalmoExamType, key: string): string {
  return STRUCTURED_FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Até `max` pares preenchidos para preview na UI. */
export function getStructuredFieldPreview(
  examType: OftalmoExamType,
  campos: Record<string, string | number | null>,
  max = 6
): { key: string; label: string; value: string }[] {
  const out: { key: string; label: string; value: string }[] = [];
  for (const key of STRUCTURED_FIELDS_BY_TYPE[examType]) {
    if (out.length >= max) break;
    const v = campos[key];
    if (!isFilled(v)) continue;
    const str = typeof v === 'number' ? String(v) : String(v).trim();
    const clipped = str.length > 100 ? `${str.slice(0, 97)}…` : str;
    out.push({ key, label: getStructuredFieldLabel(examType, key), value: clipped });
  }
  return out;
}

function buildQualitySummary(
  status: LaudoReviewStatus,
  flags: LaudoQualityFlag[],
  filled: number,
  total: number,
  examTypeMismatch: boolean,
  suggestedExamType: OftalmoExamType | null,
  checklistStatusText: string,
  checklistFilledCount: number,
  checklistTotal: number
): string {
  const parts: string[] = [];
  parts.push(`Extração: ${filled}/${total} campos preenchidos.`);
  parts.push(`Checklist: ${checklistFilledCount}/${checklistTotal} (${checklistStatusText}).`);
  if (examTypeMismatch && suggestedExamType) {
    parts.push(
      `Possível divergência de modalidade; sugestão automática: ${getExamTypeLabel(
        suggestedExamType
      )}.`
    );
  }
  if (status === 'ok') {
    parts.push('Qualidade aparentemente adequada para revisão rápida.');
  } else if (status === 'attention') {
    parts.push('Há pontos de atenção; confira os achados no documento original.');
  } else {
    parts.push('Leitura limitada ou dados insuficientes; revisão manual recomendada.');
  }
  if (flags.length > 0) {
    const labels = flags
      .slice(0, 4)
      .map((f) => QUALITY_FLAG_LABELS_PT[f] ?? f)
      .join('; ');
    parts.push(`Sinais: ${labels}${flags.length > 4 ? '…' : '.'}`);
  }
  return parts.join(' ');
}

function computeReviewStatus(
  flags: Set<LaudoQualityFlag>,
  filled: number,
  usedFallback: boolean,
  examTypeMismatch: boolean
): LaudoReviewStatus {
  if (usedFallback || flags.has('exam_type_fallback_used')) {
    return 'review';
  }
  if (examTypeMismatch || flags.has('possible_exam_type_mismatch')) {
    return 'attention';
  }
  if (filled === 0) {
    return 'review';
  }
  if (
    flags.has('missing_key_fields') ||
    flags.has('limited_interpretability') ||
    flags.has('possible_ocr_issue')
  ) {
    if (flags.has('missing_key_fields') && filled < 2) return 'review';
    return 'attention';
  }
  if (flags.has('low_confidence_extraction') || flags.has('review_recommended')) {
    return 'attention';
  }
  return 'ok';
}

export type FinalizeLaudoInput = {
  examType: OftalmoExamType;
  usedExamTypeFallback: boolean;
  fileName?: string | null;
  eye?: OftalmoEye | null;
  dataExame: string | null;
  camposEstruturadosRaw: Record<string, string | number | null>;
  examesNaoMapeados: string[];
  avisos: string[];
  rawSummary: string | null;
  qualityFlagsFromModel: string[];
};

/**
 * Aplica limpeza nos campos, consolida flags, resumo e status de revisão.
 */
export function finalizeLaudoExtractionData(input: FinalizeLaudoInput): LaudoOftalmoExtracaoData {
  const { examType, usedExamTypeFallback } = input;

  let camposEstruturados = postProcessStructuredFields(examType, input.camposEstruturadosRaw);
  const checklist = buildChecklistCoverage(examType, camposEstruturados);
  const checklistStatusText = getChecklistStatusLabel(checklist.checklistStatus);
  const suggestion = suggestExamTypeFromExtraction({
    examType,
    camposEstruturados,
    rawSummary: input.rawSummary,
    avisos: input.avisos,
    examesNaoMapeados: input.examesNaoMapeados,
  });
  const examTypeMismatch =
    !!suggestion &&
    suggestion.suggestedExamType !== examType &&
    suggestion.examTypeConfidence >= 0.65;

  const extras: LaudoQualityFlag[] = runSoftModalValidation(
    examType,
    camposEstruturados,
    input.avisos
  );
  if (usedExamTypeFallback) {
    extras.push('exam_type_fallback_used');
  }
  if (examTypeMismatch) {
    extras.push('possible_exam_type_mismatch');
  }

  const mergedFlags = normalizeQualityFlagsList(input.qualityFlagsFromModel, extras);

  const keys = STRUCTURED_FIELDS_BY_TYPE[examType];
  const filled = keys.filter((k) => isFilled(camposEstruturados[k])).length;

  let reviewStatus = computeReviewStatus(
    new Set(mergedFlags),
    filled,
    usedExamTypeFallback,
    examTypeMismatch
  );

  const finalFlags = [...mergedFlags];
  if (reviewStatus === 'review' && !finalFlags.includes('review_recommended')) {
    finalFlags.push('review_recommended');
  }

  const qualitySummary = buildQualitySummary(
    reviewStatus,
    finalFlags,
    filled,
    keys.length,
    examTypeMismatch,
    suggestion?.suggestedExamType ?? null,
    checklistStatusText,
    checklist.checklistFilledCount,
    checklist.checklistTotal
  );
  const detectedEyeInfo = detectEyeFromExtraction({
    fileName: input.fileName,
    rawSummary: input.rawSummary,
    avisos: input.avisos,
    examesNaoMapeados: input.examesNaoMapeados,
    camposEstruturados,
  });
  const providedEye = input.eye ? normalizeEye(input.eye) : 'nao_informado';
  const eye = providedEye !== 'nao_informado' ? providedEye : detectedEyeInfo.detectedEye;

  return {
    dataExame: input.dataExame,
    camposMapeados: {},
    examesNaoMapeados: input.examesNaoMapeados,
    avisos: input.avisos,
    examType,
    examTypeLabel: getExamTypeLabel(examType),
    camposEstruturados,
    rawSummary: rawSummaryTrim(input.rawSummary),
    qualityFlags: finalFlags,
    qualitySummary,
    reviewStatus,
    suggestedExamType: suggestion?.suggestedExamType ?? null,
    suggestedExamTypeLabel: suggestion ? getExamTypeLabel(suggestion.suggestedExamType) : null,
    examTypeConfidence: suggestion?.examTypeConfidence ?? null,
    examTypeSuggestionReason: suggestion?.examTypeSuggestionReason ?? null,
    examTypeMismatch,
    checklistCoverage: checklist.checklistCoverage,
    checklistFilledCount: checklist.checklistFilledCount,
    checklistTotal: checklist.checklistTotal,
    checklistStatus: checklist.checklistStatus,
    filledKeyFields: checklist.filledKeyFields,
    missingKeyFields: checklist.missingKeyFields,
    eye,
    eyeLabel: getEyeLabel(eye),
    detectedEye: detectedEyeInfo.detectedEye,
    detectedEyeLabel: getEyeLabel(detectedEyeInfo.detectedEye),
    eyeConfidence: detectedEyeInfo.eyeConfidence,
  };
}

function rawSummaryTrim(s: string | null): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  return s.replace(/\s+/g, ' ').trim();
}
