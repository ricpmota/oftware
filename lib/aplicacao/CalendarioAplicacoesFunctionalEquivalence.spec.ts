/**
 * GARANTIA PERMANENTE — Calendário de Aplicações × email_envios
 *
 * Compara a implementação de REFERÊNCIA (comportamento visual/funcional de
 * produção pré-otimização: full-scan dos 2 tipos + match leadEmail+leadNome+±24h)
 * com a implementação ATUAL (fetch por candidatos + mesma regra visual).
 *
 * Se uma otimização futura alterar silenciosamente badges/status da UI,
 * este teste DEVE falhar.
 *
 * NÃO altere `resultadoImplementacaoReferencia` para “acompanhar” a otimização.
 * Se o produto decidir mudar a regra visual, atualize a referência de forma
 * explícita e documentada — nunca como efeito colateral de performance.
 */
import { describe, expect, it } from 'vitest';
import type { AplicacaoAgendada } from '@/types/calendario';
import {
  applyStatusWithOptimizedFetch,
  type EnvioAplicacaoLedger,
} from '@/lib/aplicacao/verificarStatusEmailsAplicacao';

const MS_24H = 24 * 60 * 60 * 1000;

const TIPOS_APLICACAO = new Set([
  'aplicacao_aplicacao_antes',
  'aplicacao_aplicacao_dia',
]);

/** Snapshot funcional retornado à UI do calendário (deep-comparable). */
export type CalendarioUiFunctionalSnapshot = {
  id: string;
  pacienteId: string;
  pacienteUserId?: string;
  pacienteNome: string;
  pacienteEmail: string;
  dataAplicacaoIso: string;
  dosePrevista: number;
  numeroAplicacao: number;
  statusEmailAntes: 'enviado' | 'nao_enviado' | 'pendente';
  statusEmailDia: 'enviado' | 'nao_enviado' | 'pendente';
  medicoResponsavelId?: string | null;
};

function toUiSnapshot(apps: AplicacaoAgendada[]): CalendarioUiFunctionalSnapshot[] {
  return apps.map((a) => ({
    id: a.id,
    pacienteId: a.pacienteId,
    pacienteUserId: a.pacienteUserId,
    pacienteNome: a.pacienteNome,
    pacienteEmail: a.pacienteEmail,
    dataAplicacaoIso: new Date(a.dataAplicacao).toISOString(),
    dosePrevista: a.dosePrevista,
    numeroAplicacao: a.numeroAplicacao,
    statusEmailAntes: a.statusEmailAntes,
    statusEmailDia: a.statusEmailDia,
    medicoResponsavelId: a.medicoResponsavelId ?? null,
  }));
}

/**
 * REFERÊNCIA CONGELADA — lógica de match do Calendário em produção (origin/main)
 * antes da otimização de leitura. Copiada de propósito; não importar de
 * `applyEmailStatusToAplicacoes` (que pode evoluir).
 */
function applyStatusReferenciaHead(
  aplicacoes: AplicacaoAgendada[],
  emailsEnviados: EnvioAplicacaoLedger[],
  now: Date,
): AplicacaoAgendada[] {
  const hoje = new Date(now);
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  return aplicacoes.map((aplicacao) => {
    const dataAplicacao = new Date(aplicacao.dataAplicacao);
    dataAplicacao.setHours(0, 0, 0, 0);

    const dataAplicacaoMenosUmDia = new Date(dataAplicacao);
    dataAplicacaoMenosUmDia.setDate(dataAplicacaoMenosUmDia.getDate() - 1);

    const emailAntes = emailsEnviados.find(
      (e) =>
        e.emailTipo === 'aplicacao_aplicacao_antes' &&
        e.leadEmail === aplicacao.pacienteEmail &&
        e.leadNome === aplicacao.pacienteNome &&
        e.enviadoEm &&
        Math.abs(new Date(e.enviadoEm).getTime() - dataAplicacaoMenosUmDia.getTime()) < MS_24H,
    );

    const emailDia = emailsEnviados.find(
      (e) =>
        e.emailTipo === 'aplicacao_aplicacao_dia' &&
        e.leadEmail === aplicacao.pacienteEmail &&
        e.leadNome === aplicacao.pacienteNome &&
        e.enviadoEm &&
        Math.abs(new Date(e.enviadoEm).getTime() - dataAplicacao.getTime()) < MS_24H,
    );

    let statusEmailAntes: 'enviado' | 'nao_enviado' | 'pendente' = 'nao_enviado';
    let statusEmailDia: 'enviado' | 'nao_enviado' | 'pendente' = 'nao_enviado';

    if (emailAntes) {
      statusEmailAntes = 'enviado';
    } else {
      if (dataAplicacao.getTime() === amanha.getTime()) {
        statusEmailAntes = 'pendente';
      } else if (
        dataAplicacaoMenosUmDia.getTime() === hoje.getTime() &&
        dataAplicacao.getTime() > hoje.getTime()
      ) {
        statusEmailAntes = 'pendente';
      } else if (dataAplicacao.getTime() > hoje.getTime()) {
        statusEmailAntes = 'nao_enviado';
      }
    }

    if (emailDia) {
      statusEmailDia = 'enviado';
    } else if (dataAplicacao.getTime() === hoje.getTime()) {
      statusEmailDia = 'pendente';
    } else if (dataAplicacao.getTime() < hoje.getTime()) {
      statusEmailDia = 'nao_enviado';
    } else {
      statusEmailDia = 'nao_enviado';
    }

    return {
      ...aplicacao,
      statusEmailAntes,
      statusEmailDia,
    };
  });
}

