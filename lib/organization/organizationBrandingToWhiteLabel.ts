import type { MedicoWhiteLabelStored } from '@/types/medico';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';

function strField(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

/** Mapeia `organizations/{id}.branding` para campos de `medicos.whiteLabel` (somente valores preenchidos). */
export function organizationBrandingToWhiteLabelPartial(
  org: OrganizationBrandingStored,
): Partial<MedicoWhiteLabelStored> {
  const partial: Partial<MedicoWhiteLabelStored> = {};

  const description = strField(org.defaultDescription);
  if (description) partial.description = description.slice(0, 160);

  const ogImageUrl = strField(org.ogImageUrl);
  if (ogImageUrl) partial.ogImageUrl = ogImageUrl;

  const faviconUrl = strField(org.faviconUrl) ?? strField(org.iconUrl);
  if (faviconUrl) partial.faviconUrl = faviconUrl;

  const pdfLogoUrl = strField(org.pdfLogoUrl);
  if (pdfLogoUrl) partial.pdfLogoUrl = pdfLogoUrl;

  const primaryColor = org.primaryColor?.trim();
  if (primaryColor && isValidHexColor(primaryColor)) {
    partial.primaryColor = primaryColor;
  }

  const dr = org.publicPages.dr;
  const drBg = strField(dr?.backgroundColor) ?? strField(org.secondaryColor);
  if (drBg && isValidHexColor(drBg)) partial.drPageBackgroundColor = drBg;

  const drText = strField(dr?.textColor) ?? strField(org.textColor);
  if (drText && isValidHexColor(drText)) partial.drPageTextColor = drText;

  const drLogo = strField(dr?.logoUrl) ?? strField(org.logoMainUrl);
  if (drLogo) partial.drPageLogoUrl = drLogo;

  const aplicacao = org.publicPages.aplicacao;
  const aplicacaoBg = strField(aplicacao?.backgroundColor) ?? strField(org.surfaceColor);
  if (aplicacaoBg && isValidHexColor(aplicacaoBg)) {
    partial.aplicacaoPageBackgroundColor = aplicacaoBg;
  }

  const aplicacaoText = strField(aplicacao?.textColor) ?? strField(org.mutedTextColor);
  if (aplicacaoText && isValidHexColor(aplicacaoText)) {
    partial.aplicacaoPageTextColor = aplicacaoText;
  }

  const aplicacaoLogo = strField(aplicacao?.logoUrl) ?? strField(org.logoMainUrl);
  if (aplicacaoLogo) partial.aplicacaoPageLogoUrl = aplicacaoLogo;

  const conclusao = org.publicPages.conclusao;
  const conclusaoBg = strField(conclusao?.backgroundColor) ?? strField(org.surfaceColor);
  if (conclusaoBg && isValidHexColor(conclusaoBg)) {
    partial.conclusaoPageBackgroundColor = conclusaoBg;
  }

  const conclusaoText = strField(conclusao?.textColor) ?? strField(org.mutedTextColor);
  if (conclusaoText && isValidHexColor(conclusaoText)) {
    partial.conclusaoPageTextColor = conclusaoText;
  }

  const conclusaoLogo = strField(conclusao?.logoUrl) ?? strField(org.logoMainUrl);
  if (conclusaoLogo) partial.conclusaoPageLogoUrl = conclusaoLogo;

  if (org.showPoweredByOftware !== undefined) {
    partial.showPoweredByOftware = org.showPoweredByOftware;
  }

  return partial;
}

/** Aplica camada da Organização sobre white label já mesclado (legado + template). */
export function applyOrganizationBrandingToWhiteLabelStored(
  base: MedicoWhiteLabelStored | null | undefined,
  org: OrganizationBrandingStored | null | undefined,
): MedicoWhiteLabelStored | undefined {
  if (!org) return base ?? undefined;
  const partial = organizationBrandingToWhiteLabelPartial(org);
  if (Object.keys(partial).length === 0) return base ?? undefined;
  return { ...(base ?? {}), ...partial };
}
