import {
  resolveMedicoWhiteLabel,
  type MedicoWhiteLabelResolved,
  type MedicoWhiteLabelSource,
} from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { getOrSyncMetodoImagensTemplate } from '@/lib/metodo/metodoImagensService.server';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import { getMetodoOrganizationBrandingForDualRead } from '@/lib/organization/getMetodoOrganizationBrandingForDualRead.server';
import { loadOrganizationPublicBranding } from '@/lib/organization/loadOrganizationPublicBranding.server';
import {
  resolveOrganizationMedicoWhiteLabel,
  resolvePublicPageIdentityRoute,
} from '@/lib/whiteLabel/organizationPublicIdentity';

export type MedicoWhiteLabelSourceWithMetodo = MedicoWhiteLabelSource & {
  metodoImagensAtivo?: boolean;
  organizationId?: string | null;
};

/** Resolve identidade white label com dual read da Organização Método (Etapa 11.2). */
export async function resolveMedicoWhiteLabelWithMetodo(
  source: MedicoWhiteLabelSourceWithMetodo,
): Promise<MedicoWhiteLabelResolved> {
  const route = resolvePublicPageIdentityRoute(source);
  if (route.kind === 'organization') {
    const organizationBranding = await loadOrganizationPublicBranding(route.organizationId);
    return resolveOrganizationMedicoWhiteLabel(source, organizationBranding);
  }

  const metodoAtivo = source.metodoImagensAtivo === true;
  const metodoTemplate = metodoAtivo ? await getOrSyncMetodoImagensTemplate() : null;

  let organizationBranding = source.organizationBranding ?? null;
  if (organizationBranding === null && isMetodoOrganizationMember(source)) {
    try {
      organizationBranding = await getMetodoOrganizationBrandingForDualRead();
      if (process.env.NODE_ENV === 'development' && organizationBranding) {
        console.debug('[dual-read] organizations/metodo.branding aplicado ao resolver white label');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[dual-read] fallback legado — org branding indisponível', error);
      }
    }
  }

  return resolveMedicoWhiteLabel({
    ...source,
    metodoTemplate,
    organizationBranding,
  });
}