/** Full-scan em memória dos 2 tipos (comportamento de leitura antigo). */
export function resultadoImplementacaoReferencia(params: {
  aplicacoes: AplicacaoAgendada[];
  ledgerGlobal: EnvioAplicacaoLedger[];
  now: Date;
}): CalendarioUiFunctionalSnapshot[] {
  const emailsEnviados = params.ledgerGlobal.filter((e) => TIPOS_APLICACAO.has(e.emailTipo));
  return toUiSnapshot(
    applyStatusReferenciaHead(params.aplicacoes, emailsEnviados, params.now),
  );
}

/** Caminho atual: fetch por candidatos + regra visual do módulo de produção. */
export function resultadoImplementacaoAtual(params: {
  aplicacoes: AplicacaoAgendada[];
  ledgerGlobal: EnvioAplicacaoLedger[];
  now: Date;
}): CalendarioUiFunctionalSnapshot[] {
  const { result } = applyStatusWithOptimizedFetch({
    aplicacoes: params.aplicacoes,
    ledgerGlobal: params.ledgerGlobal,
    now: params.now,
  });
  return toUiSnapshot(result);
}

function makeApp(
  partial: Partial<AplicacaoAgendada> &
    Pick<AplicacaoAgendada, 'id' | 'pacienteEmail' | 'pacienteNome' | 'dataAplicacao'>,
): AplicacaoAgendada {
  return {
    id: partial.id,
    pacienteId: partial.pacienteId ?? partial.id.split('_')[0]!,
    pacienteUserId: partial.pacienteUserId,
    pacienteNome: partial.pacienteNome,
    pacienteEmail: partial.pacienteEmail,
    dataAplicacao: partial.dataAplicacao,
    dosePrevista: partial.dosePrevista ?? 2.5,
    numeroAplicacao: partial.numeroAplicacao ?? 1,
    statusEmailAntes: 'nao_enviado',
    statusEmailDia: 'nao_enviado',
    medicoResponsavelId: partial.medicoResponsavelId ?? null,
  };
}

