/**
 * Auditoria técnica de leituras em `email_envios`.
 * Ativa apenas com EMAIL_ENVIOS_AUDIT_ENABLED ou NEXT_PUBLIC_EMAIL_ENVIOS_AUDIT_ENABLED=true.
 * Não altera comportamento — apenas logs e métricas em memória.
 */

export const EMAIL_ENVIOS_AUDIT_ENABLED =
  process.env.NEXT_PUBLIC_EMAIL_ENVIOS_AUDIT_ENABLED === 'true' ||
  process.env.EMAIL_ENVIOS_AUDIT_ENABLED === 'true';

/** Padrões de query mapeados no Firestore Query Insights. */
export type EmailEnviosQueryPattern =
  | 'leadId_eq_emailTipo_in'
  | 'leadId_in'
  | 'leadId_eq_emailTipo_eq'
  | 'emailTipo_in'
  | 'emailTipo_eq_enviadoEm_gte'
  | 'orderBy_enviadoEm_desc_limit'
  | 'orderBy_enviadoEm_desc_fullscan'
  | 'doc_get'
  | 'other';

/** Superfície que disparou a leitura. */
export type EmailEnviosAuditSurface = 'cron' | 'api' | 'service' | 'client' | 'unknown';

/**
 * Inventário de call sites conhecidos (referência para investigação).
 * Atualize ao adicionar novos pontos de leitura.
 */
export const EMAIL_ENVIOS_AUDIT_SITES = {
  CRON_SEND_AUTOMATIC_EMAILS: {
    id: 'cron/send-automatic-emails',
    file: 'app/api/cron/send-automatic-emails/route.ts',
    pattern: 'leadId_eq_emailTipo_in' as const,
    trigger: 'Cron */15 — por lead candidato (≥1h), com cache por execução',
  },
  API_LEADS_EMAIL_STATUS: {
    id: 'api/leads-email-status',
    file: 'app/api/leads-email-status/route.ts',
    pattern: 'leadId_in' as const,
    trigger: 'GET /api/leads-email-status — LeadsEmailDashboard mount + após envio manual',
  },
  LIB_FETCH_ENVIOS_CAMPANHA_BATCH: {
    id: 'lib/fetchEnviosCampanhaPorLeadIds',
    file: 'lib/leadsEmailStatus/fetchEnviosCampanhaPorLeadIds.ts',
    pattern: 'leadId_in' as const,
    trigger: 'Batch leadId in (30) — filtro emailTipo em memória',
  },
  CRON_SEND_EMAIL_APLICACAO: {
    id: 'cron/send-email-aplicacao',
    file: 'app/api/cron/send-email-aplicacao/route.ts',
    pattern: 'leadId_eq_emailTipo_in' as const,
    trigger: 'Cron 3×/dia — N pacientes × M aplicações (N+1)',
  },
  CRON_SEND_EMAIL_CONCLUSAO: {
    id: 'cron/send-email-conclusao-lembrete',
    file: 'app/api/cron/send-email-conclusao-lembrete/route.ts',
    pattern: 'leadId_eq_emailTipo_eq' as const,
    trigger: 'Cron 1×/dia — por paciente com conclusão hoje',
  },
  SERVICE_APLICACAO_STATUS: {
    id: 'service/aplicacaoService.verificarStatusEmails',
    file: 'services/aplicacaoService.ts',
    pattern: 'leadId_in' as const,
    trigger:
      'CalendarioAplicacoes — leadId IN candidatos (+ leadEmail legado). PROIBIDO full-scan emailTipo IN',
  },
  SERVICE_EMAIL_CONFIG_GET_ENVIOS_LEAD: {
    id: 'service/emailConfigService.getEnviosPorLead',
    file: 'services/emailConfigService.ts',
    pattern: 'other' as const,
    trigger: 'getEnviosPorLead(leadId) — seletivo; full-scan removido',
  },
  SERVICE_EMAIL_CONFIG_GET_ALL: {
    id: 'service/emailConfigService.getAllEnvios',
    file: 'services/emailConfigService.ts',
    pattern: 'orderBy_enviadoEm_desc_fullscan' as const,
    trigger: 'getAllEnvios BLOQUEADO — retorna [] (anti-regressão)',
  },
  API_EMAIL_ENVIOS: {
    id: 'api/email-envios',
    file: 'app/api/email-envios/route.ts',
    pattern: 'orderBy_enviadoEm_desc_limit' as const,
    trigger: 'EmailManagement — aba Caixa de Saída',
  },
  CRON_LEADS_NUTRI_PERSONAL: {
    id: 'cron/send-automatic-emails-leads-nutri-personal',
    file: 'app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts',
    pattern: 'leadId_in' as const,
    trigger: 'Cron */15 — dedup nutri/personal email1 por candidatos (ETAPA 2.3)',
  },
  CLIENT_LEADS_EMAIL_DASHBOARD: {
    id: 'client/LeadsEmailDashboard',
    file: 'components/LeadsEmailDashboard.tsx',
    pattern: 'leadId_in' as const,
    trigger: 'useEffect mount → fetch /api/leads-email-status',
  },
  CLIENT_CALENDARIO_APLICACOES: {
    id: 'client/CalendarioAplicacoes',
    file: 'components/CalendarioAplicacoes.tsx',
    pattern: 'emailTipo_in' as const,
    trigger: 'useEffect filtro → buscarAplicacoesAgendadas',
  },
} as const;

