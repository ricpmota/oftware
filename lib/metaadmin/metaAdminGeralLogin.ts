import { sanitizeLoginNextPath } from '@/lib/landing/appNavigation';

/** URL de login na Oftware com retorno para Meta Admin Geral (ou subrota). */
export function metaAdminGeralAcessarUrl(returnPath = '/metaadmingeral'): string {
  const safe = sanitizeLoginNextPath(returnPath) ?? '/metaadmingeral';
  return `/acessar?next=${encodeURIComponent(safe)}`;
}