/** Fixtures cobrindo todos os cenários críticos de equivalência. */
export function buildEquivalenceFixtures() {
  const now = new Date(2026, 6, 20, 15, 0, 0);
  const diaAntes = new Date(2026, 6, 20, 0, 0, 0);
  const diaApp = new Date(2026, 6, 21, 0, 0, 0);
  const amanha = new Date(2026, 6, 21, 0, 0, 0);

  const ruidoHistorico: EnvioAplicacaoLedger[] = Array.from({ length: 120 }, (_, i) => ({
    id: `noise-${i}`,
    emailTipo: i % 2 === 0 ? 'aplicacao_aplicacao_antes' : 'aplicacao_aplicacao_dia',
    leadId: `other-${i}`,
    leadEmail: `other${i}@x.com`,
    leadNome: `Other ${i}`,
    enviadoEm: new Date(2025, 0, 1 + (i % 28)),
  }));

  type Case = {
    name: string;
    aplicacoes: AplicacaoAgendada[];
    ledger: EnvioAplicacaoLedger[];
    now: Date;
  };

  const cases: Case[] = [
    {
      name: 'somente email antes',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'uid1',
          pacienteEmail: 'ana@x.com',
          pacienteNome: 'Ana',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'e-antes',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: diaAntes,
        },
      ],
    },
    {
      name: 'somente email dia',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'uid1',
          pacienteEmail: 'ana@x.com',
          pacienteNome: 'Ana',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'e-dia',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: diaApp,
        },
      ],
    },
    {
      name: 'ambos',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'uid1',
          pacienteEmail: 'ana@x.com',
          pacienteNome: 'Ana',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'e-antes',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: diaAntes,
        },
        {
          id: 'e-dia',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: diaApp,
        },
      ],
    },
    {
      name: 'nenhum',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'uid1',
          pacienteEmail: 'ana@x.com',
          pacienteNome: 'Ana',
          dataAplicacao: new Date(2026, 6, 25, 0, 0, 0),
        }),
      ],
      ledger: ruidoHistorico,
    },
    {
      name: 'múltiplos históricos do mesmo tipo',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'uid1',
          pacienteEmail: 'ana@x.com',
          pacienteNome: 'Ana',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        {
          id: 'old',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: new Date(2026, 5, 1),
        },
        {
          id: 'match',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: diaAntes,
        },
        {
          id: 'dup',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'uid1',
          leadEmail: 'ana@x.com',
          leadNome: 'Ana',
          enviadoEm: new Date(diaAntes.getTime() + 3600_000),
        },
      ],
    },
    {
      name: 'legado por leadEmail (sem leadId no ledger)',
      now,
      aplicacoes: [
        makeApp({
          id: 'p9_1',
          pacienteId: 'p9',
          pacienteUserId: 'uid9',
          pacienteEmail: 'legado@x.com',
          pacienteNome: 'Legado',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'leg',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadEmail: 'legado@x.com',
          leadNome: 'Legado',
          enviadoEm: diaAntes,
        },
      ],
    },
    {
      name: 'leadId no ledger = pacienteId',
      now,
      aplicacoes: [
        makeApp({
          id: 'doc1_1',
          pacienteId: 'doc1',
          pacienteEmail: 'bob@x.com',
          pacienteNome: 'Bob',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'e1',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'doc1',
          leadEmail: 'bob@x.com',
          leadNome: 'Bob',
          enviadoEm: diaApp,
        },
      ],
    },
    {
      name: 'pacienteUserId (Auth UID) no ledger',
      now,
      aplicacoes: [
        makeApp({
          id: 'doc2_1',
          pacienteId: 'doc2',
          pacienteUserId: 'uid-auth-2',
          pacienteEmail: 'carla@x.com',
          pacienteNome: 'Carla',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'e2',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'uid-auth-2',
          leadEmail: 'carla@x.com',
          leadNome: 'Carla',
          enviadoEm: diaApp,
        },
      ],
    },
    {
      name: 'alteração de email após envio (ambos perdem match visual)',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'uid1',
          pacienteEmail: 'novo@x.com',
          pacienteNome: 'Ana',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        {
          id: 'e1',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'uid1',
          leadEmail: 'antigo@x.com',
          leadNome: 'Ana',
          enviadoEm: diaAntes,
        },
      ],
    },
    {
      name: 'batches >30 pacientes',
      now,
      aplicacoes: Array.from({ length: 35 }, (_, i) =>
        makeApp({
          id: `p${i}_1`,
          pacienteId: `p${i}`,
          pacienteUserId: `u${i}`,
          pacienteEmail: `u${i}@x.com`,
          pacienteNome: `User ${i}`,
          dataAplicacao: diaApp,
        }),
      ),
      ledger: [
        ...ruidoHistorico,
        {
          id: 'hit',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'u7',
          leadEmail: 'u7@x.com',
          leadNome: 'User 7',
          enviadoEm: diaApp,
        },
      ],
    },
    {
      name: 'troca de mês — julho',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'u1',
          pacienteEmail: 'a@x.com',
          pacienteNome: 'A',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        {
          id: 'e-jul',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'u1',
          leadEmail: 'a@x.com',
          leadNome: 'A',
          enviadoEm: diaApp,
        },
        {
          id: 'e-jun',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'u1',
          leadEmail: 'a@x.com',
          leadNome: 'A',
          enviadoEm: new Date(2026, 5, 10, 0, 0, 0),
        },
      ],
    },
    {
      name: 'troca de mês — junho',
      now: new Date(2026, 5, 15, 12, 0, 0),
      aplicacoes: [
        makeApp({
          id: 'p1_2',
          pacienteId: 'p1',
          pacienteUserId: 'u1',
          pacienteEmail: 'a@x.com',
          pacienteNome: 'A',
          dataAplicacao: new Date(2026, 5, 10, 0, 0, 0),
        }),
      ],
      ledger: [
        {
          id: 'e-jul',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'u1',
          leadEmail: 'a@x.com',
          leadNome: 'A',
          enviadoEm: diaApp,
        },
        {
          id: 'e-jun',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'u1',
          leadEmail: 'a@x.com',
          leadNome: 'A',
          enviadoEm: new Date(2026, 5, 10, 0, 0, 0),
        },
      ],
    },
    {
      name: 'dois pacientes isolados',
      now,
      aplicacoes: [
        makeApp({
          id: 'a_1',
          pacienteId: 'a',
          pacienteUserId: 'ua',
          pacienteEmail: 'a@x.com',
          pacienteNome: 'A',
          dataAplicacao: diaApp,
        }),
        makeApp({
          id: 'b_1',
          pacienteId: 'b',
          pacienteUserId: 'ub',
          pacienteEmail: 'b@x.com',
          pacienteNome: 'B',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        {
          id: 'ea',
          emailTipo: 'aplicacao_aplicacao_dia',
          leadId: 'ua',
          leadEmail: 'a@x.com',
          leadNome: 'A',
          enviadoEm: diaApp,
        },
        {
          id: 'eb',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'ub',
          leadEmail: 'b@x.com',
          leadNome: 'B',
          enviadoEm: diaAntes,
        },
      ],
    },
    {
      name: 'envelope ±24h (envio cedo no dia anterior ao alvo antes)',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'u1',
          pacienteEmail: 'a@x.com',
          pacienteNome: 'A',
          dataAplicacao: diaApp,
        }),
      ],
      ledger: [
        ...ruidoHistorico,
        {
          id: 'early',
          emailTipo: 'aplicacao_aplicacao_antes',
          leadId: 'u1',
          leadEmail: 'a@x.com',
          leadNome: 'A',
          enviadoEm: new Date(2026, 6, 19, 12, 0, 0),
        },
      ],
    },
    {
      name: 'processamento de envios — aplicação hoje → dia pendente',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'u1',
          pacienteEmail: 'a@x.com',
          pacienteNome: 'A',
          dataAplicacao: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        }),
      ],
      ledger: ruidoHistorico,
    },
    {
      name: 'processamento de envios — aplicação amanhã → antes pendente',
      now,
      aplicacoes: [
        makeApp({
          id: 'p1_1',
          pacienteId: 'p1',
          pacienteUserId: 'u1',
          pacienteEmail: 'a@x.com',
          pacienteNome: 'A',
          dataAplicacao: amanha,
        }),
      ],
      ledger: ruidoHistorico,
    },
  ];

  return { cases, now, ruidoHistorico };
}

