import type { PontoCurvaPeso } from '@/types/planoTerapeuticoInterativo';
import {
  PERDA_SEMANAL_MAX_KG,
  PERDA_SEMANAL_MEDIA_KG,
  PERDA_SEMANAL_MIN_KG,
} from '@/lib/planoTerapeutico/escadinhaDose';
import { limitarPerdaKgAoTeto } from '@/lib/planoTerapeutico/limitePerdaPonderal';

function arredondar1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Curva central de peso com perda média (1,0 kg/sem). */
export function gerarCurvaPesoFaixaPerda(
  pesoInicio: number,
  duracaoSemanas: number
): PontoCurvaPeso[] {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  const pontos: PontoCurvaPeso[] = [{ semana: 0, pesoKg: arredondar1(pesoInicio) }];

  for (let s = 1; s <= semanas; s++) {
    pontos.push({
      semana: s,
      pesoKg: arredondar1(Math.max(0, pesoInicio - s * PERDA_SEMANAL_MEDIA_KG)),
    });
  }
  return pontos;
}

export function pesoNaSemanaPorPerdaSemanal(
  pesoInicio: number,
  semana: number,
  perdaSemanalKg: number
): number {
  if (semana <= 0) return arredondar1(pesoInicio);
  return arredondar1(Math.max(0, pesoInicio - semana * perdaSemanalKg));
}

export function perdaTotalFaixaPeriodo(semanas: number): {
  minKg: number;
  maxKg: number;
  mediaKg: number;
} {
  const s = Math.max(1, semanas);
  return {
    minKg: arredondar1(s * PERDA_SEMANAL_MIN_KG),
    maxKg: arredondar1(s * PERDA_SEMANAL_MAX_KG),
    mediaKg: arredondar1(s * PERDA_SEMANAL_MEDIA_KG),
  };
}

/** Faixa de perda no período limitada ao teto de 22% do peso. */
export function perdaTotalFaixaPeriodoComLimite(
  pesoKg: number | null,
  semanas: number
): { minKg: number; maxKg: number; mediaKg: number } {
  const faixa = perdaTotalFaixaPeriodo(semanas);
  if (pesoKg == null || pesoKg <= 0) return faixa;
  return {
    minKg: limitarPerdaKgAoTeto(pesoKg, faixa.minKg),
    maxKg: limitarPerdaKgAoTeto(pesoKg, faixa.maxKg),
    mediaKg: limitarPerdaKgAoTeto(pesoKg, faixa.mediaKg),
  };
}

export function faixaPesoAoFimPeriodo(
  pesoInicioKg: number,
  semanas: number
): { pesoMinKg: number; pesoMaxKg: number; pesoMedioKg: number } {
  const faixa = perdaTotalFaixaPeriodoComLimite(pesoInicioKg, semanas);
  return {
    pesoMinKg: arredondar1(Math.max(0, pesoInicioKg - faixa.maxKg)),
    pesoMaxKg: arredondar1(Math.max(0, pesoInicioKg - faixa.minKg)),
    pesoMedioKg: arredondar1(Math.max(0, pesoInicioKg - faixa.mediaKg)),
  };
}

export { PERDA_SEMANAL_MIN_KG, PERDA_SEMANAL_MAX_KG, PERDA_SEMANAL_MEDIA_KG };
