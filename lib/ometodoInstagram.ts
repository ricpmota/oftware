/**
 * URL do perfil (ou post/reel) do Instagram do método — embed oficial.
 * `NEXT_PUBLIC_OMETODO_INSTAGRAM`: @usuario, usuario ou https://www.instagram.com/...
 */
export function ometodoInstagramPermalink(): string | null {
  const raw = process.env.NEXT_PUBLIC_OMETODO_INSTAGRAM?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host !== 'instagram.com' && host !== 'instagr.am') return null;
      const path = u.pathname.replace(/\/+$/, '');
      if (!path || path === '/') return null;
      return `https://www.instagram.com${path}/`;
    } catch {
      return null;
    }
  }
  const user = raw.replace(/^@+/, '').replace(/\/+$/, '').trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(user)) return null;
  return `https://www.instagram.com/${user}/`;
}
