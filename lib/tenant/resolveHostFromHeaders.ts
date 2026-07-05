/** Host sem porta, a partir dos headers do request (Vercel / proxy). */
export function resolveHostFromHeaders(h: Headers): string {
  const xf = h.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = xf || h.get('host') || '';
  return host.split(':')[0].toLowerCase();
}
