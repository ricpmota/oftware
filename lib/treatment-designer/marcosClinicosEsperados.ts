/**
 * Marcos clínicos esperados por ritmo de evolução.
 * Mesma meta final; diferença apenas no tempo para atingir cada marco (% de perda).
 */
import {
  PERDA_SEMANAL_MAX_KG,
  PERDA_SEMANAL_MIN_KG,
} from '@/lib/planoTerapeutico/escadinhaDose';
import { resolverMetaPerdaComLimite } from '@/lib/planoTerapeutico/limitePerdaPonderal';
import type { MarcoClinicoDef, MarcoClinicoId } from '@/lib/treatment-designer/types';

export type RitmoEvolucaoClinica = 'lento' | 'agressivo';

export const MARCOS_PERCENTUAIS_PADRAO = [5, 10, 15, 20] as const;

export type MarcoClinicoTabelaLinha = {
  id: string;
  rotulo: string;
  perdaPercentual?: number;
  gradual: string;
  acelerado: string;
};

export type TabelaMarcosClinicosEsperados = {
  metaPercentual: number;
  linhas: MarcoClinicoTabelaLinha[];
};

export type CalcularMarcosClinicosInput = {
  pesoInicialKg: number;
  metaKg?: number | null;
  metaPercentual?: number | null;
};

function arredondarPercentual(pct: number): number {
  return Math.round(pct * 10) / 10;
}

export function rotuloRitmoEvolucao(ritmo: RitmoEvolucaoClinica): string {
  return ritmo === 'lento' ? 'Gradual' : 'Acelerado';
}

/** Ritmo gradual = limite inferior da faixa; acelerado = limite superior. */
export function perdaSemanalEsperadaPorRitmo(ritmo: RitmoEvolucaoClinica): number {
  return ritmo === 'lento' ? PERDA_SEMANAL_MIN_KG : PERDA_SEMANAL_MAX_KG;
}

export function resolverMetaPercentual(input: CalcularMarcosClinicosInput): number {
  const peso = input.pesoInicialKg;
  if (peso <= 0) return 0;

  return resolverMetaPerdaComLimite(peso, input.metaKg, input.metaPercentual)
    .perdaEfetivaPercentual;
}

export function kgPerdidosPorPercentual(pesoInicialKg: number, percentual: number): number {
  return (pesoInicialKg * percentual) / 100;
}

/**
 * Semana estimada para atingir um marco de perda percentual,
 * com base no ritmo de evolução clínica (não em kg absolutos na UI).
 */
export function calcularSemanaMarcoPercentual(
  pesoInicialKg: number,
  percentual: number,
  ritmo: RitmoEvolucaoClinica
): number {
  if (pesoInicialKg <= 0 || percentual <= 0) return 1;
  const kgPerdidos = kgPerdidosPorPercentual(pesoInicialKg, percentual);
  const perdaSemanal = perdaSemanalEsperadaPorRitmo(ritmo);
  return Math.max(1, Math.ceil(kgPerdidos / perdaSemanal));
}

export function formatarSemanaMarco(semana: number): string {
  return `Semana ${semana}`;
}

export function formatarPercentualMarco(percentual: number): string {
  return `${percentual.toFixed(1).replace('.', ',')}%`;
}

function idMarcoPercentual(percentual: number): MarcoClinicoId {
  if (percentual === 5) return 'perda_5_pct';
  if (percentual === 10) return 'perda_10_pct';
  if (percentual === 15) return 'perda_15_pct';
  if (percentual === 20) return 'perda_20_pct';
  return 'perda_5_pct';
}

function rotuloMarcoPercentual(percentual: number): string {
  return `${formatarPercentualMarco(percentual)} de perda ponderal`;
}

function valorCelulaMarco(
  pesoInicialKg: number,
  percentual: number,
  metaPercentual: number,
  ritmo: RitmoEvolucaoClinica
): string {
  if (metaPercentual > 0 && percentual > metaPercentual) return '—';
  return formatarSemanaMarco(
    calcularSemanaMarcoPercentual(pesoInicialKg, percentual, ritmo)
  );
}

/** Marcos para o gráfico (ritmo selecionado): 5%, 10%, 15%, 20% e meta. */
export function calcularMarcosClinicosPorRitmo(
  input: CalcularMarcosClinicosInput,
  ritmo: RitmoEvolucaoClinica
): MarcoClinicoDef[] {
  const peso = input.pesoInicialKg;
  const metaPercentual = resolverMetaPercentual(input);
  if (peso <= 0 || metaPercentual <= 0) return [];

  const marcos: MarcoClinicoDef[] = [];

  for (const pct of MARCOS_PERCENTUAIS_PADRAO) {
    if (pct > metaPercentual) continue;
    marcos.push({
      id: idMarcoPercentual(pct),
      rotulo: rotuloMarcoPercentual(pct),
      semana: calcularSemanaMarcoPercentual(peso, pct, ritmo),
      perdaPercentual: pct,
    });
  }

  marcos.push({
    id: 'meta_atingida',
    rotulo: `Meta (${formatarPercentualMarco(metaPercentual)})`,
    semana: calcularSemanaMarcoPercentual(peso, metaPercentual, ritmo),
    perdaPercentual: metaPercentual,
  });

  return marcos.sort((a, b) => a.semana - b.semana);
}

/** Tabela comparativa Gradual × Acelerado para a mesma meta. */
export function calcularTabelaMarcosClinicosEsperados(
  input: CalcularMarcosClinicosInput
): TabelaMarcosClinicosEsperados {
  const peso = input.pesoInicialKg;
  const metaPercentual = resolverMetaPercentual(input);
  const linhas: MarcoClinicoTabelaLinha[] = [];

  for (const pct of MARCOS_PERCENTUAIS_PADRAO) {
    linhas.push({
      id: `perda_${pct}`,
      rotulo: rotuloMarcoPercentual(pct),
      perdaPercentual: pct,
      gradual: valorCelulaMarco(peso, pct, metaPercentual, 'lento'),
      acelerado: valorCelulaMarco(peso, pct, metaPercentual, 'agressivo'),
    });
  }

  linhas.push({
    id: 'meta',
    rotulo:
      metaPercentual > 0
        ? `Meta (${formatarPercentualMarco(metaPercentual)})`
        : 'Meta personalizada do paciente',
    perdaPercentual: metaPercentual > 0 ? metaPercentual : undefined,
    gradual:
      metaPercentual > 0
        ? formatarSemanaMarco(
            calcularSemanaMarcoPercentual(peso, metaPercentual, 'lento')
          )
        : '—',
    acelerado:
      metaPercentual > 0
        ? formatarSemanaMarco(
            calcularSemanaMarcoPercentual(peso, metaPercentual, 'agressivo')
          )
        : '—',
  });

  linhas.push({
    id: 'inicio_consolidacao',
    rotulo: 'Início da consolidação',
    gradual: 'Após atingir a meta',
    acelerado: 'Após atingir a meta',
  });

  return { metaPercentual, linhas };
}

export function semanaMetaAtingidaPorRitmo(
  input: CalcularMarcosClinicosInput,
  ritmo: RitmoEvolucaoClinica
): number {
  const metaPercentual = resolverMetaPercentual(input);
  if (input.pesoInicialKg <= 0 || metaPercentual <= 0) return 1;
  return calcularSemanaMarcoPercentual(input.pesoInicialKg, metaPercentual, ritmo);
}
