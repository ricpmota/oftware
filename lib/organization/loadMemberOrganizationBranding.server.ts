import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { buildMemberOrganizationBrandingPayload } from '@/lib/organization/memberOrganizationBranding';
import type { MemberOrganizationBrandingPayload } from '@/lib/organization/memberOrganizationBranding';
import type { MemberOrganizationLegacyDefault, MemberOrganizationLink } from '@/lib/organization/resolveMemberOrganizationId';
import { resolveMemberOrganizationId } from '@/lib/organization/resolveMemberOrganizationId';
import { resolveOrganizationDefinition } from '@/lib/organization/resolveOrganizationDefinition.server';
import { resolveOrganizationIdFromRegisteredHosts } from '@/lib/organization/resolveOrganizationIdFromRegisteredHosts.server';

/**
 * Lê a marca da organização do profissional. Não grava seed nem aceita organizationId do cliente.
 */
export async function loadMemberOrganizationBranding(input: {
  member: MemberOrganizationLink | null | undefined;
  legacyDefault: MemberOrganizationLegacyDefault;
  host: string | null;
}): Promise<MemberOrganizationBrandingPayload> {
  const organizationId = resolveMemberOrganizationId(input.member, input.legacyDefault);
  const hostOrganizationId = await resolveOrganizationIdFromRegisteredHosts(input.host);

  if (!organizationId) {
    return buildMemberOrganizationBrandingPayload({
      member: input.member,
      legacyDefault: input.legacyDefault,
      organizationExists: false,
      branding: null,
      hostOrganizationId,
    });
  }

  const organization = await resolveOrganizationDefinition(organizationId);
  if (!organization) {
    return buildMemberOrganizationBrandingPayload({
      member: input.member,
      legacyDefault: input.legacyDefault,
      organizationExists: false,
      branding: null,
      hostOrganizationId,
    });
  }

  const branding = await getOrganizationBranding(organizationId);
  return buildMemberOrganizationBrandingPayload({
    member: input.member,
    legacyDefault: input.legacyDefault,
    organizationExists: true,
    branding,
    hostOrganizationId,
  });
}
