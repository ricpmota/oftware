import { isMetaAdminGeralEmail } from '@/lib/meta/anamneseInteligenteGate';
import { MedicoService } from '@/services/medicoService';
import type { Medico } from '@/types/medico';

type SessaoUser = { uid: string; email?: string | null };

/** Médico do login: primeiro pelo usuário, depois pelo e-mail cadastrado. */
export async function resolverMedicoDaSessao(user: SessaoUser): Promise<Medico | null> {
  const porUsuario = await MedicoService.getMedicoByUserId(user.uid);
  if (porUsuario) return porUsuario;
  const email = user.email?.trim();
  if (!email) return null;
  return MedicoService.getMedicoByEmail(email);
}

/** Quem pode abrir o app /relatoriomedicos. */
export function sessaoPodeEntrarRelatoriosMedicos(input: {
  email?: string | null;
  medico: { isVerificado?: boolean } | null;
}): boolean {
  if (isMetaAdminGeralEmail(input.email)) return true;
  return input.medico?.isVerificado === true;
}

/** O relatório individual só abre para médico cadastrado e verificado. O admin geral continua podendo abrir qualquer um. */
export function medicoPodeSerAbertoNoRelatorio(input: {
  visitanteEmail?: string | null;
  alvoVerificado: boolean;
}): boolean {
  if (isMetaAdminGeralEmail(input.visitanteEmail)) return true;
  return input.alvoVerificado;
}

export function ordenarMedicosDoApp<T extends { nome?: string; isVerificado?: boolean }>(medicos: T[]): T[] {
  return [...medicos].sort((a, b) => {
    const verificadoA = a.isVerificado === true ? 0 : 1;
    const verificadoB = b.isVerificado === true ? 0 : 1;
    if (verificadoA !== verificadoB) return verificadoA - verificadoB;
    return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  });
}
