/**
 * Resolução do Psiquiatra responsável ativo pelo paciente.
 * Fonte: paciente_psiquiatra status === 'ativo' → psiquiatras/{uid}.
 * Regra: no máximo 1 ativo. Múltiplos = conflito legado (fallback de leitura).
 */

import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { PacientePsiquiatraService } from '@/services/pacientePsiquiatraService';
import {
  formatPsiquiatraRegistroAdmin,
  PsiquiatraService,
} from '@/services/psiquiatraService';
import { resolveSingleActivePsiquiatraVinculo } from '@/lib/psiquiatria/resolveSingleActivePsiquiatra';

export type PsiquiatraResponsavelView = {
  psiquiatraId: string;
  nome: string;
  /** Ex.: "123456 / SP" */
  crmLabel: string;
  rqe?: string;
  genero?: 'M' | 'F';
  /** true se a leitura encontrou >1 ACL ativo (legado). */
  hasConflict?: boolean;
};

export function formatPsiquiatraResponsavelTitulo(view: {
  nome: string;
  genero?: 'M' | 'F';
}): string {
  const nome = String(view.nome || '').trim() || 'Psiquiatra';
  if (/^dr\.?\s|^dra\.?\s/i.test(nome)) return nome;
  if (view.genero === 'F') return `Dra. ${nome}`;
  if (view.genero === 'M') return `Dr. ${nome}`;
  return `Dr(a). ${nome}`;
}

export function mapPsiquiatraToResponsavelView(
  psi: Pick<PsiquiatraDoc, 'id' | 'userId' | 'nome' | 'registroNumero' | 'crmUf' | 'rqe' | 'genero'>
): PsiquiatraResponsavelView {
  return {
    psiquiatraId: psi.userId || psi.id,
    nome: psi.nome || 'Psiquiatra',
    crmLabel: formatPsiquiatraRegistroAdmin(psi),
    rqe: String(psi.rqe || '').trim() || undefined,
    genero: psi.genero === 'M' || psi.genero === 'F' ? psi.genero : undefined,
  };
}

/**
 * Retorna o Psiquiatra com ACL ativa para o paciente, ou null.
 * Leitura apenas — não cria nem corrige documentos.
 * Se houver conflito legado (>1 ativo), usa fallback determinístico + hasConflict.
 */
export async function resolvePsiquiatraResponsavelAtivo(
  pacienteId: string
): Promise<PsiquiatraResponsavelView | null> {
  const pid = String(pacienteId || '').trim();
  if (!pid) return null;

  const vinculos = await PacientePsiquiatraService.listActiveVinculosByPaciente(pid);
  const { activeVinculo, hasConflict } = resolveSingleActivePsiquiatraVinculo(vinculos);
  if (!activeVinculo) return null;

  const psi = await PsiquiatraService.getPsiquiatraByUserId(activeVinculo.psiquiatraId);
  if (!psi) {
    return {
      psiquiatraId: activeVinculo.psiquiatraId,
      nome: 'Psiquiatra',
      crmLabel: 'N/A',
      hasConflict,
    };
  }
  return {
    ...mapPsiquiatraToResponsavelView(psi),
    hasConflict,
  };
}
