import { getFirstIncompleteStep } from '@/lib/meta/metaChatInicial';
import { PacienteService } from '@/services/pacienteService';
import type { PacienteCompleto } from '@/types/obesidade';
import type { SolicitacaoMedico } from '@/types/solicitacaoMedico';

/** Resolve paciente da solicitação (id do doc → e-mail), preferindo o cadastro mais completo. */
export async function resolvePacienteDaSolicitacao(
  solicitacao: Pick<SolicitacaoMedico, 'pacienteId' | 'pacienteEmail'>
): Promise<PacienteCompleto | null> {
  const candidates: PacienteCompleto[] = [];

  if (solicitacao.pacienteId) {
    const porId = await PacienteService.getPacienteById(solicitacao.pacienteId).catch(() => null);
    if (porId) candidates.push(porId);
  }

  const email = solicitacao.pacienteEmail?.trim();
  if (email) {
    const porEmail = await PacienteService.getPacienteByEmail(email);
    if (porEmail && !candidates.some((c) => c.id === porEmail.id)) {
      candidates.push(porEmail);
    }
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  return [...candidates].sort(
    (a, b) => getFirstIncompleteStep(b) - getFirstIncompleteStep(a)
  )[0];
}

/** Todos os docs de pacientes_completos ligados à solicitação (id + e-mail). */
export async function listPacienteIdsDaSolicitacao(
  solicitacao: Pick<SolicitacaoMedico, 'pacienteId' | 'pacienteEmail'>
): Promise<string[]> {
  const ids = new Set<string>();
  const byId = solicitacao.pacienteId?.trim();
  if (byId) ids.add(byId);

  const email = solicitacao.pacienteEmail?.trim();
  if (email) {
    const listed = await PacienteService.listPacienteIdsByEmail(email);
    listed.forEach((id) => ids.add(id));
  }

  return [...ids];
}

export function pickTelefoneSolicitacao(
  solicitacao: Pick<SolicitacaoMedico, 'pacienteTelefone'>,
  paciente?: PacienteCompleto | null
): string | undefined {
  const fromSolicitacao = solicitacao.pacienteTelefone?.trim();
  const fromPaciente = paciente?.dadosIdentificacao?.telefone?.trim();
  return fromSolicitacao || fromPaciente || undefined;
}
