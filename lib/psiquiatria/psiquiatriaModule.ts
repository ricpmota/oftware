/**
 * Contratos estáveis do módulo clínico Psiquiatria (ETAPA 5).
 * Sem persistência clínica — preparação para ETAPA 7.
 */

export const PSIQUIATRIA_CONTENT_MODES = ['owner', 'readonly'] as const;
export type PsiquiatriaContentModeContract = (typeof PSIQUIATRIA_CONTENT_MODES)[number];

/** Posição conceitual quando Nutrologia / Psiquiatria / Personal estão juntas. */
export const PSIQUIATRIA_AREA_ORDER = ['Nutrologia', 'Psiquiatria', 'Personal Trainer'] as const;

/**
 * IDs de pasta Psiquiatria por portal.
 * Não renumerar tabs existentes: Nutri/Personal usam 14; MetaPsi usa 9 (já estabelecido).
 */
export const PSIQUIATRIA_PASTA_IDS = {
  metaadmin: 14,
  metanutri: 14,
  metapersonal: 14,
  metapsi: 9,
} as const;

/** Garantia ETAPA 5: montar o módulo não cria schema clínico. */
export const PSIQUIATRIA_ETAPA5_NO_PERSISTENCE = true;

export function resolvePsiquiatriaModeForPortal(
  portal: 'metapsi' | 'metaadmin' | 'metanutri' | 'metapersonal'
): PsiquiatriaContentModeContract {
  return portal === 'metapsi' ? 'owner' : 'readonly';
}

export function canAdministerPsiquiatriaShare(portal: string): boolean {
  return portal === 'metaadmin';
}
