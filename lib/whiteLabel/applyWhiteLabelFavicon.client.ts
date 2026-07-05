export const DEFAULT_SITE_FAVICON = '/logo-icone.png';

function faviconMimeType(url: string): string | undefined {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  return undefined;
}

function withCacheBust(url: string, cacheKey?: string | number): string {
  const bust = cacheKey ?? Date.now();
  return `${url}${url.includes('?') ? '&' : '?'}v=${bust}`;
}

function upsertLink(rel: string, href: string, type?: string): void {
  const selector =
    rel === 'icon'
      ? "link[rel='icon'], link[rel=\"icon\"]"
      : `link[rel='${rel}'], link[rel="${rel}"]`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) {
    link.type = type;
  } else {
    link.removeAttribute('type');
  }
}

/** Aplica favicon white label no `<head>` (client-side). Restaura padrão se `faviconUrl` vazio. */
export function applyWhiteLabelFavicon(
  faviconUrl: string | null | undefined,
  cacheKey?: string | number
): void {
  if (typeof document === 'undefined') return;

  const trimmed = faviconUrl?.trim();
  const href = trimmed ? withCacheBust(trimmed, cacheKey) : DEFAULT_SITE_FAVICON;
  const type = trimmed ? faviconMimeType(trimmed) : 'image/png';

  upsertLink('icon', href, type);
  upsertLink('shortcut icon', href, type);
}
