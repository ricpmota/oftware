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
  const marco = registro.marcoZero ?? paciente.marcoZero;
  if (!marco || marco.pesoInicial == null || marco.pesoInicial <= 0) return null;
  if (!marco.motivacaoPrincipal?.trim() || !marco.objetivoPaciente?.trim()) return null;
  return marco;
}

/** Detalhe do Marco Zero apenas para a semana 1 respondida correspondente. */
export function obterMarcoZeroDetalheParaAplicacao(
  paciente: PacienteCompleto,
  aplicacao: { semana: number; data: Date },
  registro: SeguimentoSemanal | null | undefined
): MarcoZeroDetalhe | null {
  if (aplicacao.semana !== 1) return null;
  if (!registro || !registroCorrespondeAplicacao(registro, aplicacao)) return null;
  const marcoZero = obterMarcoZeroDoPaciente(paciente, registro);
  if (!marcoZero) return null;
  return {
    semana: 1,
    marcoZero,
    registro,
  };
}
