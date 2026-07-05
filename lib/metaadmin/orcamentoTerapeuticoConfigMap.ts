import { DESCONTOS_VOLUME_MG_PADRAO } from '@/lib/metaadmin/planoTerapeuticoComercial';
import type {
  DescontoVolumeMg,
  OrcamentoTerapeuticoConfig,
} from '@/types/orcamentoTerapeuticoConfig';
import { DOSES_MENSAIS_PADRAO_MG } from '@/types/orcamentoTerapeuticoConfig';

export const ORCAMENTO_TERAPEUTICO_CONFIG_DOC_ID = 'orcamentoTerapeutico';

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapDescontosVolumeMg(raw: unknown): DescontoVolumeMg[] {
  if (!Array.isArray(raw) || raw.length === 0) return DESCONTOS_VOLUME_MG_PADRAO;
  const parsed = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const minMg = Number(row.minMg);
      const descontoPercentual = Number(row.descontoPercentual);
      if (!Number.isFinite(minMg) || !Number.isFinite(descontoPercentual)) return null;
      return {
        minMg: Math.max(0, minMg),
        descontoPercentual: Math.max(0, descontoPercentual),
      };
    })
    .filter((x): x is DescontoVolumeMg => x != null);
  return parsed.length > 0 ? parsed : DESCONTOS_VOLUME_MG_PADRAO;
}

export function mapDosesMensais(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DOSES_MENSAIS_PADRAO_MG];
  const parsed = raw
    .map((v) => Math.round(Number(v) * 10) / 10)
    .filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length > 0 ? parsed : [...DOSES_MENSAIS_PADRAO_MG];
}

export function mapOrcamentoTerapeuticoConfigFromFirestore(
  medicoId: string,
  data: Record<string, unknown>,
  dates?: { createdAt: Date; updatedAt: Date }
): OrcamentoTerapeuticoConfig {
  const tipoRaw = data.tipoDescontoMaximo;
  const tipoDescontoMaximo =
    tipoRaw === 'valor' || tipoRaw === 'percentual' ? tipoRaw : 'percentual';

  const toDate = (value: unknown, fallback: Date): Date => {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'toDate' in value) {
      return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return fallback;
  };

  const now = new Date();

  return {
    medicoId,
    valorPorMg: num(data.valorPorMg),
    valorPorKitAplicacao: num(data.valorPorKitAplicacao),
    valorPorConsulta: num(data.valorPorConsulta),
    valorPorBioimpedancia: num(data.valorPorBioimpedancia),
    valorPorExame: num(data.valorPorExame),
    outrosCustosPadrao: num(data.outrosCustosPadrao),
    margemPadraoPercentual: 0,
    descontoMaximo: num(data.descontoMaximo),
    tipoDescontoMaximo,
    consultasPorMesPadrao: num(data.consultasPorMesPadrao, 1),
    bioimpedanciasPorMesPadrao: num(data.bioimpedanciasPorMesPadrao, 0.5),
    examesPorPlanoPadrao: num(data.examesPorPlanoPadrao, 2),
    descontosPorVolumeMg: mapDescontosVolumeMg(data.descontosPorVolumeMg),
    doseInicialMensalMg: num(data.doseInicialMensalMg, 2.5),
    aplicacoesMensais: Math.max(1, Math.round(num(data.aplicacoesMensais, 4))),
    dosesMensaisDisponiveisMg: mapDosesMensais(data.dosesMensaisDisponiveisMg),
    descontoPlanoTrimestralPercentual: num(data.descontoPlanoTrimestralPercentual),
    descontoPlanoSemestralPercentual: num(data.descontoPlanoSemestralPercentual),
    createdAt: dates?.createdAt ?? toDate(data.createdAt, now),
    updatedAt: dates?.updatedAt ?? toDate(data.updatedAt, now),
  };
}
