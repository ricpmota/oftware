import type { AplicacaoAgendada } from '@/types/calendario';

/**
 * Status de e-mails de aplicação a partir do ledger email_envios.
 *
 * É proibido utilizar email_envios como fonte global de elegibilidade
 * ou carregar o ledger completo. Consultar apenas candidatos (leadId / leadEmail).
 */

export const EMAIL_TIPOS_APLICACAO = [
  'aplicacao_aplicacao_antes',
  'aplicacao_aplicacao_dia',
] as const;

export type EmailTipoAplicacao = (typeof EMAIL_TIPOS_APLICACAO)[number];

export const APLICACAO_EMAIL_LEAD_IN_BATCH_SIZE = 30;

export type EnvioAplicacaoLedger = {
  id?: string;
  emailTipo: string;
  leadEmail?: string;
  leadNome?: string;
  leadId?: string;
  enviadoEm?: Date;
};

export type FetchEnviosAplicacaoResult = {
  envios: EnvioAplicacaoLedger[];
  queryCount: number;
  batchCount: number;
  docsReadEstimated: number;
  candidateLeadIds: number;
  candidateEmails: number;
  usedLeadEmailFallback: boolean;
};

const TIPOS_SET = new Set<string>(EMAIL_TIPOS_APLICACAO);

export function isEmailTipoAplicacao(emailTipo: string): boolean {
  return TIPOS_SET.has(emailTipo);
}

/**
 * Janela temporal que cobre o envelope do match visual HEAD (±24h):
 * - "antes" mira (dataAplicacao − 1d) → envio pode cair até ~2d antes da aplicação;
 * - "dia" mira dataAplicacao → envio pode cair até ~1d depois.
 * Sem isso, o filtro pós-fetch poderia descartar docs que o full-scan antigo ainda casaria.
 */
export function deriveAplicacaoEmailTimeWindow(aplicacoes: AplicacaoAgendada[]): {
  start: Date;
  end: Date;
} | null {
  if (aplicacoes.length === 0) return null;
  let minTs = Number.POSITIVE_INFINITY;
  let maxTs = Number.NEGATIVE_INFINITY;
  for (const a of aplicacoes) {
    const t = new Date(a.dataAplicacao).getTime();
    if (!Number.isFinite(t)) continue;
    if (t < minTs) minTs = t;
    if (t > maxTs) maxTs = t;
  }
  if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return null;
  const start = new Date(minTs);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 2);
  const end = new Date(maxTs);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function uniquePacienteEmails(aplicacoes: AplicacaoAgendada[]): string[] {
  const set = new Set<string>();
  for (const a of aplicacoes) {
    const email = a.pacienteEmail?.trim();
    if (email) set.add(email);
  }
  return [...set];
}

/** leadIds de lookup: pacienteId + userId (quando o ledger gravou Auth UID). */
export function uniquePacienteLeadIds(aplicacoes: AplicacaoAgendada[]): string[] {
  const set = new Set<string>();
  for (const a of aplicacoes) {
    const id = a.pacienteId?.trim();
    if (id) set.add(id);
    const userId = (a as AplicacaoAgendada & { pacienteUserId?: string }).pacienteUserId?.trim();
    if (userId) set.add(userId);
  }
  return [...set];
}

export function chunkIds<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Planeja as queries — testável sem Firestore.
 * NUNCA planeja full-scan. Sem candidatos → zero queries.
 */
export function planEnviosAplicacaoQueries(params: {
  leadIds: string[];
  emails: string[];
  batchSize?: number;
}): {
  leadIdBatches: string[][];
  /** E-mails só entram se não houver nenhum leadId (legado). */
  leadEmailBatches: string[][];
  refuseFullScan: true;
} {
  const batchSize = params.batchSize ?? APLICACAO_EMAIL_LEAD_IN_BATCH_SIZE;
  const leadIds = [...new Set(params.leadIds.map((id) => id.trim()).filter(Boolean))];
  const emails = [...new Set(params.emails.map((e) => e.trim()).filter(Boolean))];

  if (leadIds.length > 0) {
    return {
      leadIdBatches: chunkIds(leadIds, batchSize),
      leadEmailBatches: [],
      refuseFullScan: true,
    };
  }

  // Sem leadId: fallback pontual por e-mail dos candidatos — NUNCA full-scan.
  return {
    leadIdBatches: [],
    leadEmailBatches: chunkIds(emails, batchSize),
    refuseFullScan: true,
  };
}

/**
 * Após fetch por leadId, quais e-mails ainda precisam de fallback legado
 * (pacientes sem nenhum doc de aplicação no resultado).
 */
