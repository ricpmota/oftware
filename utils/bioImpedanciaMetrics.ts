import type { BioImpedanciaRegistro, BioOrigemExame } from '@/types/bioImpedancia';
import { getBioRange, type Sex } from '@/utils/bioImpedanciaRanges';

export type BioMetricStatus = 'saudavel' | 'atencao' | 'alto' | 'baixo' | 'neutro';

export interface BioMainMetrics {
  peso: number | null;
  imc: number | null;
  percentualGordura: number | null;
  massaGorduraKg: number | null;
  massaMuscularKg: number | null;
  massaMuscularEsqueleticaKg: number | null;
  gorduraVisceral: number | null;
  aguaPercentual: number | null;
  aguaKg: number | null;
  metabolismoBasalKcal: number | null;
  massaOsseaKg: number | null;
  circunferenciaAbdominalCm: number | null;
  proteinasKg: number | null;
  mineraisKg: number | null;
}

export interface BioAvailableSections {
  resumo: boolean;
  composicao: boolean;
  segmentar: boolean;
  avancados: boolean;
  evolucao: boolean;
}

function numPos(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  return v;
}

function hasSegmentarData(
  seg?: { arm_r: { kg: number }; arm_l: { kg: number }; trunk: { kg: number }; leg_r: { kg: number }; leg_l: { kg: number } } | null
): boolean {
  if (!seg) return false;
  return ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'].some((k) => {
    const s = seg[k as keyof typeof seg];
    return s && (s.kg > 0 || s.percentual > 0);
  });
}

/** Unifica campos novos e legados para exibição */
export function getBioMainMetrics(registro: BioImpedanciaRegistro): BioMainMetrics {
  const peso = numPos(registro.peso);
  const aguaLitros =
    numPos(registro.aguaKg) ??
    numPos(registro.composicaoCorporal?.aguaTotalLitros) ??
    null;
  const aguaKg = aguaLitros;

  const percentualGordura =
    numPos(registro.percentualGordura) ??
    numPos(registro.analiseObesidade?.percentualGordura) ??
    null;

  const massaGorduraKg =
    numPos(registro.massaGorduraKg) ??
    numPos(registro.analiseMusculoGordura?.massaGorduraKg) ??
    numPos(registro.composicaoCorporal?.massaGorduraKg) ??
    null;

  const massaMuscularKg =
    numPos(registro.massaMuscularKg) ??
    numPos(registro.analiseMusculoGordura?.massaMuscularKg) ??
    null;

  const massaMuscularEsqueleticaKg = numPos(registro.massaMuscularEsqueleticaKg);

  const aguaPercentual =
    numPos(registro.aguaPercentual) ??
    (aguaKg != null && peso != null ? (aguaKg / peso) * 100 : null);

  let imc = numPos(registro.imc);
  if (imc == null && peso != null) {
    // IMC não vem no registro — deixar null (altura não está no registro bio)
    imc = null;
  }

  return {
    peso,
    imc,
    percentualGordura,
    massaGorduraKg,
    massaMuscularKg: massaMuscularKg ?? massaMuscularEsqueleticaKg,
    massaMuscularEsqueleticaKg,
    gorduraVisceral: numPos(registro.gorduraVisceral),
    aguaPercentual,
    aguaKg,
    metabolismoBasalKcal: numPos(registro.metabolismoBasalKcal),
    massaOsseaKg: numPos(registro.massaOsseaKg),
    circunferenciaAbdominalCm: numPos(registro.circunferenciaAbdominalCm),
    proteinasKg: numPos(registro.composicaoCorporal?.proteinasKg),
    mineraisKg: numPos(registro.composicaoCorporal?.mineraisKg),
  };
}

export function getBioAvailableSections(registro: BioImpedanciaRegistro): BioAvailableSections {
  const m = getBioMainMetrics(registro);
  const resumo =
    m.peso != null ||
    m.percentualGordura != null ||
    m.massaMuscularKg != null ||
    m.gorduraVisceral != null;

  const composicao =
    m.aguaKg != null ||
    m.massaGorduraKg != null ||
    m.massaMuscularKg != null ||
    m.proteinasKg != null ||
    m.mineraisKg != null ||
    m.massaOsseaKg != null ||
    m.metabolismoBasalKcal != null;

  const segmentar =
    hasSegmentarData(registro.massaMagraSegmentar) ||
    hasSegmentarData(registro.gorduraSegmentar ?? null);

  const avancados =
    m.metabolismoBasalKcal != null ||
    m.massaOsseaKg != null ||
    m.circunferenciaAbdominalCm != null ||
    m.aguaPercentual != null ||
    m.massaMuscularEsqueleticaKg != null;

  return {
    resumo,
    composicao,
    segmentar,
    avancados,
    evolucao: resumo,
  };
}

export function inferBioOrigem(registro: BioImpedanciaRegistro): BioOrigemExame {
  if (registro.origemExame) return registro.origemExame;
  const sections = getBioAvailableSections(registro);
  const m = getBioMainMetrics(registro);
  if (sections.segmentar && m.proteinasKg != null && m.mineraisKg != null) return 'inbody';
  if (sections.segmentar) return 'tanita';
  if (m.percentualGordura != null && m.peso != null && !sections.composicao) return 'generica';
  return 'generica';
}

