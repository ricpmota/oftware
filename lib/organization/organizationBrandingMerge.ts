import type { MedicoWhiteLabelStored } from '@/types/medico';
import type { MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';
import { publicPagesFormFromStored } from '@/lib/whiteLabel/publicPagesTheme';
import type { OrganizationDefinition } from './organizationTypes';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import {
  buildHardcodedOrganizationBranding,
  mergeOrganizationBrandingLayers,
  pickColor,
  pickUrl,
} from './organizationBrandingDefaults';

/** Camada 3 — extrai branding parcial do whiteLabel da conta fonte. */
export function organizationBrandingLayerFromSourceMedicoWhiteLabel(
  organization: OrganizationDefinition,
  whiteLabel: MedicoWhiteLabelStored | null | undefined,
): Partial<OrganizationBrandingStored> | null {
  if (!whiteLabel) return null;

  const pages = publicPagesFormFromStored(whiteLabel);

  return {
    defaultDescription: whiteLabel.description?.trim() || undefined,
    logoMainUrl: pickUrl(pages.drPageLogoUrl, null),
    faviconUrl: pickUrl(whiteLabel.faviconUrl, null),
    ogImageUrl: pickUrl(whiteLabel.ogImageUrl, null),
    pdfLogoUrl: pickUrl(whiteLabel.pdfLogoUrl, null),
    primaryColor: whiteLabel.primaryColor?.trim() || undefined,
    secondaryColor: whiteLabel.drPageBackgroundColor?.trim() || undefined,
    publicPages: {
      dr: {
        backgroundColor: pages.drPageBackgroundColor,
        textColor: pages.drPageTextColor,
        logoUrl: pages.drPageLogoUrl,
      },
      aplicacao: {
        backgroundColor: pages.aplicacaoPageBackgroundColor,
        textColor: pages.aplicacaoPageTextColor,
        logoUrl: pages.aplicacaoPageLogoUrl,
      },
      conclusao: {
        backgroundColor: pages.conclusaoPageBackgroundColor,
        textColor: pages.conclusaoPageTextColor,
        logoUrl: pages.conclusaoPageLogoUrl,
      },
    },
    showPoweredByOftware: whiteLabel.showPoweredByOftware,
  };
}

/** Camada 2 — extrai branding parcial do template Método em platformSettings. */
export function organizationBrandingLayerFromMetodoImagens(
  template: MetodoImagensTemplate | null | undefined,
): Partial<OrganizationBrandingStored> | null {
  if (!template) return null;

  const hasAny =
    !!template.ogImageUrl ||
    !!template.faviconUrl ||
    !!template.pdfLogoUrl ||
    !!template.drPageLogoUrl ||
    !!template.aplicacaoPageLogoUrl ||
    !!template.conclusaoPageLogoUrl;

  if (!hasAny) return null;

  const drLogo = pickUrl(template.drPageLogoUrl, null);
  const aplicacaoLogo = pickUrl(template.aplicacaoPageLogoUrl, null);
  const conclusaoLogo = pickUrl(template.conclusaoPageLogoUrl, null);

  return {
    logoMainUrl: drLogo,
    faviconUrl: pickUrl(template.faviconUrl, null),
    ogImageUrl: pickUrl(template.ogImageUrl, null),
    pdfLogoUrl: pickUrl(template.pdfLogoUrl, null),
    iconUrl: pickUrl(template.faviconUrl, null),
    publicPages: {
      dr: { logoUrl: drLogo },
      aplicacao: { logoUrl: aplicacaoLogo },
      conclusao: { logoUrl: conclusaoLogo },
    },
  };
}

/** Payload completo para seed (sem camada Firestore). */
export function buildOrganizationBrandingSeedPayload(input: {
  organization: OrganizationDefinition;
  metodoImagens?: MetodoImagensTemplate | null;
  sourceWhiteLabel?: MedicoWhiteLabelStored | null;
}): OrganizationBrandingStored {
  const hardcoded = buildHardcodedOrganizationBranding(input.organization);
  const fromMedico = organizationBrandingLayerFromSourceMedicoWhiteLabel(
    input.organization,
    input.sourceWhiteLabel,
  );
  const fromPlatform = organizationBrandingLayerFromMetodoImagens(input.metodoImagens);

  const layers: Partial<OrganizationBrandingStored>[] = [hardcoded];
  if (fromMedico) layers.push(fromMedico);
  if (fromPlatform) layers.push(fromPlatform);

  const merged = mergeOrganizationBrandingLayers(layers);

  return {
    ...merged,
    primaryColor: pickColor(merged.primaryColor, hardcoded.primaryColor),
    secondaryColor: pickColor(merged.secondaryColor, hardcoded.secondaryColor),
    logoMainUrl:
      pickUrl(merged.publicPages.dr.logoUrl, null) ||
      pickUrl(merged.logoMainUrl, hardcoded.logoMainUrl),
    seedVersion: hardcoded.seedVersion,
  };
}

export function resolveOrganizationBrandingSourceLayer(input: {
  firestoreBranding?: OrganizationBrandingStored | null;
  metodoImagens?: MetodoImagensTemplate | null;
  sourceWhiteLabel?: MedicoWhiteLabelStored | null;
}): 'firestore' | 'platformSettings' | 'sourceMedico' | 'hardcoded' {
  if (input.firestoreBranding?.publicName?.trim()) return 'firestore';

  const platformLayer = organizationBrandingLayerFromMetodoImagens(input.metodoImagens);
  if (platformLayer) return 'platformSettings';

  const medicoLayer = organizationBrandingLayerFromSourceMedicoWhiteLabel(
    { id: 'metodo', name: 'Método Emagrecer', kind: 'organization', primaryOrigin: '', hosts: [] },
    input.sourceWhiteLabel,
  );
  if (medicoLayer) return 'sourceMedico';

  return 'hardcoded';
}

/** Resolver puro (testável) — mescla camadas na ordem do fallback. */
export function resolveOrganizationBrandingFromSources(input: {
  organization: OrganizationDefinition;
  firestoreBranding?: OrganizationBrandingStored | null;
  metodoImagens?: MetodoImagensTemplate | null;
  sourceWhiteLabel?: MedicoWhiteLabelStored | null;
}): OrganizationBrandingStored {
  const hardcoded = buildHardcodedOrganizationBranding(input.organization);
  const fromMedico = organizationBrandingLayerFromSourceMedicoWhiteLabel(
    input.organization,
    input.sourceWhiteLabel,
  );
  const fromPlatform = organizationBrandingLayerFromMetodoImagens(input.metodoImagens);

  const layers: Partial<OrganizationBrandingStored>[] = [hardcoded];
  if (fromMedico) layers.push(fromMedico);
  if (fromPlatform) layers.push(fromPlatform);
  if (input.firestoreBranding) layers.push(input.firestoreBranding);

  return mergeOrganizationBrandingLayers(layers);
}
