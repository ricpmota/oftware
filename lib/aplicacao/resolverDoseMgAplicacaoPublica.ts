import type { PacienteCompleto } from '@/types/obesidade';
import { obterDoseMgSemanaPaciente } from '@/utils/esquemaDosesSemana';

function parseFallbackDose(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Dose exibida/gravada em /aplicacao: esquema atual do paciente, com fallback do link.
 * O documento aplicacao_links guarda um snapshot da dose na criação do token.
 */
export function resolverDoseMgAplicacaoPublica(params: {
  paciente: Pick<PacienteCompleto, 'planoTerapeutico' | 'evolucaoSeguimento'> | PacienteCompleto;
  semana: number;
  fallbackDose?: unknown;
}): number {
  const semana = Number(params.semana);
  if (Number.isFinite(semana) && semana >= 1) {
    const live = obterDoseMgSemanaPaciente(params.paciente as PacienteCompleto, semana);
    if (live > 0) return live;
  }
  return parseFallbackDose(params.fallbackDose);
}
