import {
  isShortPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';

/** Path público do plano: curto `/plano/X23KMD7P` ou legado `/plano/{id}?t=...`. */
export function buildPlanoTerapeuticoPublicPath(
  orcamentoId: string,
  publicAccessToken: string
): string {
  const token = normalizePublicLinkToken(publicAccessToken);
  if (isShortPublicLinkToken(token)) {
    return `/plano/${encodeURIComponent(token)}`;
  }
  return `/plano/${encodeURIComponent(orcamentoId)}?t=${encodeURIComponent(String(publicAccessToken || '').trim())}`;
}
