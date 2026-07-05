import { hasBryEasySignCredentials } from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import {
  logEasySignError,
  logEasySignFlow,
  type EasySignFlowContext,
} from '@/lib/signature/bryEasySign/contratoEasySignFlowLog.server';

export type BryEasySignEnvConfig = {
  baseUrl: string;
  accessToken: string;
};

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveSignatureBryIsHom(): boolean {
  const forced = (process.env.SIGNATURE_BRY_ENV || '').trim().toLowerCase();
  if (forced === 'hom' || forced === 'homologation' || forced === 'homologacao') return true;
  if (forced === 'prod' || forced === 'production' || forced === 'producao') return false;
  const apiUrl = (process.env.SIGNATURE_BRY_API_URL || '').toLowerCase();
  return /hom\.|cloud-hom|integra\.hom/i.test(apiUrl);
}

/**
 * Token EasySign usa o mesmo token-service/jwt da assinatura médica (PSC/HUB).
 * Use BRY_EASYSIGN_* ou fallback SIGNATURE_BRY_CLIENT_ID + CLIENT_SECRET.
 */
export function getBryEasySignBaseUrl(): string {
  const explicit = process.env.BRY_EASYSIGN_BASE_URL?.trim();
  if (explicit) return trimSlash(explicit);
  return resolveSignatureBryIsHom()
    ? 'https://easysign.hom.bry.com.br'
    : 'https://easysign.bry.com.br';
}

function defaultEasySignTokenUrl(): string {
  return resolveSignatureBryIsHom()
    ? 'https://cloud-hom.bry.com.br/token-service/jwt'
    : 'https://cloud.bry.com.br/token-service/jwt';
}

function resolveEasySignTokenUrl(): string {
  const override =
    process.env.BRY_EASYSIGN_ACCESS_TOKEN_URL?.trim() ||
    process.env.SIGNATURE_BRY_TOKEN_SERVICE_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  return defaultEasySignTokenUrl();
}

function resolveEasySignClientCredentials(): { clientId: string; clientSecret: string } | null {
  const easyClientId = process.env.BRY_EASYSIGN_CLIENT_ID?.trim();
  const easyClientSecret = process.env.BRY_EASYSIGN_CLIENT_SECRET?.trim();
  if (easyClientId && easyClientSecret) {
    return { clientId: easyClientId, clientSecret: easyClientSecret };
  }

  const sigClientId = process.env.SIGNATURE_BRY_CLIENT_ID?.trim();
  const sigClientSecret = process.env.SIGNATURE_BRY_CLIENT_SECRET?.trim();
  if (sigClientId && sigClientSecret) {
    return { clientId: sigClientId, clientSecret: sigClientSecret };
  }

  return null;
}

export async function getBryEasySignAccessToken(flow?: EasySignFlowContext): Promise<string> {
  const staticToken = process.env.BRY_EASYSIGN_ACCESS_TOKEN?.trim();
  if (staticToken) {
    logEasySignFlow(flow, 'token_ok', { tokenSource: 'static_env' });
    return staticToken;
  }

  const creds = resolveEasySignClientCredentials();
  const tokenUrl = resolveEasySignTokenUrl();

  if (!creds) {
    const err = new Error(
      'Configure BRY_EASYSIGN_ACCESS_TOKEN ou BRY_EASYSIGN_CLIENT_ID + BRY_EASYSIGN_CLIENT_SECRET ' +
        '(ou SIGNATURE_BRY_CLIENT_ID + SIGNATURE_BRY_CLIENT_SECRET) para o EasySign.'
    );
    logEasySignError(flow, err, 'credentials_missing');
    throw err;
  }

  logEasySignFlow(flow, 'requesting_token', {
    tokenHost: new URL(tokenUrl).host,
    tokenPath: new URL(tokenUrl).pathname,
    usesClientCredentials: true,
  });

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
    if (!res.ok || !data.access_token) {
      throw new Error(
        data.error || `Não foi possível obter token EasySign (${res.status}). Verifique credenciais BRy EasySign.`
      );
    }
    logEasySignFlow(flow, 'token_ok', { tokenSource: 'client_credentials', httpStatus: res.status });
    return data.access_token;
  } catch (error) {
    logEasySignError(flow, error, 'token_failed');
    throw error;
  }
}

export async function getBryEasySignConfig(flow?: EasySignFlowContext): Promise<BryEasySignEnvConfig> {
  if (!hasBryEasySignCredentials() && !process.env.BRY_EASYSIGN_ACCESS_TOKEN?.trim()) {
    const err = new Error('Credenciais EasySign não configuradas no servidor.');
    logEasySignError(flow, err, 'credentials_missing');
    throw err;
  }
  const baseUrl = getBryEasySignBaseUrl();
  const accessToken = await getBryEasySignAccessToken(flow);
  return { baseUrl, accessToken };
}