export type EmailEnviosAuditSiteId =
  (typeof EMAIL_ENVIOS_AUDIT_SITES)[keyof typeof EMAIL_ENVIOS_AUDIT_SITES]['id'];

export type EmailEnviosAuditEvent = {
  ts: string;
  siteId: EmailEnviosAuditSiteId | string;
  surface: EmailEnviosAuditSurface;
  queryPattern: EmailEnviosQueryPattern;
  leadId?: string;
  leadIdsCount?: number;
  emailTipos?: string[];
  cacheHit?: boolean;
  docsReturned?: number;
  limit?: number;
  batchIndex?: number;
  batchCount?: number;
  page?: string;
  component?: string;
  hook?: string;
  note?: string;
};

type ScopeAccumulator = {
  scopeId: string;
  siteId: string;
  surface: EmailEnviosAuditSurface;
  startedAt: number;
  queryCount: number;
  docsRead: number;
  cacheHits: number;
  byPattern: Map<EmailEnviosQueryPattern, { queries: number; docs: number }>;
  byLead: Map<string, number>;
  duplicateLeadWarnings: number;
};

const activeScopes = new Map<string, ScopeAccumulator>();
const recentLeadQueries = new Map<string, { count: number; lastAt: number }>();

const LOG_PREFIX = '[email_envios_audit]';
const DUPLICATE_LEAD_WINDOW_MS = 60_000;
const DUPLICATE_LEAD_THRESHOLD = 2;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function safeLog(level: 'info' | 'warn', payload: Record<string, unknown>): void {
  const line = `${LOG_PREFIX} ${JSON.stringify(payload)}`;
  if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

function trackLeadQuery(scope: ScopeAccumulator | undefined, leadId: string | undefined): void {
  if (!leadId) return;

  if (scope) {
    const prev = scope.byLead.get(leadId) ?? 0;
    scope.byLead.set(leadId, prev + 1);
    if (prev + 1 >= DUPLICATE_LEAD_THRESHOLD) {
      scope.duplicateLeadWarnings++;
    }
  }

  const now = Date.now();
  const key = `${scope?.scopeId ?? 'global'}:${leadId}`;
  const entry = recentLeadQueries.get(key);
  if (entry && now - entry.lastAt < DUPLICATE_LEAD_WINDOW_MS) {
    entry.count += 1;
    entry.lastAt = now;
    if (entry.count === DUPLICATE_LEAD_THRESHOLD) {
      safeLog('warn', {
        kind: 'duplicate_lead_query',
        leadId,
        scopeId: scope?.scopeId,
        countInWindow: entry.count,
        windowMs: DUPLICATE_LEAD_WINDOW_MS,
        hint: 'Mesmo lead consultado várias vezes — verificar cache, loop ou re-render',
      });
    }
  } else {
    recentLeadQueries.set(key, { count: 1, lastAt: now });
  }
}

/**
 * Inicia escopo de agregação (ex.: uma execução de cron ou request API).
 * Retorna scopeId para passar em endEmailEnviosAuditScope.
 */
export function beginEmailEnviosAuditScope(params: {
  siteId: string;
  surface: EmailEnviosAuditSurface;
}): string {
  if (!EMAIL_ENVIOS_AUDIT_ENABLED) return '';

  const scopeId = `${params.siteId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  activeScopes.set(scopeId, {
    scopeId,
    siteId: params.siteId,
    surface: params.surface,
    startedAt: Date.now(),
    queryCount: 0,
    docsRead: 0,
    cacheHits: 0,
    byPattern: new Map(),
    byLead: new Map(),
    duplicateLeadWarnings: 0,
  });

  safeLog('info', {
    kind: 'scope_begin',
    scopeId,
    siteId: params.siteId,
    surface: params.surface,
  });

  return scopeId;
}

/**
 * Registra uma leitura em email_envios. Não executa query — apenas métrica/log.
 */
export function auditEmailEnviosQuery(
  event: Omit<EmailEnviosAuditEvent, 'ts'> & { scopeId?: string }
): void {
  if (!EMAIL_ENVIOS_AUDIT_ENABLED) return;

  const payload: EmailEnviosAuditEvent = {
    ts: new Date().toISOString(),
    ...event,
  };

  const scope = event.scopeId ? activeScopes.get(event.scopeId) : undefined;
  const isResultEvent =
    event.cacheHit === true || typeof event.docsReturned === 'number';

  if (scope && isResultEvent) {
    scope.queryCount += 1;
    if (event.cacheHit) scope.cacheHits += 1;
    if (typeof event.docsReturned === 'number') scope.docsRead += event.docsReturned;

    const pat = scope.byPattern.get(event.queryPattern) ?? { queries: 0, docs: 0 };
    pat.queries += 1;
    if (typeof event.docsReturned === 'number') pat.docs += event.docsReturned;
    scope.byPattern.set(event.queryPattern, pat);
  }

  if (isResultEvent) {
    trackLeadQuery(scope, event.leadId);
  }

  safeLog(event.cacheHit ? 'info' : 'info', {
    kind: 'query',
    ...payload,
    runtime: isClient() ? 'client' : 'server',
  });
}

/** Encerra escopo e emite resumo agregado. */
export function endEmailEnviosAuditScope(scopeId: string | undefined, extra?: Record<string, unknown>): void {
  if (!EMAIL_ENVIOS_AUDIT_ENABLED || !scopeId) return;

  const scope = activeScopes.get(scopeId);
  if (!scope) return;

  const durationMs = Date.now() - scope.startedAt;
  const leadsWithMultipleQueries = [...scope.byLead.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([leadId, count]) => ({ leadId, count }));

  const byPattern = Object.fromEntries(
    [...scope.byPattern.entries()].map(([k, v]) => [k, v])
  );

  safeLog('info', {
    kind: 'scope_end',
    scopeId,
    siteId: scope.siteId,
    surface: scope.surface,
    durationMs,
    queryCount: scope.queryCount,
    docsRead: scope.docsRead,
    cacheHits: scope.cacheHits,
    duplicateLeadWarnings: scope.duplicateLeadWarnings,
    uniqueLeadsQueried: scope.byLead.size,
    leadsWithMultipleQueries,
    byPattern,
    ...extra,
  });

  activeScopes.delete(scopeId);
}

/** Atalho para superfícies client (componente/hook disparou fetch indireto). */
export function auditEmailEnviosClientTrigger(params: {
  siteId: EmailEnviosAuditSiteId | string;
  component: string;
  hook?: string;
  page?: string;
  note?: string;
}): void {
  if (!EMAIL_ENVIOS_AUDIT_ENABLED) return;

  safeLog('info', {
    kind: 'client_trigger',
    ts: new Date().toISOString(),
    surface: 'client',
    queryPattern: 'other',
    ...params,
    runtime: 'client',
  });
}
