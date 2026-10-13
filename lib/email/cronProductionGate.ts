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

/** Só executa crons em produção (domínio customizado ou deployment *.vercel.app). */
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
  const isVercelCronHeader = request.headers.get('x-vercel-cron') === '1';
  const isVercelProductionDeployment = host.endsWith('.vercel.app');

  // Vercel Cron usa o URL do deployment (*.vercel.app); o header x-vercel-cron nem sempre vem.
  if (isVercelCronHeader || isVercelProductionDeployment) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret && isVercelCronHeader) {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return {
          ok: false,
          status: 401,
          body: {
            success: true,
            skipped: true,
            reason: 'invalid_cron_secret',
            message: 'Cron ignorado: CRON_SECRET inválido.',
          },
        };
      }
    }
    return { ok: true };
  }

  const allowed = getAllowedHosts();

  if (!host || !allowed.includes(host)) {
    return {
      ok: false,
      status: 200,
      body: {
        success: true,
        skipped: true,
        reason: 'unexpected_host',
        message: `Cron ignorado: host="${host || 'unknown'}" (permitidos: ${allowed.join(', ')}, *.vercel.app)`,
      },
    };
  }

  return { ok: true };
}
