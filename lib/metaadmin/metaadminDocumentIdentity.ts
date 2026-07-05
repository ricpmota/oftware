import type { Medico } from '@/types/medico';
import {
  resolveMedicoWhiteLabel,
  type MedicoWhiteLabelSource,
} from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { applyWhiteLabelFavicon } from '@/lib/whiteLabel/applyWhiteLabelFavicon.client';

export const METAADMIN_BROWSER_TITLE_SUFFIX = 'Plataforma White Label';
export const METAADMIN_FALLBACK_BRAND = 'Oftware';

export function buildMetaadminBrowserTitle(brandName: string): string {
  const brand = brandName.trim() || METAADMIN_FALLBACK_BRAND;
  return `${brand} | ${METAADMIN_BROWSER_TITLE_SUFFIX}`;
}

/** Título da aba do /metaadmin conforme identidade white label do médico. */
export function resolveMetaadminBrowserTitle(medico: Medico | null | undefined): string {
  if (!medico?.nome?.trim()) {
    return buildMetaadminBrowserTitle(METAADMIN_FALLBACK_BRAND);
  }
  const { brandName } = resolveMedicoWhiteLabel(medico);
  return buildMetaadminBrowserTitle(brandName);
}

/** Descrição customizada para `<meta name="description">` (somente se configurada). */
export function resolveMetaadminMetaDescription(medico: Medico | null | undefined): string | null {
  const custom = medico?.whiteLabel?.description?.trim();
  return custom || null;
}

export function applyMetaadminDocumentIdentityFromSource(
  source: MedicoWhiteLabelSource,
  options?: { medicoId?: string }
): void {
  if (typeof document === 'undefined') return;

  const resolved = resolveMedicoWhiteLabel(source);
  document.title = buildMetaadminBrowserTitle(resolved.brandName);

  const description = source.whiteLabel?.description?.trim();
  if (description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }

  applyWhiteLabelFavicon(resolved.faviconUrl, options?.medicoId || Date.now());
}

export function applyMetaadminDocumentIdentity(medico: Medico | null | undefined): void {
  if (!medico) {
    applyMetaadminDocumentIdentityFromSource({ nome: '' });
    return;
  }

  applyMetaadminDocumentIdentityFromSource(
    {
      nome: medico.nome,
      genero: medico.genero,
      fotoPerfilUrl: medico.fotoPerfilUrl ?? null,
      whiteLabel: medico.whiteLabel,
    },
    { medicoId: medico.id }
  );
}

/** Pré-visualização ao vivo com valores do formulário (inclui alterações não salvas). */
export function resolveMetaadminWhiteLabelPreview(source: MedicoWhiteLabelSource): {
  browserTitle: string;
  linkTitle: string;
  linkDescription: string;
  linkImageUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
} {
  const resolved = resolveMedicoWhiteLabel(source);
  return {
    browserTitle: buildMetaadminBrowserTitle(resolved.brandName),
    linkTitle: resolved.brandName,
    linkDescription: resolved.description,
    linkImageUrl: resolved.ogImageUrl,
    faviconUrl: resolved.faviconUrl,
    primaryColor: resolved.primaryColor,
  };
}
