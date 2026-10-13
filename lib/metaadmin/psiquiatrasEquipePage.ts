/**
 * Helpers puros da página operacional Psiquiatras no /metaadmin.
 * Contagens usam apenas paciente_psiquiatra (status ativo) do par medico+psiquiatra.
 */

export type AclShareLike = {
  medicoId: string;
  psiquiatraId: string;
  status: string;
  pacienteId?: string;
};

/** Conta ACLs ativas do par — exclui shares de outros médicos e status ≠ ativo. */
export function countActiveSharesForMedicoPsiquiatra(
  shares: AclShareLike[],
  medicoId: string,
  psiquiatraId: string
): number {
  const mid = String(medicoId || '').trim();
  const psiId = String(psiquiatraId || '').trim();
  if (!mid || !psiId) return 0;
  return shares.filter(
    (s) =>
      String(s.medicoId || '').trim() === mid &&
      String(s.psiquiatraId || '').trim() === psiId &&
      String(s.status || '').trim() === 'ativo'
  ).length;
}

/** Soma pacientes compartilhados do médico (todas as ACLs ativas dele). */
export function countTotalActiveSharesForMedico(
  shares: AclShareLike[],
  medicoId: string
): number {
  const mid = String(medicoId || '').trim();
  if (!mid) return 0;
  return shares.filter(
    (s) =>
      String(s.medicoId || '').trim() === mid && String(s.status || '').trim() === 'ativo'
  ).length;
}

export type PsiquiatraSearchable = {
  nome?: string;
  registroNumero?: string;
  crmUf?: string;
  cidades?: { cidade: string; estado: string }[];
};

/** Busca local na equipe: nome, CRM, cidade. */
export function filterPsiquiatrasEquipeByQuery(
  list: PsiquiatraSearchable[],
  queryText: string
): PsiquiatraSearchable[] {
  const q = String(queryText || '').trim().toLowerCase();
  if (!q) return list;
  const digits = q.replace(/\D/g, '');
  return list.filter((p) => {
    const nome = String(p.nome || '').toLowerCase();
    const crm = String(p.registroNumero || '').toLowerCase();
    const uf = String(p.crmUf || '').toLowerCase();
    const crmDigits = String(p.registroNumero || '').replace(/\D/g, '');
    const cidades = (p.cidades || [])
      .map((c) => `${c.cidade} ${c.estado}`.toLowerCase())
      .join(' ');
    return (
      nome.includes(q) ||
      crm.includes(q) ||
      uf.includes(q) ||
      cidades.includes(q) ||
      (digits.length > 0 && crmDigits.includes(digits))
    );
  });
}

/** UFs únicas presentes em `cidades` dos psiquiatras cadastrados (ordenadas). */
export function estadosComPsiquiatrasCadastrados(
  list: Array<{ cidades?: { estado?: string; cidade?: string }[] | null } | null | undefined>
): string[] {
  const set = new Set<string>();
  for (const p of list || []) {
    for (const c of p?.cidades || []) {
      const uf = String(c?.estado || '')
        .trim()
        .toUpperCase();
      if (uf) set.add(uf);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export const METAADMIN_PSIQUIATRAS_MENU_ORDER = [
  'nutricionistas',
  'psiquiatras',
  'personal',
] as const;
