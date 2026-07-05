import type { SolicitacaoMedico } from '@/types/solicitacaoMedico';

import type { PacienteCompleto } from '@/types/obesidade';

import { isMetaChatInicialCompleto } from '@/lib/meta/metaChatInicial';



/** Todas as solicitações aparecem na lista do médico (inclusive pendentes com anamnese em andamento). */

export function solicitacaoMedicoVisivelParaMedico(

  _solicitacao: SolicitacaoMedico,

  _paciente?: PacienteCompleto | null

): boolean {

  return true;

}



/** Aceitar só quando o paciente concluiu o cadastro inicial no app. */

export function solicitacaoMedicoPodeSerAceita(

  solicitacao: SolicitacaoMedico,

  paciente: PacienteCompleto | null

): boolean {

  if (solicitacao.status !== 'pendente') return false;

  if (solicitacao.chatInicialCompleto === true) return true;

  if (!paciente || !isMetaChatInicialCompleto(paciente)) return false;

  return true;

}


