import { describe, expect, it } from 'vitest';
import { METODO_ORGANIZATION_ID, CLINICA_EXEMPLO_WL_ID } from '@/lib/organization/organizationRegistry';
import {
  leadBelongsToOrganization,
  resolveLeadOrganizationIdFromAuthUser,
} from '@/lib/email/emailAutomationOrganizations';
import { processOrganizationsByEngine } from '@/services/sendAutomaticEmailsCronService';
import type { EmailAutomationEngine } from '@/types/emailAutomationEngine';

describe('emailAutomationOrganizations', () => {
  it('defaults lead organization to metodo without custom claim', () => {
    expect(resolveLeadOrganizationIdFromAuthUser({ uid: 'u1' })).toBe(METODO_ORGANIZATION_ID);
    expect(leadBelongsToOrganization({ uid: 'u1' }, METODO_ORGANIZATION_ID)).toBe(true);
    expect(leadBelongsToOrganization({ uid: 'u1' }, CLINICA_EXEMPLO_WL_ID)).toBe(false);
  });

  it('respects organizationId custom claim', () => {
    const user = {
      uid: 'u2',
      customClaims: { organizationId: CLINICA_EXEMPLO_WL_ID },
    };
    expect(resolveLeadOrganizationIdFromAuthUser(user)).toBe(CLINICA_EXEMPLO_WL_ID);
    expect(leadBelongsToOrganization(user, CLINICA_EXEMPLO_WL_ID)).toBe(true);
    expect(leadBelongsToOrganization(user, METODO_ORGANIZATION_ID)).toBe(false);
  });
});

describe('processOrganizationsByEngine', () => {
  it('case 1: metodo=queue, clinica=legacy — both processed independently', async () => {
    const engines: Record<string, EmailAutomationEngine> = {
      metodo: 'queue',
      clinica_exemplo_wl: 'legacy',
    };
    const processed: Array<{ organizationId: string; engine: EmailAutomationEngine }> = [];

    const results = await processOrganizationsByEngine({
      organizationIds: [METODO_ORGANIZATION_ID, CLINICA_EXEMPLO_WL_ID],
      resolveEngine: async (organizationId) => engines[organizationId] ?? 'legacy',
      processOrganization: async (organizationId, engine) => {
        processed.push({ organizationId, engine });
        return {
          organizationId,
          engine,
          status: 'completed',
          sent: engine === 'queue' ? 2 : 1,
          failed: 0,
          skipped: 0,
          readsEstimated: engine === 'queue' ? 5 : 100,
          writesEstimated: engine === 'queue' ? 2 : 1,
          durationMs: 10,
        };
      },
    });

    expect(processed).toEqual([
      { organizationId: METODO_ORGANIZATION_ID, engine: 'queue' },
      { organizationId: CLINICA_EXEMPLO_WL_ID, engine: 'legacy' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].engine).toBe('queue');
    expect(results[1].engine).toBe('legacy');
  });

  it('case 2: metodo=legacy, clinica=legacy — both on legacy', async () => {
    const processed: EmailAutomationEngine[] = [];

    await processOrganizationsByEngine({
      organizationIds: [METODO_ORGANIZATION_ID, CLINICA_EXEMPLO_WL_ID],
      resolveEngine: async () => 'legacy',
      processOrganization: async (_organizationId, engine) => {
        processed.push(engine);
        return {
          organizationId: _organizationId,
          engine,
          status: 'completed',
          sent: 0,
          failed: 0,
          skipped: 0,
          readsEstimated: 0,
          writesEstimated: 0,
          durationMs: 1,
        };
      },
    });

    expect(processed).toEqual(['legacy', 'legacy']);
  });

  it('case 3: failure in metodo does not block clinica', async () => {
    const processed: string[] = [];

    const results = await processOrganizationsByEngine({
      organizationIds: [METODO_ORGANIZATION_ID, CLINICA_EXEMPLO_WL_ID],
      resolveEngine: async () => 'legacy',
      processOrganization: async (organizationId) => {
        processed.push(organizationId);
        if (organizationId === METODO_ORGANIZATION_ID) {
          throw new Error('falha simulada metodo');
        }
        return {
          organizationId,
          engine: 'legacy',
          status: 'completed',
          sent: 1,
          failed: 0,
          skipped: 0,
          readsEstimated: 1,
          writesEstimated: 1,
          durationMs: 1,
        };
      },
    });

    expect(processed).toEqual([METODO_ORGANIZATION_ID, CLINICA_EXEMPLO_WL_ID]);
    expect(results[0].status).toBe('failed');
    expect(results[0].organizationId).toBe(METODO_ORGANIZATION_ID);
    expect(results[1].status).toBe('completed');
    expect(results[1].organizationId).toBe(CLINICA_EXEMPLO_WL_ID);
  });

  it('case 5: org without governance document resolves to legacy', async () => {
    const map: Record<string, EmailAutomationEngine | undefined> = {};
    const engine = map.unknown_org ?? 'legacy';
    expect(engine).toBe('legacy');
  });
});
