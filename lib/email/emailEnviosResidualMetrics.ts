/**
 * Leituras residuais de email_envios — instrumentação e guardrail.
 *
 * É proibido utilizar email_envios como fonte global de elegibilidade
 * ou carregar o ledger completo.
 *
 * Ativar logs detalhados com:
 *   EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED=true
 *   (ou NEXT_PUBLIC_EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED=true no client)
 *
 * large_read_warning (>500 docs) é SEMPRE emitido em produção/runtime —
 * não bloqueia; apenas alerta.
 */

export const EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED =
  process.env.EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED === 'true';

export const EMAIL_ENVIOS_LARGE_READ_WARNING_THRESHOLD = 500;

export type EmailEnviosResidualMetric = {
  origin: string;
  route?: string | null;
  organizationId?: string | null;
  queryPattern?: string | null;
  queryCount: number;
  candidateCount?: number;
  docsReturned: number;
  docsReadEstimated: number;
  durationMs: number;
  batchCount?: number;
  paginationUsed?: boolean;
  timeWindow?: {
    start: string;
    end: string;
  } | null;
  note?: string;
  timestamp?: string;
};

const LOG_PREFIX = '[email_envios_residual]';
const WARN_PREFIX = '[email_envios_residual][large_read_warning]';

/** @deprecated use docsReadEstimated — mantido para callers ETAPA 2.3 */
export type LegacyResidualMetric = {
  origin: string;
  organizationId?: string | null;
  queryCount: number;
  docsRead: number;
  durationMs: number;
  returnedDocs: number;
  paginationUsed: boolean;
  timeWindow?: { start: string; end: string } | null;
  note?: string;
};

export function logEmailEnviosResidual(
  metric: EmailEnviosResidualMetric | LegacyResidualMetric,
): void {
  const normalized: EmailEnviosResidualMetric =
    'docsReadEstimated' in metric
      ? metric
      : {
          origin: metric.origin,
          organizationId: metric.organizationId,
          queryCount: metric.queryCount,
          docsReturned: metric.returnedDocs,
          docsReadEstimated: metric.docsRead,
          durationMs: metric.durationMs,
          paginationUsed: metric.paginationUsed,
          timeWindow: metric.timeWindow,
          note: metric.note,
        };

  const payload = {
    ...normalized,
    organizationId: normalized.organizationId ?? null,
    route: normalized.route ?? null,
    queryPattern: normalized.queryPattern ?? null,
    timeWindow: normalized.timeWindow ?? null,
    timestamp: normalized.timestamp ?? new Date().toISOString(),
  };

  if (payload.docsReadEstimated > EMAIL_ENVIOS_LARGE_READ_WARNING_THRESHOLD) {
    console.warn(
      `${WARN_PREFIX} ${JSON.stringify({
        ...payload,
        threshold: EMAIL_ENVIOS_LARGE_READ_WARNING_THRESHOLD,
        message:
          'Leitura de email_envios acima do limiar — proibido usar ledger como fonte global.',
      })}`,
    );
  }

  if (!EMAIL_ENVIOS_RESIDUAL_AUDIT_ENABLED) return;

  console.info(`${LOG_PREFIX} ${JSON.stringify(payload)}`);
}
