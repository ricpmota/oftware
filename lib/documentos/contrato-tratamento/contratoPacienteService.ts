import { PacienteService } from '@/services/pacienteService';
import {
  obterContratoTratamentoAtivoVisivelPaciente,
  subscribeContratoTratamentoAtivoVisivelPaciente,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';

export type BuscarContratoPacienteLogadoArgs = {
  userId: string;
  email?: string | null;
};

/**
 * Localiza o paciente pelo usuário Google (email ou uid) e retorna o contrato ativo
 * (`contrato_tratamento` com status aguardando_paciente ou assinado_completo).
 */
export async function buscarContratoTratamentoPacienteLogado(
  args: BuscarContratoPacienteLogadoArgs
): Promise<ContratoTratamentoDocumentoRecord | null> {
  const { userId, email } = args;
  if (!userId && !email) return null;

  const paciente =
    (email ? await PacienteService.getPacienteByEmail(email) : null) ??
    (userId ? await PacienteService.getPacienteByUserId(userId) : null);

  if (!paciente?.id) return null;

  return obterContratoTratamentoAtivoVisivelPaciente(paciente.id);
}

/** Atalho quando o paciente já está carregado na sessão /meta. */
export async function buscarContratoTratamentoPorPacienteId(
  pacienteId: string
): Promise<ContratoTratamentoDocumentoRecord | null> {
  if (!pacienteId) return null;
  return obterContratoTratamentoAtivoVisivelPaciente(pacienteId);
}

export function observarContratoTratamentoPorPacienteId(
  pacienteId: string,
  onUpdate: (doc: ContratoTratamentoDocumentoRecord | null) => void
): () => void {
  if (!pacienteId) {
    onUpdate(null);
    return () => {};
  }
  return subscribeContratoTratamentoAtivoVisivelPaciente(pacienteId, onUpdate);
}
