/**
 * Equipe organizacional — Oftware 2.0 Etapa 3.
 *
 * Filosofia: médicos, nutricionistas e personais pertencem à Organização,
 * não ao médico individual. O compartilhamento de pacientes permanece igual;
 * futuramente a busca de profissionais será limitada à mesma Organização.
 *
 * Etapa 3: apenas tipos e documentação — sem Firestore.
 */

export { TEAM_ROLES, type OrganizationTeam, type TeamRole } from './organizationTypes';

/** Coleções Firestore que representam membros da equipe (referência futura). */
export const TEAM_MEMBER_COLLECTIONS = {
  medico: 'medicos',
  nutricionista: 'nutricionistas',
  personal: 'personal_trainers',
} as const;

/** Coleções de vínculo/compartilhamento (comportamento atual preservado). */
export const TEAM_SHARING_COLLECTIONS = {
  vinculoNutriMedico: 'solicitacoes_vinculo_nutri_medico',
  vinculoPersonalMedico: 'solicitacoes_vinculo_personal_medico',
  solicitacaoNutriPaciente: 'solicitacoes_nutricionista',
  solicitacaoPersonalPaciente: 'solicitacoes_personal_trainer',
  pacienteNutri: 'paciente_nutricionista',
  pacientePersonal: 'paciente_personal_trainer',
} as const;

/**
 * Regra alvo (não aplicada na Etapa 3):
 * buscas de profissionais para compartilhamento devem filtrar por organizationId.
 */
export const TEAM_SCOPE_RULE_ID = 'same-organization-only' as const;
