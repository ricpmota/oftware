import { TEAM_MEMBER_COLLECTIONS, TEAM_SHARING_COLLECTIONS } from '@/lib/organization/organizationTeam';

/**
 * Coleções escopo Organização Método (Etapa 4).
 * Patrimônio Global (protocolos SISTEMA, etc.) fica de fora.
 */
export const ORGANIZATION_BACKFILL_COLLECTIONS = [
  TEAM_MEMBER_COLLECTIONS.medico,
  TEAM_MEMBER_COLLECTIONS.nutricionista,
  TEAM_MEMBER_COLLECTIONS.personal,
  'pacientes_completos',
  'solicitacoes_medico',
  TEAM_SHARING_COLLECTIONS.vinculoNutriMedico,
  TEAM_SHARING_COLLECTIONS.vinculoPersonalMedico,
  TEAM_SHARING_COLLECTIONS.solicitacaoNutriPaciente,
  TEAM_SHARING_COLLECTIONS.solicitacaoPersonalPaciente,
  TEAM_SHARING_COLLECTIONS.pacienteNutri,
  TEAM_SHARING_COLLECTIONS.pacientePersonal,
  'leads_medico',
  'aplicacao_links',
  'conclusao_links',
  'relatorio_paciente_links',
] as const;

export type OrganizationBackfillCollection = (typeof ORGANIZATION_BACKFILL_COLLECTIONS)[number];

export const ORGANIZATION_BACKFILL_MIGRATION_ID = 'organization-backfill' as const;
