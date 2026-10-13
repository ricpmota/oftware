import type { NextRequest } from 'next/server';
import { normalizeOrganizationHost } from './resolveOrganizationFromHost';

/** Host da requisição. Não autoriza e não altera o middleware. */
export function requestOrganizationHost(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-host');
  const raw = (forwarded?.split(',')[0]?.trim() || request.headers.get('host') || '').trim();
  return normalizeOrganizationHost(raw);
}
