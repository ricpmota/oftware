/**
 * Tipos centrais — Organização Oftware 2.0 (Etapa 3).
 *
 * Organização é a unidade de negócio que possui equipe, pacientes e operação clínica.
 * Patrimônio Global (protocolos SISTEMA, IA, etc.) vive fora deste namespace.
 */

/** Identificador estável da organização (ex.: `metodo`). */
export type OrganizationId = string;

export type OrganizationKind = 'organization';

/** Papéis da Equipe dentro de uma Organização. */
export type TeamRole = 'medico' | 'nutricionista' | 'personal';

export const TEAM_ROLES = ['medico', 'nutricionista', 'personal'] as const satisfies readonly TeamRole[];

/**
 * Equipe — profissionais que pertencem à Organização (não ao médico individual).
 * Etapa 3: apenas tipagem/documentação; sem campo no Firestore ainda.
 */
export interface OrganizationTeam {
  organizationId: OrganizationId;
  /** Médicos, nutricionistas e personais compõem a mesma equipe organizacional. */
  roles: TeamRole[];
}

/** Definição estática de uma Organização (registry — Etapa 3). */
export interface OrganizationDefinition {
  id: OrganizationId;
  name: string;
  kind: OrganizationKind;
  /** Origem pública canônica, sem barra final (ex.: https://www.ometodoemagrecer.com.br). */
  primaryOrigin: string;
  /** Hosts HTTP que resolvem para esta organização (sem porta). */
  hosts: readonly string[];
}

/**
 * Contexto futuro de Organização Ativa (MetaAdminGeral, jobs, admin).
 * Etapa 3: não persistido; preparação para seletor multi-org.
 */
export interface ActiveOrganizationContext {
  organizationId: OrganizationId;
  /** Origem pública derivada do registry (conveniência). */
  primaryOrigin: string;
}

/** Módulos do Patrimônio Global da Oftware — sem organizationId. */
export type GlobalAssetModule =
  | 'protocolos'
  | 'biblioteca_protocolos'
  | 'prescricoes_sistema'
  | 'ia'
  | 'bioimpedancia_referencias'
  | 'laboratorio_referencias'
  | 'templates_globais'
  | 'oftpay'
  | 'marketplace'
  | 'conteudo_cientifico'
  | 'cursos'
  | 'mentorias';
