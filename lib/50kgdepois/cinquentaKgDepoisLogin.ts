import { sanitizeLoginNextPath } from '@/lib/landing/appNavigation';

export function cinquentaKgDepoisAcessarUrl(returnPath = '/50kgdepois'): string {
  const safe = sanitizeLoginNextPath(returnPath) ?? '/50kgdepois';
  return `/acessar?next=${encodeURIComponent(safe)}`;
}
