/**
 * Helpers visuais do plano — curva de dose e marcadores na timeline.
 * FUTURO: doses vindas do Treatment Planning Engine / OI.
 */
import type { PontoCurvaPeso } from '@/types/planoTerapeuticoInterativo';
import type { EstimativaPlanoTratamento, MarcadorTimelineTratamento } from '@/lib/treatment-designer/types';
import { clampMesesSlider } from '@/lib/treatment-designer/legacyTresCenarios';

export const META_SLIDER_MIN_KG = 5;
export const META_SLIDER_MAX_KG = 25;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampMetaSlider(metaKg: number): number {
  return clamp(Math.round(metaKg * 10) / 10, META_SLIDER_MIN_KG, META_SLIDER_MAX_KG);
}

export function metaInicialDoPlano(metaKg: number | null): number {
  if (metaKg == null || metaKg <= 0) return 12;
  return clampMetaSlider(metaKg);
}

/**
 * Distribuição visual de dose semanal — placeholder até OI fornecer curva real.
 */
export function derivarDosesSemanaisVisuais(totalMg: number, semanas: number): number[] {
  const n = Math.max(1, Math.round(semanas));
  const alvoMedio = totalMg / n;
  const doses: number[] = [];
  let doseAtual = 2.5;

  for (let w = 1; w <= n; w++) {
    doses.push(doseAtual);
    const mediaParcial = doses.reduce((s, d) => s + d, 0) / doses.length;
    if (w % 2 === 0 && mediaParcial < alvoMedio * 0.9 && doseAtual < 15) {
      doseAtual = Math.min(15, Math.round((doseAtual + 2.5) * 10) / 10);
    }
  }

  const soma = doses.reduce((s, d) => s + d, 0);
  if (soma <= 0 || totalMg <= 0) return doses;
  const fator = totalMg / soma;
  return doses.map((d) => Math.round(d * fator * 10) / 10);
}

function distribuirMarcadores(
  total: number,
  semanas: number,
  tipo: MarcadorTimelineTratamento['tipo'],
  rotulo: string
): MarcadorTimelineTratamento[] {
  if (total <= 0 || semanas <= 0) return [];
  const marcadores: MarcadorTimelineTratamento[] = [];
  for (let i = 1; i <= total; i++) {
    const semana = Math.max(1, Math.min(semanas, Math.round((i * semanas) / (total + 1))));
    marcadores.push({ semana, tipo, rotulo });
  }
  return marcadores;
}

export function gerarMarcadoresTimeline(
  est: EstimativaPlanoTratamento
): MarcadorTimelineTratamento[] {
  const s = est.duracaoSemanas;
  const marcadores: MarcadorTimelineTratamento[] = [
    ...distribuirMarcadores(est.consultasIncluidas, s, 'consulta', 'Consulta'),
    ...distribuirMarcadores(est.bioimpedanciasIncluidas, s, 'bioimpedancia', 'Bioimpedância'),
    ...distribuirMarcadores(est.examesIncluidos, s, 'exame', 'Exame'),
  ];

  const reavaliacoes = Math.max(1, Math.floor(s / 8));
  for (let i = 1; i <= reavaliacoes; i++) {
    const semana = Math.round((i * s) / (reavaliacoes + 1));
    marcadores.push({ semana, tipo: 'reavaliacao', rotulo: 'Reavaliação' });
  }

  return marcadores.sort((a, b) => a.semana - b.semana);
}

export function formatarPrazoMeses(
  meses: number,
  options?: { usarClampSlider?: boolean }
): string {
  const m =
    options?.usarClampSlider === false
      ? Math.max(1, Math.round(meses))
      : clampMesesSlider(meses);
  return `${m} ${m === 1 ? 'mês' : 'meses'}`;
}

export function formatarMetaKg(metaKg: number): string {
  return `${metaKg.toFixed(1).replace('.0', '')} kg`;
}

export function formatarFrequenciaPorMes(total: number, meses: number): string {
  if (meses <= 0 || total <= 0) return '—';
  const porMes = total / meses;
  if (porMes >= 0.95 && porMes <= 1.05) return '1x por mês';
  if (porMes >= 1.9 && porMes <= 2.1) return '2x por mês';
  return `${porMes.toFixed(1).replace('.0', '')}x por mês`;
}

export function formatarFrequenciaPorSemana(total: number, semanas: number): string {
  if (semanas <= 0 || total <= 0) return '—';
  const porSemana = total / semanas;
  if (porSemana >= 0.95 && porSemana <= 1.05) return '1x por semana';
  return `${porSemana.toFixed(1).replace('.0', '')}x por semana`;
}

export function gerarCurvaPesoPorPerdaKg(
  pesoInicio: number,
  perdaKg: number,
  duracaoSemanas: number
): PontoCurvaPeso[] {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  const perda = Math.max(0, perdaKg);
  const alvo = Math.max(0, pesoInicio - perda);
  const pontos: PontoCurvaPeso[] = [{ semana: 0, pesoKg: Math.round(pesoInicio * 10) / 10 }];

  for (let s = 1; s <= semanas; s++) {
    const eased = 1 - Math.pow(1 - s / semanas, 1.15);
    const peso = pesoInicio - perda * eased;
    pontos.push({ semana: s, pesoKg: Math.round(peso * 10) / 10 });
  }
  if (pontos[pontos.length - 1].pesoKg !== Math.round(alvo * 10) / 10) {
    pontos[pontos.length - 1] = { semana: semanas, pesoKg: Math.round(alvo * 10) / 10 };
  }
  return pontos;
}

export function calcularPesoAlvo(pesoAtual: number | null, metaKg: number): number | null {
  if (pesoAtual == null) return null;
  return Math.max(0, Math.round((pesoAtual - metaKg) * 10) / 10);
}
