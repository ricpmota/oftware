/** Hosts públicos da home institucional. Não inclui o Método. */
export const KAMILLA_SITE_HOSTS = [
  'www.endocrinokamillamontenegro.com',
  'endocrinokamillamontenegro.com',
] as const;

export function isKamillaSiteHost(host: string | null | undefined): boolean {
  const normalized = (host ?? '').trim().toLowerCase().split(':')[0];
  if (!normalized) return false;
  return (KAMILLA_SITE_HOSTS as readonly string[]).includes(normalized);
}
