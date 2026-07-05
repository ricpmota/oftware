import type { PacienteCompleto } from '@/types/obesidade';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';

export type RelatorioFinanceiroAplicacao = {
  semana: number;
  doseMg: number;
  data: Date;
  aplicada: boolean;
};

export function extrairAplicacoesRelatorioFinanceiro(
  paciente: PacienteCompleto
): RelatorioFinanceiroAplicacao[] {
  const built = buildSemanasEsquemaDoses(paciente);
  if (!built) return [];

  return built.semanas
    .filter((s) => !s.isCancelada && !s.isConclusao && (s.doseAtual > 0 || (s.doseAplicadaMg ?? 0) > 0))
    .map((s) => ({
      semana: s.semana,
      doseMg: s.temDoseAplicada ? (s.doseAplicadaMg ?? s.doseAtual) : s.doseAtual,
      data: s.dataExibicao,
      aplicada: s.temDoseAplicada,
    }));
}
