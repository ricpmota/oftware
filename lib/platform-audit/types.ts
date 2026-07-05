import type { OrganizationId } from '@/lib/organization/organizationTypes';
import type { MigrationCollectionDiagnosis } from '@/lib/migrations/types';

export type OrganizationAuditSummary = {
  organizationId: OrganizationId;
  totalDocuments: number;
  withOrganizationId: number;
  withoutOrganizationId: number;
  withTargetOrganizationId: number;
  withOtherOrganizationId: number;
  coveragePercent: number;
  collections: MigrationCollectionDiagnosis[];
};

export type PatientsAuditSummary = {
  total: number;
  withoutMedicoResponsavelId: number;
  withValidMedicoResponsavelId: number;
  withInvalidMedicoResponsavelId: number;
  withoutUserId: number;
  durationMs: number;
};

export type TeamMemberAuditRow = {
  collection: string;
  label: string;
  total: number;
  withoutOrganizationId: number;
};

export type TeamAuditSummary = {
  members: TeamMemberAuditRow[];
  professionalsWithoutOrganizationId: number;
  medicoNutriVinculos: number;
  medicoPersonalVinculos: number;
  durationMs: number;
};

export type PublicLinkCollectionAudit = {
  collection: string;
  total: number;
  withoutOrganizationId: number;
};

export type PublicLinksAuditSummary = {
  collections: PublicLinkCollectionAudit[];
  total: number;
  withoutOrganizationId: number;
};

export type PlatformHealthReport = {
  generatedAt: string;
  durationMs: number;
  organizationId: OrganizationId;
  organization: OrganizationAuditSummary;
  patients: PatientsAuditSummary;
  team: TeamAuditSummary;
  publicLinks: PublicLinksAuditSummary;
};