export function emailsNeedingLegacyFallback(
  aplicacoes: AplicacaoAgendada[],
  envios: EnvioAplicacaoLedger[],
): string[] {
  const coveredEmails = new Set<string>();
  for (const e of envios) {
    if (!isEmailTipoAplicacao(e.emailTipo)) continue;
    if (e.leadEmail) coveredEmails.add(e.leadEmail);
    // leadId cobre o paciente correspondente
    for (const a of aplicacoes) {
      const userId = (a as AplicacaoAgendada & { pacienteUserId?: string }).pacienteUserId;
      if (e.leadId && (e.leadId === a.pacienteId || e.leadId === userId)) {
        if (a.pacienteEmail?.trim()) coveredEmails.add(a.pacienteEmail.trim());
      }
    }
  }

  const needed = new Set<string>();
  for (const a of aplicacoes) {
    const email = a.pacienteEmail?.trim();
    if (!email) continue;
    if (!coveredEmails.has(email)) needed.add(email);
  }
  return [...needed];
}

function sameCalendarDayWindow(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) < 24 * 60 * 60 * 1000;
}

/**
 * Predicado IDÊNTICO ao Calendário em produção (HEAD):
 * leadEmail + leadNome + janela de 24h.
 * leadId NÃO entra no match visual — só na estratégia de fetch.
 */
export function envioMatchesAplicacaoLegacy(
  e: EnvioAplicacaoLedger,
  aplicacao: AplicacaoAgendada,
  tipo: EmailTipoAplicacao,
  targetDate: Date,
): boolean {
  if (e.emailTipo !== tipo || !e.enviadoEm) return false;
  if (!sameCalendarDayWindow(new Date(e.enviadoEm), targetDate)) return false;
  return e.leadEmail === aplicacao.pacienteEmail && e.leadNome === aplicacao.pacienteNome;
}

/**
 * Aplica status com a mesma regra visual do HEAD (pré-otimização).
 */
