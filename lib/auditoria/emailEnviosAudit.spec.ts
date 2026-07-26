import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('emailEnviosAudit', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('não emite logs quando flag desligada', async () => {
    delete process.env.EMAIL_ENVIOS_AUDIT_ENABLED;
    delete process.env.NEXT_PUBLIC_EMAIL_ENVIOS_AUDIT_ENABLED;

    const { auditEmailEnviosQuery, EMAIL_ENVIOS_AUDIT_ENABLED } = await import(
      './emailEnviosAudit'
    );

    expect(EMAIL_ENVIOS_AUDIT_ENABLED).toBe(false);
    auditEmailEnviosQuery({
      siteId: 'test',
      surface: 'api',
      queryPattern: 'leadId_eq_emailTipo_in',
      leadId: 'uid-1',
      docsReturned: 3,
    });

    expect(console.info).not.toHaveBeenCalled();
  });

  it('emite scope_end com agregados quando flag ligada', async () => {
    process.env.EMAIL_ENVIOS_AUDIT_ENABLED = 'true';

    const {
      beginEmailEnviosAuditScope,
      auditEmailEnviosQuery,
      endEmailEnviosAuditScope,
    } = await import('./emailEnviosAudit');

    const scopeId = beginEmailEnviosAuditScope({
      siteId: 'test-scope',
      surface: 'cron',
    });

    auditEmailEnviosQuery({
      scopeId,
      siteId: 'test-scope',
      surface: 'cron',
      queryPattern: 'leadId_eq_emailTipo_in',
      leadId: 'lead-a',
      docsReturned: 2,
    });

    auditEmailEnviosQuery({
      scopeId,
      siteId: 'test-scope',
      surface: 'cron',
      queryPattern: 'leadId_eq_emailTipo_in',
      leadId: 'lead-a',
      cacheHit: true,
      docsReturned: 2,
    });

    endEmailEnviosAuditScope(scopeId);

    const infoCalls = (console.info as ReturnType<typeof vi.fn>).mock.calls.map((c) =>
      JSON.parse(String(c[0]).replace('[email_envios_audit] ', ''))
    );

    const scopeEnd = infoCalls.find((p) => p.kind === 'scope_end');
    expect(scopeEnd).toBeDefined();
    expect(scopeEnd.queryCount).toBe(2);
    expect(scopeEnd.docsRead).toBe(4);
    expect(scopeEnd.cacheHits).toBe(1);
    expect(scopeEnd.leadsWithMultipleQueries).toEqual([{ leadId: 'lead-a', count: 2 }]);
  });
});
