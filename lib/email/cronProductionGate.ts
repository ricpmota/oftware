import type { NextRequest } from 'next/server';

const DEFAULT_ALLOWED_HOSTS = ['www.oftware.com.br', 'oftware.com.br'];

export type CronEnvironmentGate =
  | { ok: true }
  | {
      ok: false;
      status: number;
      body: {
        success: true;
        skipped: true;
        reason: string;
        message: string;
      };
    };

function getAllowedHosts(): string[] {
  const raw = process.env.CRON_ALLOWED_HOSTS;
  if (raw?.trim()) {
    return raw.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_HOSTS;
}

/** Só executa crons em produção no host principal (evita preview/deploy antigo). */
export function assertCronProductionEnvironment(request: NextRequest): CronEnvironmentGate {
  if (process.env.VERCEL_ENV !== 'production') {
    return {
      ok: false,
      status: 200,
      body: {
        success: true,
        skipped: true,
        reason: 'non_production_environment',
        message: `Cron ignorado: VERCEL_ENV=${process.env.VERCEL_ENV ?? 'undefined'}`,
      },
    };
  }

  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  const allowed = getAllowedHosts();

  if (!host || !allowed.includes(host)) {
    return {
      ok: false,
      status: 200,
      body: {
        success: true,
        skipped: true,
        reason: 'unexpected_host',
        message: `Cron ignorado: host="${host || 'unknown'}" (permitidos: ${allowed.join(', ')})`,
      },
    };
  }

  return { ok: true };
}
