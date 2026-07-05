import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';

/**
 * Portal do paciente (Meta) — organização Método Emagrecer.
 *
 * Regra: retorno do paciente ao sistema SEMPRE usa /meta (nunca só o domínio raiz).
 */
export const METODO_PACIENTE_META_URL = buildOrganizacaoPublicUrl('/meta');

export function goToMetodoPacienteMeta(): void {
  if (typeof window === 'undefined') return;
  window.location.assign(METODO_PACIENTE_META_URL);
}
