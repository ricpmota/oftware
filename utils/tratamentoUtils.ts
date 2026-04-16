import { PacienteCompleto } from '@/types/obesidade';

/**
 * Calcula a semana atual de tratamento do paciente
 * @param paciente Paciente completo com planoTerapeutico
 * @returns Número da semana atual (1, 2, 3, ...) ou null se não houver startDate
 */
export function calcularSemanaAtualTratamento(paciente: PacienteCompleto | null): number | null {
  if (!paciente?.planoTerapeutico?.startDate) {
    return null;
  }

  const startDate = new Date(paciente.planoTerapeutico.startDate);
  startDate.setHours(0, 0, 0, 0);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffMs = hoje.getTime() - startDate.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const semana = Math.floor(diffDias / 7) + 1;

  // Semana mínima é 1
  return Math.max(1, semana);
}
