/**
 * Gate de abertura do workspace clínico no /metapsi.
 * SoT: paciente_psiquiatra status === 'ativo'.
 * Mirror (psiquiatraVinculadoIds) NÃO autoriza sozinho.
 */

import { hasActivePsiquiatraAccess } from '@/lib/metapsi/hasActivePsiquiatraAccess';

export type AclSnapshot = {
  exists: boolean;
  status?: string | null;
};

/**
 * Decisão pura (testável) — SoT prevalece sobre mirror.
 */
export function decidePsiquiatraCanOpenPaciente(input: {
  acl: AclSnapshot | null;
  /** Espelho denormalizado — informativo; nunca suficiente sozinho. */
  mirrorContainsPsiquiatra?: boolean;
}): boolean {
  const status = String(input.acl?.status || '').trim();
  const aclAtiva = Boolean(input.acl?.exists) && status === 'ativo';
  // Mirror nunca libera acesso sem ACL ativa.
  void input.mirrorContainsPsiquiatra;
  return aclAtiva;
}

export type OpenPacienteWorkspaceResult =
  | { ok: true }
  | { ok: false; reason: 'missing_ids' | 'acl_denied' };

/**
 * Valida ACL ativa antes de abrir o workspace.
 * Sem acesso ativo: NÃO abrir o paciente.
 */
export async function assertPsiquiatraCanOpenPaciente(
  pacienteId: string,
  psiquiatraId: string
): Promise<OpenPacienteWorkspaceResult> {
  const pid = String(pacienteId || '').trim();
  const psiId = String(psiquiatraId || '').trim();
  if (!pid || !psiId) {
    return { ok: false, reason: 'missing_ids' };
  }

  const allowed = await hasActivePsiquiatraAccess(pid, psiId);
  if (!allowed) {
    return { ok: false, reason: 'acl_denied' };
  }
  return { ok: true };
}

/** Ordem canônica das pastas do workspace MetaPsi (ETAPA 4). */
export const METAPSI_PACIENTE_PASTAS = [
  { id: 1, nome: 'Identificação' },
  { id: 2, nome: 'Anamnese' },
  { id: 3, nome: 'Prontuário' },
  { id: 4, nome: 'Exames' },
  { id: 5, nome: 'Bio Impedância' },
  { id: 6, nome: 'Evolução/Seguimento' },
  { id: 7, nome: 'Prescrições' },
  { id: 8, nome: 'Nutrologia' },
  { id: 9, nome: 'Psiquiatria' },
  { id: 10, nome: 'Personal Trainer' },
] as const;

export type MetaPsiPacientePastaId = (typeof METAPSI_PACIENTE_PASTAS)[number]['id'];
