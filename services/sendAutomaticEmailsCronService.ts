import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { AUTOMATION_ENGINE_LOG_PREFIX } from '@/lib/automation/executionId';
import { listEmailAutomationOrganizations } from '@/lib/email/emailAutomationOrganizations';
import { getEmailAutomationEngine } from '@/lib/email/getEmailAutomationEngine';
import type { EmailAutomationEngine } from '@/types/emailAutomationEngine';
import {
  loadLegacyEmailSharedContext,
  processLegacyEmailEngineForOrganization,
  type EnvioCampanhaLead,
} from '@/services/emailLegacyAutomationEngine';
import { processEmailQueueAutomationEngine } from '@/services/emailAutomationEngineProcessor';

export type CronOrganizationEmailResult = {
  organizationId: string;
  engine: EmailAutomationEngine;
  status: 'completed' | 'failed' | 'skipped';
  sent: number;
  failed: number;
  skipped: number;
  readsEstimated: number;
  writesEstimated: number;
  durationMs: number;
  emailEnviosDocsLidos?: number;
  emailEnviosQueries?: number;
  error?: string;
};

export type RunSendAutomaticEmailsCronResult = {
  success: boolean;
  timestamp: string;
  organizations: CronOrganizationEmailResult[];
  enviados: number;
  falhas: number;
  skipped: number;
  firestoreReads: number;
  firestoreWrites: number;
  durationMs: number;
  emailEnviosQueries: number;
  emailEnviosDocsLidos: number;
  provedor: 'ZeptoMail';
};

type OrganizationProcessor = (
  organizationId: string,
  engine: EmailAutomationEngine,
) => Promise<CronOrganizationEmailResult>;

/** Orquestração pura — testável sem Firebase. */
export async function processOrganizationsByEngine(params: {
  organizationIds: string[];
  resolveEngine: (organizationId: string) => Promise<EmailAutomationEngine>;
  processOrganization: OrganizationProcessor;
}): Promise<CronOrganizationEmailResult[]> {
  const results: CronOrganizationEmailResult[] = [];

  for (const organizationId of params.organizationIds) {
    const engine = await params.resolveEngine(organizationId);
    try {
      results.push(await params.processOrganization(organizationId, engine));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao processar organização.';
      console.error(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][org_failed]`, {
        organizationId,
        engine,
        error: message,
      });
      results.push({
        organizationId,
        engine,
        status: 'failed',
        sent: 0,
        failed: 0,
        skipped: 0,
        readsEstimated: 0,
        writesEstimated: 0,
        durationMs: 0,
        error: message,
      });
    }
  }

  return results;
}

function mapLegacyResult(
  organizationId: string,
  engine: Extract<EmailAutomationEngine, 'legacy' | 'shadow'>,
  legacy: Awaited<ReturnType<typeof processLegacyEmailEngineForOrganization>>,
): CronOrganizationEmailResult {
  return {
    organizationId,
    engine,
    status: legacy.status,
    sent: legacy.sent,
    failed: legacy.failed,
    skipped: legacy.skipped,
    readsEstimated: legacy.readsEstimated,
    writesEstimated: legacy.writesEstimated,
    durationMs: legacy.durationMs,
    emailEnviosDocsLidos: legacy.emailEnviosDocsLidos,
    emailEnviosQueries: legacy.emailEnviosQueries,
  };
}

function mapQueueResult(
  organizationId: string,
  queue: Awaited<ReturnType<typeof processEmailQueueAutomationEngine>>,
): CronOrganizationEmailResult {
  return {
    organizationId,
    engine: 'queue',
    status: 'completed',
    sent: queue.sentCount,
    failed: queue.failedCount,
    skipped: queue.skippedCount,
    readsEstimated: queue.firestoreReads,
    writesEstimated: queue.firestoreWrites,
    durationMs: queue.durationMs,
    emailEnviosQueries: 0,
    emailEnviosDocsLidos: 0,
  };
}

export async function runSendAutomaticEmailsCron(params: {
  db: Firestore;
  auth: Auth;
  agora?: Date;
  auditScopeId?: string;
}): Promise<RunSendAutomaticEmailsCronResult> {
  const agora = params.agora ?? new Date();
  const cronStartedAt = Date.now();
  const organizationIds = await listEmailAutomationOrganizations();

  const sharedLegacy = await loadLegacyEmailSharedContext(params.db, params.auth);
  const enviosPorLeadCache = new Map<string, EnvioCampanhaLead[]>();

  const organizations = await processOrganizationsByEngine({
    organizationIds,
    resolveEngine: getEmailAutomationEngine,
    processOrganization: async (organizationId, engine) => {
      const orgStartedAt = Date.now();

      console.log(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][org_start]`, {
        organizationId,
        engine,
        timestamp: agora.toISOString(),
      });

      try {
        let result: CronOrganizationEmailResult;

        if (engine === 'queue') {
          const queue = await processEmailQueueAutomationEngine({ organizationId, now: agora });
          result = mapQueueResult(organizationId, queue);
        } else {
          const legacyEngine = engine === 'shadow' ? 'shadow' : 'legacy';
          const legacy = await processLegacyEmailEngineForOrganization({
            organizationId,
            engine: legacyEngine,
            agora,
            db: params.db,
            shared: sharedLegacy,
            auditScopeId: params.auditScopeId,
            enviosPorLeadCache,
          });
          result = mapLegacyResult(organizationId, legacyEngine, legacy);
        }

        console.log(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][org_complete]`, {
          organizationId,
          engine: result.engine,
          readsEstimated: result.readsEstimated,
          writesEstimated: result.writesEstimated,
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          durationMs: result.durationMs,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao processar organização.';
        console.error(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][org_failed]`, {
          organizationId,
          engine,
          readsEstimated: 0,
          writesEstimated: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          durationMs: Date.now() - orgStartedAt,
          error: message,
        });
        throw error;
      }
    },
  });

  const aggregate = organizations.reduce(
    (acc, org) => ({
      enviados: acc.enviados + org.sent,
      falhas: acc.falhas + org.failed,
      skipped: acc.skipped + org.skipped,
      firestoreReads: acc.firestoreReads + org.readsEstimated,
      firestoreWrites: acc.firestoreWrites + org.writesEstimated,
      emailEnviosDocsLidos: acc.emailEnviosDocsLidos + (org.emailEnviosDocsLidos ?? 0),
      emailEnviosQueries: acc.emailEnviosQueries + (org.emailEnviosQueries ?? 0),
    }),
    {
      enviados: 0,
      falhas: 0,
      skipped: 0,
      firestoreReads: 0,
      firestoreWrites: 0,
      emailEnviosDocsLidos: 0,
      emailEnviosQueries: 0,
    },
  );

  return {
    success: true,
    timestamp: agora.toISOString(),
    organizations,
    enviados: aggregate.enviados,
    falhas: aggregate.falhas,
    skipped: aggregate.skipped,
    firestoreReads: aggregate.firestoreReads,
    firestoreWrites: aggregate.firestoreWrites,
    durationMs: Date.now() - cronStartedAt,
    emailEnviosQueries: aggregate.emailEnviosQueries,
    emailEnviosDocsLidos: aggregate.emailEnviosDocsLidos,
    provedor: 'ZeptoMail',
  };
}
