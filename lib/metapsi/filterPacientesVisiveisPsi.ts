import type { PacienteVisivelPsiquiatra } from '@/services/pacientePsiquiatraService';

export type FilterPacientesVisiveisPsiInput = {
  busca?: string;
  medicoId?: string;
};

/**
 * Filtra somente pacientes já na lista acessível (ACL ativa).
 * Não consulta pacientes globais — só filtra o array recebido.
 */
export function filterPacientesVisiveisPsi(
  items: PacienteVisivelPsiquiatra[],
  opts: FilterPacientesVisiveisPsiInput = {},
): PacienteVisivelPsiquiatra[] {
  const q = String(opts.busca || '')
    .trim()
    .toLowerCase();
  const medicoId = String(opts.medicoId || '').trim();

  const filtered = items.filter((p) => {
    if (p.status !== 'ativo') return false;
    const matchMedico = !medicoId || p.medicoId === medicoId;
    if (!matchMedico) return false;
    if (!q) return true;
    const nome = (
      p.paciente.dadosIdentificacao?.nomeCompleto ||
      p.paciente.nome ||
      ''
    ).toLowerCase();
    const email = String(p.paciente.email || '').toLowerCase();
    return nome.includes(q) || email.includes(q);
  });

  return [...filtered].sort((a, b) => {
    const nomeA = a.paciente.dadosIdentificacao?.nomeCompleto || a.paciente.nome || '';
    const nomeB = b.paciente.dadosIdentificacao?.nomeCompleto || b.paciente.nome || '';
    return nomeA.localeCompare(nomeB);
  });
}
