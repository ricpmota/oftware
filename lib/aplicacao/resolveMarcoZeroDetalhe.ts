import { ehPrimeiraSemanaDoProtocolo } from '@/lib/aplicacao/resolverWeekIndexAplicacaoPublica';
import type { MarcoZero, PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { registroCorrespondeAplicacao } from '@/lib/aplicacao/resolveCheckInSemanalScore';

export type MarcoZeroDetalhe = {
  semana: number;
  marcoZero: MarcoZero;
  registro: SeguimentoSemanal;
};

function obterMarcoZeroDoPaciente(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal
): MarcoZero | null {
  const semana = registro.weekIndex ?? (registro as { numeroSemana?: number }).numeroSemana ?? 0;
  const marco = registro.marcoZero ?? (semana === 1 ? paciente.marcoZero : undefined);
  if (!marco || marco.pesoInicial == null || marco.pesoInicial <= 0) return null;
  if (!marco.motivacaoPrincipal?.trim() || !marco.objetivoPaciente?.trim()) return null;
  return marco;
}

/** Detalhe do Marco Zero apenas para a primeira semana do protocolo correspondente. */
export function obterMarcoZeroDetalheParaAplicacao(
  paciente: PacienteCompleto,
  aplicacao: { semana: number; data: Date },
  registro: SeguimentoSemanal | null | undefined
): MarcoZeroDetalhe | null {
  if (!ehPrimeiraSemanaDoProtocolo(paciente, aplicacao.semana)) return null;
  if (!registro || !registroCorrespondeAplicacao(registro, aplicacao)) return null;
  const marcoZero = obterMarcoZeroDoPaciente(paciente, registro);
  if (!marcoZero) return null;
  return {
    semana: aplicacao.semana,
    marcoZero,
    registro,
  };
}

/** Detalhe do Marco Zero direto do registro (ex.: pasta Evolução), sem match de data. */
export function obterMarcoZeroDetalheDeRegistro(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal | null | undefined
): MarcoZeroDetalhe | null {
  if (!registro) return null;
  const semana = registro.weekIndex ?? (registro as { numeroSemana?: number }).numeroSemana ?? 0;
  if (!ehPrimeiraSemanaDoProtocolo(paciente, semana)) return null;
  const marcoZero = obterMarcoZeroDoPaciente(paciente, registro);
  if (!marcoZero) return null;
  return {
    semana,
    marcoZero,
    registro,
  };
}