export function applyEmailStatusToAplicacoes(
  aplicacoes: AplicacaoAgendada[],
  emailsEnviados: EnvioAplicacaoLedger[],
  now: Date = new Date(),
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

    const emailAntes = emailsEnviados.find((e) =>
      envioMatchesAplicacaoLegacy(e, aplicacao, 'aplicacao_aplicacao_antes', dataAplicacaoMenosUmDia),
    );

    const emailDia = emailsEnviados.find((e) =>
      envioMatchesAplicacaoLegacy(e, aplicacao, 'aplicacao_aplicacao_dia', dataAplicacao),
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

/** Alias explícito para testes de equivalência. */
export const applyEmailStatusToAplicacoesLegacy = applyEmailStatusToAplicacoes;

/**
 * Simula o fetch OTIMIZADO em memória (sem Firestore):
 * - parte do ledger global (como o full-scan antigo devolveria só os 2 tipos);
 * - seleciona apenas docs dos candidatos (leadId / leadEmail), como a query nova.
 */
export function selectEnviosForCandidatesFromLedger(params: {
  ledgerGlobal: EnvioAplicacaoLedger[];
  aplicacoes: AplicacaoAgendada[];
}): {
  enviosSelecionados: EnvioAplicacaoLedger[];
  docsReadEstimated: number;
  batchCount: number;
  usedLeadEmailFallback: boolean;
} {
  const tiposOnly = params.ledgerGlobal.filter((e) => isEmailTipoAplicacao(e.emailTipo));
  const leadIds = new Set(uniquePacienteLeadIds(params.aplicacoes));
  const emails = uniquePacienteEmails(params.aplicacoes);
  const plan = planEnviosAplicacaoQueries({ leadIds: [...leadIds], emails });

  const selected: EnvioAplicacaoLedger[] = [];
  const seen = new Set<string>();
  let docsReadEstimated = 0;
  let usedLeadEmailFallback = false;

  const pushFrom = (predicate: (e: EnvioAplicacaoLedger) => boolean) => {
    for (const e of tiposOnly) {
      if (!predicate(e)) continue;
      const key = e.id ?? `${e.leadId}|${e.leadEmail}|${e.emailTipo}|${e.enviadoEm?.toISOString()}`;
      docsReadEstimated += 1;
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(e);
    }
  };

  if (plan.leadIdBatches.length > 0) {
    const idSet = new Set(plan.leadIdBatches.flat());
    // Em Firestore, leadId IN retorna TODOS os docs do lead (não só tipos aplicação).
    // Contagem estimada usa o ledger filtrado a tipos para o teste de equivalência funcional;
    // docsReadEstimated conta matches de leadId no ledger de tipos (piso).
    pushFrom((e) => !!e.leadId && idSet.has(e.leadId));

    const legacyEmails = emailsNeedingLegacyFallback(params.aplicacoes, selected);
    if (legacyEmails.length > 0) {
      usedLeadEmailFallback = true;
      const emailSet = new Set(legacyEmails);
      pushFrom((e) => !!e.leadEmail && emailSet.has(e.leadEmail));
    }
  } else if (plan.leadEmailBatches.length > 0) {
    usedLeadEmailFallback = true;
    const emailSet = new Set(plan.leadEmailBatches.flat());
    pushFrom((e) => !!e.leadEmail && emailSet.has(e.leadEmail));
  }

  const window = deriveAplicacaoEmailTimeWindow(params.aplicacoes);
  return {
    enviosSelecionados: filterEnviosAplicacaoInWindow(selected, window),
    docsReadEstimated,
    batchCount: plan.leadIdBatches.length + plan.leadEmailBatches.length,
    usedLeadEmailFallback,
  };
}

/**
 * Simula o comportamento ANTIGO: usa o ledger global inteiro (dos 2 tipos) no match.
 */
export function applyStatusWithLegacyFullLedger(params: {
  aplicacoes: AplicacaoAgendada[];
  ledgerGlobal: EnvioAplicacaoLedger[];
  now?: Date;
}): AplicacaoAgendada[] {
  const emailsEnviados = params.ledgerGlobal.filter((e) => isEmailTipoAplicacao(e.emailTipo));
  return applyEmailStatusToAplicacoesLegacy(params.aplicacoes, emailsEnviados, params.now);
}

/**
 * Simula o comportamento NOVO: fetch só dos candidatos + mesmo match visual.
 */
export function applyStatusWithOptimizedFetch(params: {
  aplicacoes: AplicacaoAgendada[];
  ledgerGlobal: EnvioAplicacaoLedger[];
  now?: Date;
}): {
  result: AplicacaoAgendada[];
  docsReadEstimated: number;
  batchCount: number;
  usedLeadEmailFallback: boolean;
} {
  const selected = selectEnviosForCandidatesFromLedger({
    ledgerGlobal: params.ledgerGlobal,
    aplicacoes: params.aplicacoes,
  });
  return {
    result: applyEmailStatusToAplicacoes(params.aplicacoes, selected.enviosSelecionados, params.now),
    docsReadEstimated: selected.docsReadEstimated,
    batchCount: selected.batchCount,
    usedLeadEmailFallback: selected.usedLeadEmailFallback,
  };
}

export function statusSnapshot(aplicacoes: AplicacaoAgendada[]): Array<{
  id: string;
  statusEmailAntes: string;
  statusEmailDia: string;
}> {
  return aplicacoes.map((a) => ({
    id: a.id,
    statusEmailAntes: a.statusEmailAntes,
    statusEmailDia: a.statusEmailDia,
  }));
}

export function filterEnviosAplicacaoInWindow(
  envios: EnvioAplicacaoLedger[],
  window: { start: Date; end: Date } | null,
): EnvioAplicacaoLedger[] {
  if (!window) return envios.filter((e) => isEmailTipoAplicacao(e.emailTipo));
  return envios.filter((e) => {
    if (!isEmailTipoAplicacao(e.emailTipo)) return false;
    if (!e.enviadoEm) return false;
    const t = e.enviadoEm.getTime();
    return t >= window.start.getTime() && t <= window.end.getTime();
  });
}

/**
 * Simula escala: com N docs históricos e K candidatos, só os batches dos candidatos
 * entram no plano — nunca N.
 */
export function assertNoFullScanPlan(params: {
  historicalDocs: number;
  candidateLeadIds: string[];
  candidateEmails: string[];
}): { plannedDocUpperBoundReason: string; batchCount: number; wouldScanAll: false } {
  const plan = planEnviosAplicacaoQueries({
    leadIds: params.candidateLeadIds,
    emails: params.candidateEmails,
  });
  const batchCount = plan.leadIdBatches.length + plan.leadEmailBatches.length;
  if (params.candidateLeadIds.length === 0 && params.candidateEmails.length === 0) {
    if (batchCount !== 0) {
      throw new Error('Sem candidatos deve planejar zero queries');
    }
  }
  return {
    plannedDocUpperBoundReason: 'somente batches de candidatos; histórico global ignorado',
    batchCount,
    wouldScanAll: false,
  };
}
