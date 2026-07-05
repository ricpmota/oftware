import type { MedicoWhiteLabelStored } from '@/types/medico';
import {
  resolveMedicoPublicPages,
  type MedicoPublicPagesResolved,
} from '@/lib/whiteLabel/publicPagesTheme';
import type { MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import { mergeMedicoWhiteLabelSources } from '@/lib/whiteLabel/mergeMedicoWhiteLabelSources';

export const DEFAULT_WHITE_LABEL_PRIMARY_COLOR = '#30f278';

export {
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_APLICACAO_PAGE_BACKGROUND,
  DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
  DEFAULT_APLICACAO_PAGE_TEXT,
  DEFAULT_CONCLUSAO_PAGE_TEXT,
  DEFAULT_PUBLIC_PAGE_LOGO_SRC,
  DEFAULT_PAGE_BACKGROUND_COLOR,
} from '@/lib/whiteLabel/publicPagesTheme';

export type { PublicPageKind, PublicPageThemeResolved, MedicoPublicPagesResolved } from '@/lib/whiteLabel/publicPagesTheme';

export const DEFAULT_WHITE_LABEL_DESCRIPTION =
  'Acompanhamento médico personalizado com equipe multidisciplinar integrada.';

export interface MedicoWhiteLabelResolved {
  brandName: string;
  description: string;
  ogImageUrl: string | null;
  profilePhotoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  publicPages: MedicoPublicPagesResolved;
  showPoweredByOftware: boolean;
}

export interface MedicoWhiteLabelSource {
  nome: string;
  genero?: 'M' | 'F';
  fotoPerfilUrl?: string | null;
  whiteLabel?: MedicoWhiteLabelStored | MedicoWhiteLabelResolved | null;
  metodoImagensAtivo?: boolean;
  metodoTemplate?: MetodoImagensTemplate | null;
  /** Firestore `medicos.organizationId` quando disponível. */
  organizationId?: string | null;
  /** Pré-carregado no servidor (dual read Etapa 11.2). */
  organizationBranding?: OrganizationBrandingStored | null;
}

export function medicoDisplayTitle(medico: { nome: string; genero?: 'M' | 'F' }): string {
  const titulo = medico.genero === 'F' ? 'Dra.' : 'Dr.';
  const nome = (medico.nome || '').trim();
  return nome ? `${titulo} ${nome}` : titulo;
}

function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

/** Resposta já resolvida por API/server (ex.: medico-por-nome). */
export function isPreResolvedMedicoWhiteLabel(
  wl: MedicoWhiteLabelStored | MedicoWhiteLabelResolved | null | undefined,
): wl is MedicoWhiteLabelResolved {
  if (!wl || typeof wl !== 'object') return false;
  return 'publicPages' in wl && typeof (wl as MedicoWhiteLabelResolved).publicPages === 'object';
}

export function resolveMedicoWhiteLabel(medico: MedicoWhiteLabelSource): MedicoWhiteLabelResolved {
  if (isPreResolvedMedicoWhiteLabel(medico.whiteLabel)) {
    return medico.whiteLabel;
  }

  const applyOrganizationLayer = isMetodoOrganizationMember(medico);
  const storedWhiteLabel = medico.whiteLabel as MedicoWhiteLabelStored | null | undefined;

  const wl = mergeMedicoWhiteLabelSources({
    whiteLabel: storedWhiteLabel,
    metodoTemplate: medico.metodoTemplate,
    metodoImagensAtivo: medico.metodoImagensAtivo,
    organizationBranding: medico.organizationBranding,
    applyOrganizationLayer,
  });
  const brandName = (wl?.brandName?.trim() || medicoDisplayTitle(medico)).slice(0, 60);
  const description = (wl?.description?.trim() || DEFAULT_WHITE_LABEL_DESCRIPTION).slice(0, 160);
  const ogImageUrl = wl?.ogImageUrl?.trim() || medico.fotoPerfilUrl?.trim() || null;
  const profilePhotoUrl = medico.fotoPerfilUrl?.trim() || null;
  const rawColor = wl?.primaryColor?.trim();
  const primaryColor =
    rawColor && isValidHexColor(rawColor) ? rawColor : DEFAULT_WHITE_LABEL_PRIMARY_COLOR;
  const showPoweredByOftware = wl?.showPoweredByOftware !== false;
  const faviconUrl = wl?.faviconUrl?.trim() || null;
  const publicPages = resolveMedicoPublicPages(wl);

  return {
    brandName,
    description,
    ogImageUrl,
    profilePhotoUrl,
    faviconUrl,
    primaryColor,
    publicPages,
    showPoweredByOftware,
  };
}

export function buildWhiteLabelPayloadFromForm(fields: {
  brandName: string;
  description: string;
  ogImageUrl: string | null;
  pdfLogoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  drPageBackgroundColor: string;
  drPageTextColor: string;
  drPageLogoUrl: string | null;
  aplicacaoPageBackgroundColor: string;
  aplicacaoPageTextColor: string;
  aplicacaoPageLogoUrl: string | null;
  conclusaoPageBackgroundColor: string;
  conclusaoPageTextColor: string;
  conclusaoPageLogoUrl: string | null;
  showPoweredByOftware: boolean;
}): MedicoWhiteLabelStored {
  const payload: MedicoWhiteLabelStored = {
    showPoweredByOftware: fields.showPoweredByOftware,
  };

  const brandName = fields.brandName.trim();
  if (brandName) payload.brandName = brandName.slice(0, 60);

  const description = fields.description.trim();
  if (description) payload.description = description.slice(0, 160);

  const ogImageUrl = fields.ogImageUrl?.trim();
  if (ogImageUrl) payload.ogImageUrl = ogImageUrl;

  const pdfLogoUrl = fields.pdfLogoUrl?.trim();
  if (pdfLogoUrl) payload.pdfLogoUrl = pdfLogoUrl;

  const faviconUrl = fields.faviconUrl?.trim();
  if (faviconUrl) payload.faviconUrl = faviconUrl;

  const primaryColor = fields.primaryColor.trim();
  if (primaryColor && isValidHexColor(primaryColor)) {
    payload.primaryColor = primaryColor;
  }

  const drBg = fields.drPageBackgroundColor.trim();
  if (drBg && isValidHexColor(drBg)) payload.drPageBackgroundColor = drBg;

  const drText = fields.drPageTextColor.trim();
  if (drText && isValidHexColor(drText)) payload.drPageTextColor = drText;

  const drLogo = fields.drPageLogoUrl?.trim();
  if (drLogo) payload.drPageLogoUrl = drLogo;

  const aplicacaoBg = fields.aplicacaoPageBackgroundColor.trim();
  if (aplicacaoBg && isValidHexColor(aplicacaoBg)) payload.aplicacaoPageBackgroundColor = aplicacaoBg;

  const aplicacaoText = fields.aplicacaoPageTextColor.trim();
  if (aplicacaoText && isValidHexColor(aplicacaoText)) payload.aplicacaoPageTextColor = aplicacaoText;

  const aplicacaoLogo = fields.aplicacaoPageLogoUrl?.trim();
  if (aplicacaoLogo) payload.aplicacaoPageLogoUrl = aplicacaoLogo;

  const conclusaoBg = fields.conclusaoPageBackgroundColor.trim();
  if (conclusaoBg && isValidHexColor(conclusaoBg)) payload.conclusaoPageBackgroundColor = conclusaoBg;

  const conclusaoText = fields.conclusaoPageTextColor.trim();
  if (conclusaoText && isValidHexColor(conclusaoText)) payload.conclusaoPageTextColor = conclusaoText;

  const conclusaoLogo = fields.conclusaoPageLogoUrl?.trim();
  if (conclusaoLogo) payload.conclusaoPageLogoUrl = conclusaoLogo;

  return payload;
}
