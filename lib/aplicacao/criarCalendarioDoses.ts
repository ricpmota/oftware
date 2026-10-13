import type { PacienteCompleto } from '@/types/obesidade';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';

/**
 * Calendário de doses do ciclo ativo (mesmo motor do Esquema de Doses / WhatsApp).
 */
export function criarCalendarioDoses(
  planoTerapeutico: any,
  evolucaoSeguimento: any[]
): Array<{
  data: Date;
  semana: number;
  dose: number;
  status: 'tomada' | 'perdida' | 'hoje' | 'futura';
}> {
  const built = buildSemanasEsquemaDoses({
    planoTerapeutico,
    evolucaoSeguimento: evolucaoSeguimento || [],
  } as PacienteCompleto);
  if (!built) return [];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return built.semanas
    .filter((s) => !s.isConclusao && !s.isCancelada)
    .map((s) => {
      const data = new Date(s.dataExibicao);
      data.setHours(0, 0, 0, 0);
      let status: 'tomada' | 'perdida' | 'hoje' | 'futura';
      if (data.getTime() === hoje.getTime()) status = 'hoje';
      else if (data.getTime() < hoje.getTime()) status = s.temDoseAplicada ? 'tomada' : 'perdida';
      else status = 'futura';
      return { data, semana: s.semana, dose: s.doseAtual, status };
    });
}
