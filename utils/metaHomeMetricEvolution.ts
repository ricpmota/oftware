import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { formatBioRegistroPtBrShort, parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import { getBioMainMetrics } from '@/utils/bioImpedanciaMetrics';
import {
  buildMetaHomeReferenciaOptions,
  getBioAteData,
  getEvolucaoAteData,
  getPesoNaDataReferencia,
} from '@/utils/metaHomeDataReferencia';

export type MetaHomeMetricId =
  | 'perdaPeso'
  | 'circunferencia'
  | 'imc'
  | 'gordura'
  | 'massaMuscular'
  | 'gorduraVisceral';

export interface MetaHomeMetricEvolutionPoint {
  data: string;
  valor: number | null;
}

export const META_HOME_METRIC_CONFIG: Record<
  MetaHomeMetricId,
  { label: string; unit: string; color: string }
> = {
  perdaPeso: { label: 'Perda de peso acumulado', unit: 'kg', color: '#0d9488' },
  circunferencia: { label: 'Circunferência abdominal', unit: 'cm', color: '#6366f1' },
  imc: { label: 'IMC', unit: 'kg/m²', color: '#8b5cf6' },
  gordura: { label: '% Gordura', unit: '%', color: '#f59e0b' },
  massaMuscular: { label: 'Massa muscular', unit: 'kg', color: '#10b981' },
  gorduraVisceral: { label: 'Gordura visceral', unit: '', color: '#ef4444' },
};

function getBaselineWeight(paciente: PacienteCompleto | null): number {
  if (!paciente) return 0;
  const evolucao = paciente.evolucaoSeguimento || [];
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const primeiroRegistro = evolucao.find((e) => e.weekIndex === 1);
  return primeiroRegistro?.peso || medidasIniciais?.peso || 0;
}

function getAlturaMetros(paciente: PacienteCompleto | null): number | null {
  const altura = paciente?.dadosClinicos?.medidasIniciais?.altura;
  if (altura == null || altura <= 0) return null;
  return Number(altura) / 100;
}

function getBioRegistros(paciente: PacienteCompleto | null): BioImpedanciaRegistro[] {
  return (paciente as { bioimpedanciaRegistros?: BioImpedanciaRegistro[] })?.bioimpedanciaRegistros || [];
}

function buildReferenciaTimelineSeries(
  paciente: PacienteCompleto | null,
  metricId: 'perdaPeso' | 'circunferencia' | 'imc'
): MetaHomeMetricEvolutionPoint[] {
  if (!paciente) return [];

  const options = buildMetaHomeReferenciaOptions(paciente).sort((a, b) => a.date.getTime() - b.date.getTime());
  const evolucao = paciente.evolucaoSeguimento || [];
  const bios = getBioRegistros(paciente);
  const pesoInicial = paciente.dadosClinicos?.medidasIniciais?.peso ?? null;
  const baseline = getBaselineWeight(paciente);
  const alturaMetros = getAlturaMetros(paciente);

  return options.map((opt) => {
    let valor: number | null = null;

    if (metricId === 'perdaPeso') {
      const peso = getPesoNaDataReferencia(evolucao, bios, opt.date, pesoInicial);
      valor = peso != null && baseline > 0 ? peso - baseline : null;
    } else if (metricId === 'circunferencia') {
      const ev = getEvolucaoAteData(evolucao, opt.date);
      const circ = ev?.circunferenciaAbdominal;
      if (circ != null && circ > 0) {
        valor = circ;
      } else {
        const bio = getBioAteData(bios, opt.date);
        const m = bio ? getBioMainMetrics(bio) : null;
        valor = m?.circunferenciaAbdominalCm ?? null;
      }
    } else if (metricId === 'imc') {
      const peso = getPesoNaDataReferencia(evolucao, bios, opt.date, pesoInicial);
      valor = alturaMetros && peso != null && peso > 0 ? peso / (alturaMetros * alturaMetros) : null;
    }

    return { data: formatBioRegistroPtBrShort(opt.date), valor };
  });
}

function buildBioExamSeries(
  paciente: PacienteCompleto | null,
  metricId: 'gordura' | 'massaMuscular' | 'gorduraVisceral'
): MetaHomeMetricEvolutionPoint[] {
  if (!paciente) return [];

  const bios = [...getBioRegistros(paciente)].sort(
    (a, b) => parseBioDataRegistro(a.dataRegistro).getTime() - parseBioDataRegistro(b.dataRegistro).getTime()
  );

  return bios
    .map((r) => {
      const m = getBioMainMetrics(r);
      let valor: number | null = null;
      if (metricId === 'gordura') valor = m.percentualGordura;
      else if (metricId === 'massaMuscular') valor = m.massaMuscularKg;
      else if (metricId === 'gorduraVisceral') valor = m.gorduraVisceral;

      return { data: formatBioRegistroPtBrShort(r.dataRegistro), valor };
    })
    .filter((p) => p.valor != null);
}

export function buildMetaHomeMetricEvolution(
  paciente: PacienteCompleto | null,
  metricId: MetaHomeMetricId
): MetaHomeMetricEvolutionPoint[] {
  if (!paciente) return [];

  if (metricId === 'gordura' || metricId === 'massaMuscular' || metricId === 'gorduraVisceral') {
    return buildBioExamSeries(paciente, metricId);
  }

  return buildReferenciaTimelineSeries(paciente, metricId);
}

export function metaHomeMetricHasEvolutionChart(
  paciente: PacienteCompleto | null,
  metricId: MetaHomeMetricId
): boolean {
  const points = buildMetaHomeMetricEvolution(paciente, metricId);
  return points.filter((p) => p.valor != null).length >= 2;
}
