/**
 * Estimativa da Taxa Metabólica Basal (ETAPA 5).
 * Mifflin–St Jeor apenas — sem GET, fator de atividade, déficit ou meta calórica.
 */

import type {
  DadosEnergeticosPaciente,
  SexoBiologicoEnergetico,
} from '@/lib/nutri/dadosEnergeticosPaciente';
import {
  ALTURA_ENERGETICA_MAX_CM,
  ALTURA_ENERGETICA_MIN_CM,
  IDADE_ENERGETICA_MAX_ANOS,
  IDADE_ENERGETICA_MIN_ANOS,
  PESO_ENERGETICO_MAX_KG,
  PESO_ENERGETICO_MIN_KG,
} from '@/lib/nutri/dadosEnergeticosPaciente';

export type EquacaoMetabolica = 'mifflin_st_jeor';

export type StatusEstimativaTmb = 'calculada' | 'indisponivel';

export type MotivoTmbIndisponivel =
  | 'DADOS_ENERGETICOS_INAPTOS'
  | 'PESO_INVALIDO'
  | 'ALTURA_INVALIDA'
  | 'IDADE_INVALIDA'
  | 'SEXO_INVALIDO'
  | 'RESULTADO_INVALIDO';

export interface EstimativaTaxaMetabolicaBasal {
  versao: 1;
  status: StatusEstimativaTmb;
  equacao: EquacaoMetabolica;
  tmbEstimativaKcalDia: number | null;
  entradas: {
    pesoKg: number | null;
    alturaCm: number | null;
    idadeAnos: number | null;
    sexoBiologico: SexoBiologicoEnergetico | null;
  };
  motivosIndisponibilidade: MotivoTmbIndisponivel[];
  observacoes: string[];
}

const OBSERVACOES_CALCULADA = [
  'Estimativa calculada pela equação de Mifflin–St Jeor.',
  'O valor não substitui calorimetria indireta.',
] as const;

const EQUACAO: EquacaoMetabolica = 'mifflin_st_jeor';

function uniquePush(arr: MotivoTmbIndisponivel[], item: MotivoTmbIndisponivel): void {
  if (!arr.includes(item)) arr.push(item);
}

function isPesoValidoParaTmb(peso: unknown): peso is number {
  return (
    typeof peso === 'number' &&
    Number.isFinite(peso) &&
    peso >= PESO_ENERGETICO_MIN_KG &&
    peso <= PESO_ENERGETICO_MAX_KG
  );
}

function isAlturaValidaParaTmb(altura: unknown): altura is number {
  return (
    typeof altura === 'number' &&
    Number.isFinite(altura) &&
    altura >= ALTURA_ENERGETICA_MIN_CM &&
    altura <= ALTURA_ENERGETICA_MAX_CM
  );
}

function isIdadeValidaParaTmb(idade: unknown): idade is number {
  if (typeof idade !== 'number' || !Number.isFinite(idade)) return false;
  const anos = Math.trunc(idade);
  return anos >= IDADE_ENERGETICA_MIN_ANOS && anos <= IDADE_ENERGETICA_MAX_ANOS;
}

function isSexoValidoParaTmb(
  sexo: unknown
): sexo is SexoBiologicoEnergetico {
  return sexo === 'masculino' || sexo === 'feminino';
}

/**
 * Mifflin–St Jeor (resultado bruto, sem arredondamento).
 * Não valida entradas — uso interno / testes da fórmula.
 */
export function calcularMifflinStJeor(
  pesoKg: number,
  alturaCm: number,
  idadeAnos: number,
  sexoBiologico: SexoBiologicoEnergetico
): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idadeAnos;
  return sexoBiologico === 'masculino' ? base + 5 : base - 161;
}

function resultadoIndisponivel(
  entradas: EstimativaTaxaMetabolicaBasal['entradas'],
  motivos: MotivoTmbIndisponivel[]
): EstimativaTaxaMetabolicaBasal {
  return {
    versao: 1,
    status: 'indisponivel',
    equacao: EQUACAO,
    tmbEstimativaKcalDia: null,
    entradas,
    motivosIndisponibilidade: motivos,
    observacoes: [],
  };
}

/**
 * Estima a TMB a partir de dados energéticos já normalizados (ETAPA 4).
 * Não inventa entradas; não usa atividade, IMC, intensidade ou dose.
 */
export function calcularEstimativaTmb(
  dados: DadosEnergeticosPaciente
): EstimativaTaxaMetabolicaBasal {
  const entradas: EstimativaTaxaMetabolicaBasal['entradas'] = {
    pesoKg: dados?.peso?.pesoKg ?? null,
    alturaCm: dados?.alturaCm ?? null,
    idadeAnos: dados?.idadeAnos ?? null,
    sexoBiologico: dados?.sexoBiologico ?? null,
  };

  const motivos: MotivoTmbIndisponivel[] = [];

  if (!dados?.aptoParaEstimativaEnergetica) {
    uniquePush(motivos, 'DADOS_ENERGETICOS_INAPTOS');
  }

  if (!isPesoValidoParaTmb(entradas.pesoKg)) {
    uniquePush(motivos, 'PESO_INVALIDO');
  }
  if (!isAlturaValidaParaTmb(entradas.alturaCm)) {
    uniquePush(motivos, 'ALTURA_INVALIDA');
  }
  if (!isIdadeValidaParaTmb(entradas.idadeAnos)) {
    uniquePush(motivos, 'IDADE_INVALIDA');
  }
  if (!isSexoValidoParaTmb(entradas.sexoBiologico)) {
    uniquePush(motivos, 'SEXO_INVALIDO');
  }

  if (motivos.length > 0) {
    return resultadoIndisponivel(entradas, motivos);
  }

  const pesoKg = entradas.pesoKg as number;
  const alturaCm = entradas.alturaCm as number;
  const idadeAnos = Math.trunc(entradas.idadeAnos as number);
  const sexoBiologico = entradas.sexoBiologico as SexoBiologicoEnergetico;

  const bruto = calcularMifflinStJeor(pesoKg, alturaCm, idadeAnos, sexoBiologico);
  const arredondado = Math.round(bruto);

  if (!Number.isFinite(arredondado) || arredondado <= 0) {
    return resultadoIndisponivel(entradas, ['RESULTADO_INVALIDO']);
  }

  return {
    versao: 1,
    status: 'calculada',
    equacao: EQUACAO,
    tmbEstimativaKcalDia: arredondado,
    entradas: {
      pesoKg,
      alturaCm,
      idadeAnos,
      sexoBiologico,
    },
    motivosIndisponibilidade: [],
    observacoes: [...OBSERVACOES_CALCULADA],
  };
}
