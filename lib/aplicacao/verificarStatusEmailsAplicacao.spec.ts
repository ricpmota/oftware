import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  applyEmailStatusToAplicacoes,
  assertNoFullScanPlan,
  emailsNeedingLegacyFallback,
  filterEnviosAplicacaoInWindow,
  planEnviosAplicacaoQueries,
  uniquePacienteEmails,
  uniquePacienteLeadIds,
  type EnvioAplicacaoLedger,
} from '@/lib/aplicacao/verificarStatusEmailsAplicacao';
import type { AplicacaoAgendada } from '@/types/calendario';
import {
  EMAIL_ENVIOS_LARGE_READ_WARNING_THRESHOLD,
  logEmailEnviosResidual,
} from '@/lib/email/emailEnviosResidualMetrics';

function makeAplicacao(
  partial: Partial<AplicacaoAgendada> & Pick<AplicacaoAgendada, 'pacienteEmail' | 'dataAplicacao'>,
): AplicacaoAgendada {
  return {
    id: partial.id ?? 'a1',
    pacienteId: partial.pacienteId ?? 'p1',
    pacienteUserId: partial.pacienteUserId,
    pacienteNome: partial.pacienteNome ?? 'Ana',
    pacienteEmail: partial.pacienteEmail,
    dataAplicacao: partial.dataAplicacao,
    dosePrevista: partial.dosePrevista ?? 2.5,
    numeroAplicacao: partial.numeroAplicacao ?? 1,
    statusEmailAntes: partial.statusEmailAntes ?? 'nao_enviado',
    statusEmailDia: partial.statusEmailDia ?? 'nao_enviado',
    medicoResponsavelId: partial.medicoResponsavelId,
  };
}

describe('planEnviosAplicacaoQueries — sem full-scan', () => {
  it('com leadIds planeja apenas batches dos candidatos', () => {
    const leadIds = Array.from({ length: 30 }, (_, i) => `lead-${i}`);
    const plan = planEnviosAplicacaoQueries({ leadIds, emails: ['x@y.com'] });
    expect(plan.leadIdBatches).toHaveLength(1);
    expect(plan.leadIdBatches[0]).toHaveLength(30);
    expect(plan.leadEmailBatches).toHaveLength(0);
    expect(plan.refuseFullScan).toBe(true);
  });

  it('sem leadIds usa apenas e-mails candidatos — nunca full-scan', () => {
    const plan = planEnviosAplicacaoQueries({
      leadIds: [],
      emails: ['a@x.com', 'b@x.com'],
    });
    expect(plan.leadIdBatches).toHaveLength(0);
    expect(plan.leadEmailBatches).toHaveLength(1);
    expect(plan.leadEmailBatches[0]).toEqual(['a@x.com', 'b@x.com']);
  });

  it('sem candidatos planeja zero queries (sem fallback global)', () => {
    const plan = planEnviosAplicacaoQueries({ leadIds: [], emails: [] });
    expect(plan.leadIdBatches).toHaveLength(0);
    expect(plan.leadEmailBatches).toHaveLength(0);
  });

  it('escala: 18 mil históricos + 30 candidatos → só batches dos 30', () => {
    const candidates = Array.from({ length: 30 }, (_, i) => `c-${i}`);
    const result = assertNoFullScanPlan({
      historicalDocs: 18_233,
      candidateLeadIds: candidates,
      candidateEmails: [],
    });
    expect(result.wouldScanAll).toBe(false);
    expect(result.batchCount).toBe(1);
  });
});