describe('CalendarioAplicacoesFunctionalEquivalence', () => {
  const { cases } = buildEquivalenceFixtures();

  it.each(cases)(
    'referencia ≡ atual — $name',
    ({ aplicacoes, ledger, now }) => {
      const referencia = resultadoImplementacaoReferencia({
        aplicacoes,
        ledgerGlobal: ledger,
        now,
      });
      const atual = resultadoImplementacaoAtual({
        aplicacoes,
        ledgerGlobal: ledger,
        now,
      });
      expect(atual).toEqual(referencia);
    },
  );

  it('remount — resultado determinístico e equivalente à referência', () => {
    const { cases: all } = buildEquivalenceFixtures();
    const c = all.find((x) => x.name === 'somente email antes')!;
    const r1 = resultadoImplementacaoAtual({
      aplicacoes: c.aplicacoes,
      ledgerGlobal: c.ledger,
      now: c.now,
    });
    const r2 = resultadoImplementacaoAtual({
      aplicacoes: c.aplicacoes,
      ledgerGlobal: c.ledger,
      now: c.now,
    });
    const ref = resultadoImplementacaoReferencia({
      aplicacoes: c.aplicacoes,
      ledgerGlobal: c.ledger,
      now: c.now,
    });
    expect(r1).toEqual(r2);
    expect(r1).toEqual(ref);
  });

  it('falha se a implementação atual divergir da referência (guarda de regressão)', () => {
    const { cases: all } = buildEquivalenceFixtures();
    const c = all.find((x) => x.name === 'ambos')!;
    const referencia = resultadoImplementacaoReferencia({
      aplicacoes: c.aplicacoes,
      ledgerGlobal: c.ledger,
      now: c.now,
    });
    const adulterado = referencia.map((row) => ({
      ...row,
      statusEmailAntes: 'nao_enviado' as const,
    }));
    expect(adulterado).not.toEqual(referencia);
  });
});
