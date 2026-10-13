import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';

export function buildContatoChatPublicPath(opts: { medicoId?: string; slug?: string | null }): string {
  const slug = opts.slug?.trim();
  if (slug) return `/contatochat/${encodeURIComponent(slug)}`;
  const medicoId = opts.medicoId?.trim();
  if (medicoId) return `/contatochat?m=${encodeURIComponent(medicoId)}`;
  return '/contatochat';
}

export function buildContatoChatPublicUrl(opts: {
  medicoId?: string;
  slug?: string | null;
  origin?: string;
}): string {
  return buildOrganizacaoPublicUrl(buildContatoChatPublicPath(opts), opts.origin);
}

export function buildContatoChatVcardPath(opts: { medicoId?: string; slug?: string | null }): string {
  const medicoId = opts.medicoId?.trim();
  if (medicoId) return `/api/contatochat/vcard?m=${encodeURIComponent(medicoId)}`;
  const slug = opts.slug?.trim();
  if (slug) return `/api/contatochat/vcard?slug=${encodeURIComponent(slug)}`;
  return '/api/contatochat/vcard';
}