describe('verificarStatusEmailsAplicacao — funcional', () => {
  it('uniquePacienteLeadIds inclui pacienteUserId', () => {
    const ids = uniquePacienteLeadIds([
      makeAplicacao({
        pacienteId: 'doc-1',
        pacienteUserId: 'uid-1',
        pacienteEmail: 'a@x.com',
        dataAplicacao: new Date(),
      }),
    ]);
    expect(ids.sort()).toEqual(['doc-1', 'uid-1'].sort());
  });

  it('uniquePacienteEmails deduplica', () => {
    expect(
      uniquePacienteEmails([
        makeAplicacao({ pacienteEmail: 'a@x.com', dataAplicacao: new Date() }),
        makeAplicacao({ pacienteEmail: 'a@x.com', dataAplicacao: new Date() }),
      ]),
    ).toEqual(['a@x.com']);
  });

  it('filtra tipos e janela — menos docs efetivos', () => {
    const window = {
      start: new Date('2026-07-01T00:00:00.000Z'),
      end: new Date('2026-07-31T23:59:59.000Z'),
    };
    const envios: EnvioAplicacaoLedger[] = [
      {
        emailTipo: 'aplicacao_aplicacao_antes',
        leadEmail: 'a@x.com',
        leadNome: 'Ana',
        enviadoEm: new Date('2026-07-15T10:00:00.000Z'),
      },
      {
        emailTipo: 'email1',
        leadEmail: 'a@x.com',
        enviadoEm: new Date('2026-07-15T10:00:00.000Z'),
      },
      {
        emailTipo: 'aplicacao_aplicacao_dia',
        leadEmail: 'a@x.com',
        enviadoEm: new Date('2026-06-01T10:00:00.000Z'),
      },
    ];
    const filtered = filterEnviosAplicacaoInWindow(envios, window);
    expect(filtered).toHaveLength(1);
  });

  it('preserva status enviado por email+nome (regra visual HEAD)', () => {
    const dataAplicacao = new Date(2026, 6, 21, 0, 0, 0);
    const aplicacoes = [
      makeAplicacao({
        pacienteId: 'p-ana',
        pacienteEmail: 'ana@oftware.com',
        pacienteNome: 'Ana',
        dataAplicacao,
      }),
    ];
    const envios: EnvioAplicacaoLedger[] = [
      {
        emailTipo: 'aplicacao_aplicacao_dia',
        leadId: 'p-ana',
        leadEmail: 'ana@oftware.com',
        leadNome: 'Ana',
        enviadoEm: dataAplicacao,
      },
      {
        emailTipo: 'aplicacao_aplicacao_dia',
        leadId: 'p-outra',
        leadEmail: 'outra@oftware.com',
        leadNome: 'Outra',
        enviadoEm: dataAplicacao,
      },
    ];
    const result = applyEmailStatusToAplicacoes(aplicacoes, envios, new Date(2026, 6, 21, 15, 0, 0));
    expect(result[0]!.statusEmailDia).toBe('enviado');
  });

  it('leadId sozinho NÃO marca enviado se email/nome divergem (equivalência com HEAD)', () => {
    const dataAplicacao = new Date(2026, 6, 21, 0, 0, 0);
    const aplicacoes = [
      makeAplicacao({
        pacienteId: 'p-ana',
        pacienteUserId: 'uid-ana',
        pacienteEmail: 'novo@oftware.com',
        pacienteNome: 'Ana',
        dataAplicacao,
      }),
    ];
    const envios: EnvioAplicacaoLedger[] = [
      {
        emailTipo: 'aplicacao_aplicacao_dia',
        leadId: 'uid-ana',
        leadEmail: 'antigo@oftware.com',
        leadNome: 'Ana',
        enviadoEm: dataAplicacao,
      },
    ];
    const result = applyEmailStatusToAplicacoes(aplicacoes, envios, new Date(2026, 6, 21, 15, 0, 0));
    expect(result[0]!.statusEmailDia).not.toBe('enviado');
  });

  it('emailsNeedingLegacyFallback só lista quem não teve match', () => {
    const aplicacoes = [
      makeAplicacao({
        pacienteId: 'p1',
        pacienteEmail: 'a@x.com',
        dataAplicacao: new Date(),
      }),
      makeAplicacao({
        pacienteId: 'p2',
        pacienteEmail: 'b@x.com',
        dataAplicacao: new Date(),
      }),
    ];
    const envios: EnvioAplicacaoLedger[] = [
      {
        emailTipo: 'aplicacao_aplicacao_antes',
        leadId: 'p1',
        leadEmail: 'a@x.com',
        enviadoEm: new Date(),
      },
    ];
    expect(emailsNeedingLegacyFallback(aplicacoes, envios)).toEqual(['b@x.com']);
  });
});

describe('logEmailEnviosResidual guardrail', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('emite large_read_warning acima de 500 docs mesmo com audit desligado', async () => {
    delete process.env.EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED;
    delete process.env.NEXT_PUBLIC_EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED;
    vi.resetModules();
    const { logEmailEnviosResidual: log } = await import('@/lib/email/emailEnviosResidualMetrics');

    log({
      origin: 'test',
      queryCount: 1,
      docsReturned: EMAIL_ENVIOS_LARGE_READ_WARNING_THRESHOLD + 1,
      docsReadEstimated: EMAIL_ENVIOS_LARGE_READ_WARNING_THRESHOLD + 1,
      durationMs: 10,
    });

    expect(console.warn).toHaveBeenCalled();
    const msg = String((console.warn as ReturnType<typeof vi.fn>).mock.calls[0]![0]);
    expect(msg).toContain('[email_envios_residual][large_read_warning]');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('com flag ligada emite log detalhado', async () => {
    process.env.EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED = 'true';
    vi.resetModules();
    const { logEmailEnviosResidual: log } = await import('@/lib/email/emailEnviosResidualMetrics');

    log({
      origin: 'test',
      route: '/metaadmingeral',
      queryCount: 2,
      candidateCount: 30,
      docsReturned: 4,
      docsReadEstimated: 40,
      durationMs: 12,
      batchCount: 2,
    });

    expect(console.info).toHaveBeenCalled();
    const msg = String((console.info as ReturnType<typeof vi.fn>).mock.calls[0]![0]);
    expect(msg.startsWith('[email_envios_residual]')).toBe(true);
    expect(msg).toContain('"candidateCount":30');
  });
});
