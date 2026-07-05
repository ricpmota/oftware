import type { OrganizationId } from '@/lib/organization/organizationTypes';

/** Modos suportados pelo runner genérico de migrações. */
export type MigrationMode = 'diagnose' | 'dry-run' | 'execute';

/** Classificação de organizationId em um documento (idempotência). */
export type OrganizationIdDocClass =
  | 'missing'
  | 'empty'
  | 'with_target'
  | 'with_other';

export type MigrationCollectionDiagnosis = {
  collection: string;
  total: number;
  /** Possui organizationId preenchido (qualquer valor). */
  withOrganizationId: number;
  /** Sem organizationId ou string vazia — candidatos ao backfill. */
  withoutOrganizationId: number;
  /** Já possui organizationId === alvo da migração. */
  withTargetOrganizationId: number;
  /** Possui organizationId diferente do alvo — nunca sobrescrever. */
  withOtherOrganizationId: number;
  /** Em dry-run / execute: documentos que seriam / foram atualizados. */
  wouldUpdate?: number;
  durationMs: number;
};

export type MigrationCollectionError = {
  collection: string;
  docId: string;
  message: string;
};

export type MigrationCollectionExecuteResult = {
  collection: string;
  documentsUpdated: number;
  documentsIgnored: number;
  /** Possui organizationId diferente do alvo — nunca alterados. */
  documentsWithOtherOrganizationId: number;
  errors: MigrationCollectionError[];
  durationMs: number;
};

export type MigrationDiagnosisReport = {
  migrationId: string;
  mode: 'diagnose';
  organizationId: OrganizationId;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  collections: MigrationCollectionDiagnosis[];
  totals: {
    total: number;
    withOrganizationId: number;
    withoutOrganizationId: number;
    withTargetOrganizationId: number;
    withOtherOrganizationId: number;
  };
};

export type MigrationDryRunReport = {
  migrationId: string;
  mode: 'dry-run';
  organizationId: OrganizationId;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  collections: MigrationCollectionDiagnosis[];
  totals: {
    total: number;
    withOrganizationId: number;
    withoutOrganizationId: number;
    wouldUpdate: number;
  };
  message: string;
};

export type MigrationExecuteReport = {
  migrationId: string;
  mode: 'execute';
  organizationId: OrganizationId;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  collections: MigrationCollectionExecuteResult[];
  totals: {
    documentsUpdated: number;
    documentsIgnored: number;
    documentsWithOtherOrganizationId: number;
    errors: number;
  };
};

export type MigrationReport =
  | MigrationDiagnosisReport
  | MigrationDryRunReport
  | MigrationExecuteReport;

/** Contrato para futura UI: MetaAdminGeral → Ferramentas → Migrações. */
export type MigrationDefinition = {
  id: string;
  title: string;
  description: string;
  /** Caminho visual futuro no MAG. */
  magPath: readonly string[];
  collections: readonly string[];
};