export function getBioMetricStatus(
  fieldKey: string,
  value: number | null,
  sex?: Sex | 'Outro' | null,
  peso?: number | null
): BioMetricStatus {
  if (value == null) return 'neutro';

  if (fieldKey === 'gorduraVisceral') {
    if (value < 10) return 'saudavel';
    if (value <= 14) return 'atencao';
    return 'alto';
  }

  const range = getBioRange(fieldKey, sex, peso);
  if (!range) return 'neutro';

  if (value < range.min) return 'baixo';
  if (value > range.max) return 'alto';
  const margin = (range.max - range.min) * 0.15;
  if (value <= range.min + margin || value >= range.max - margin) return 'atencao';
  return 'saudavel';
}

/** Classificação OMS do IMC para badge na home do paciente. */
export function getImcGrauObesidadeBadge(imc: number | null): { label: string; pill: string } | null {
  if (imc == null || !Number.isFinite(imc) || imc <= 0) return null;
  if (imc < 18.5) return { label: 'Abaixo', pill: 'bg-blue-50 text-blue-800 border-blue-200' };
  if (imc < 25) return { label: 'Normal', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (imc < 30) return { label: 'Sobrepeso', pill: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (imc < 35) return { label: 'Grau I', pill: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
  if (imc < 40) return { label: 'Grau II', pill: 'bg-orange-50 text-orange-800 border-orange-200' };
  return { label: 'Grau III', pill: 'bg-red-50 text-red-800 border-red-200' };
}

export const BIO_STATUS_STYLES: Record<
  BioMetricStatus,
  { pill: string; text: string; label: string }
> = {
  saudavel: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    label: 'Saudável',
  },
  atencao: {
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'text-amber-700',
    label: 'Atenção',
  },
  alto: {
    pill: 'bg-red-50 text-red-700 border-red-200',
    text: 'text-red-600',
    label: 'Alto',
  },
  baixo: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-600',
    label: 'Baixo',
  },
  neutro: {
    pill: 'bg-gray-50 text-gray-600 border-gray-200',
    text: 'text-gray-600',
    label: '—',
  },
};

export type BioQualityInsightType =
  | 'excelente'
  | 'gordura_predominante'
  | 'atencao_massa_magra'
  | 'recomposicao'
  | 'piora'
  | 'plato'
  | 'neutro';

export interface BioQualityInsight {
  type: BioQualityInsightType;
  title: string;
  description: string;
}

const QUALITY_COPY: Record<BioQualityInsightType, { title: string; description: string }> = {
  excelente: {
    title: 'Perda de peso com preservação muscular',
    description: 'Peso e gordura diminuíram enquanto a massa muscular se manteve estável. Ótimo sinal metabólico.',
  },
  gordura_predominante: {
    title: 'Perda de gordura predominante',
    description: 'A redução de peso parece vir principalmente da gordura corporal.',
  },
  atencao_massa_magra: {
    title: 'Atenção para perda de massa magra',
    description: 'Houve queda de peso acompanhada de redução relevante da massa muscular. Vale revisar proteína, treino e déficit.',
  },
  recomposicao: {
    title: 'Recomposição corporal',
    description: 'Peso estável ou leve, com gordura menor e músculo em alta. Padrão de recomposição favorável.',
  },
  piora: {
    title: 'Ganho de peso e gordura',
    description: 'Peso e percentual de gordura aumentaram desde o exame anterior.',
  },
  plato: {
    title: 'Possível platô',
    description: 'Pouca variação entre os últimos exames. Pode ser momento de revisar estratégia.',
  },
  neutro: {
    title: 'Evolução em análise',
    description: 'Compare os próximos exames para identificar tendência com mais clareza.',
  },
};

export function getBioQualityInsight(
  atual: BioImpedanciaRegistro,
  anterior: BioImpedanciaRegistro | null
): BioQualityInsight {
  if (!anterior) {
    return { type: 'neutro', ...QUALITY_COPY.neutro };
  }

  const ca = getBioMainMetrics(atual);
  const cb = getBioMainMetrics(anterior);
  const tol = 0.3;

  const dPeso = (ca.peso ?? 0) - (cb.peso ?? 0);
  const dGord = (ca.percentualGordura ?? 0) - (cb.percentualGordura ?? 0);
  const dMusculo = (ca.massaMuscularKg ?? 0) - (cb.massaMuscularKg ?? 0);

  const pesoCaiu = dPeso < -tol;
  const pesoSubiu = dPeso > tol;
  const pesoEstavel = !pesoCaiu && !pesoSubiu;
  const gordCaiu = dGord < -0.5;
  const gordSubiu = dGord > 0.5;
  const musculoEstavel = Math.abs(dMusculo) <= tol;
  const musculoCaiu = dMusculo < -tol;
  const musculoSubiu = dMusculo > tol;

  let type: BioQualityInsightType = 'neutro';

  if (pesoCaiu && gordCaiu && musculoEstavel) type = 'excelente';
  else if (pesoCaiu && musculoCaiu && Math.abs(dMusculo) > tol * 2) type = 'atencao_massa_magra';
  else if (pesoCaiu && gordCaiu) type = 'gordura_predominante';
  else if (pesoEstavel && gordCaiu && musculoSubiu) type = 'recomposicao';
  else if (pesoSubiu && gordSubiu) type = 'piora';
  else if (pesoEstavel && Math.abs(dGord) < 0.5 && Math.abs(dMusculo) < tol) type = 'plato';

  return { type, ...QUALITY_COPY[type] };
}

export function formatBioDelta(atual: number | null, anterior: number | null, unit: string): string | null {
  if (atual == null || anterior == null) return null;
  const d = atual - anterior;
  if (Math.abs(d) < 0.05) return 'Estável vs último exame';
  const sign = d > 0 ? '+' : '';
  const dec = unit === '%' ? 1 : 1;
  return `${sign}${d.toFixed(dec)} ${unit} desde último exame`;
}
