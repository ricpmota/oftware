import { toShellOrganizationBranding } from './getDefaultShellOrganizationBranding.server';
import type { ShellOrganizationBranding } from './getDefaultShellOrganizationBranding.server';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import {
  resolveMemberOrganizationId,
  type MemberOrganizationLegacyDefault,
  type MemberOrganizationLink,
} from './resolveMemberOrganizationId';
import type { OrganizationId } from './organizationTypes';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import { NEW_ORGANIZATION_SECONDARY_COLOR } from './buildNewOrganizationBrandingSeed';

export type MemberOrganizationBrandingPayload = {
  organizationId: OrganizationId | null;
  branding: ShellOrganizationBranding | null;
  hostOrganizationId: OrganizationId | null;
  organizationMatch: boolean;
};

export function organizationHostMatchesMember(
  memberOrganizationId: OrganizationId | null,
  hostOrganizationId: OrganizationId | null,
): boolean {
  if (!hostOrganizationId || !memberOrganizationId) return true;
  return hostOrganizationId === memberOrganizationId;
}

/**
 * Monta a resposta de branding a partir do vínculo já autenticado.
 * Organização inexistente não herda a marca de outra. O host só sinaliza divergência.
 */
export function buildMemberOrganizationBrandingPayload(input: {
  member: MemberOrganizationLink | null | undefined;
  legacyDefault: MemberOrganizationLegacyDefault;
  organizationExists: boolean;
  branding: OrganizationBrandingStored | null;
  hostOrganizationId: string | null;
}): MemberOrganizationBrandingPayload {
  const organizationId = resolveMemberOrganizationId(input.member, input.legacyDefault);
  const hostOrganizationId = (input.hostOrganizationId || '').trim() || null;
  const organizationMatch = organizationHostMatchesMember(organizationId, hostOrganizationId);

  if (!organizationId || !input.organizationExists || !input.branding) {
    return {
      organizationId,
      branding: null,
      hostOrganizationId,
      organizationMatch,
    };
  }

  const secondaryColorFallback =
    organizationId === METODO_ORGANIZATION_ID ? undefined : NEW_ORGANIZATION_SECONDARY_COLOR;

  return {
    organizationId,
    branding: toShellOrganizationBranding(input.branding, {
      secondaryColorFallback,
    }),
    hostOrganizationId,
    organizationMatch,
  };
}
