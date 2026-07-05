import { isMetodoOrganizationMember } from './isMetodoOrganizationMember';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import type { OrganizationId } from './organizationTypes';

type TeamMemberOrgFields = {
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
};

/** Membro da equipe pertence à organização ativa (inclui legado sem organizationId → Método). */
export function isOrganizationTeamMember(
  member: TeamMemberOrgFields,
  organizationId: OrganizationId,
): boolean {
  if (organizationId === METODO_ORGANIZATION_ID) {
    const orgId = (member.organizationId || '').trim();
    if (!orgId) return true;
    return isMetodoOrganizationMember(member);
  }
  return (member.organizationId || '').trim() === organizationId;
}
