/**
 * Compatibilidade Etapa 2 — re-exporta de `@/lib/organization`.
 * Código novo deve importar de `@/lib/organization` diretamente.
 */
export {
  ORGANIZACAO_METODO_PUBLIC_ORIGIN,
  buildOrganizacaoPublicUrl,
  resolveOrganizacaoPublicOrigin,
} from '@/lib/organization/organizationUrls';

export { METODO_ORGANIZATION, METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
