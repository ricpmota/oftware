/**
 * Variáveis de ambiente para Lacuna Rest PKI (servidor).
 * SIGNATURE_LACUNA_API_URL=
 * SIGNATURE_LACUNA_CLIENT_ID=
 * SIGNATURE_LACUNA_CLIENT_SECRET=
 * SIGNATURE_LACUNA_REDIRECT_URI=
 */
export interface LacunaRestPkiEnvConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getLacunaRestPkiEnvConfig(): LacunaRestPkiEnvConfig {
  return {
    apiUrl: (process.env.SIGNATURE_LACUNA_API_URL || '').trim(),
    clientId: (process.env.SIGNATURE_LACUNA_CLIENT_ID || '').trim(),
    clientSecret: (process.env.SIGNATURE_LACUNA_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.SIGNATURE_LACUNA_REDIRECT_URI || '').trim(),
  };
}

export function isLacunaRestPkiEnvConfigured(): boolean {
  const c = getLacunaRestPkiEnvConfig();
  return !!(c.apiUrl && c.clientId && c.clientSecret && c.redirectUri);
}

export function lacunaRestPkiMissingEnvMessage(): string {
  const missing: string[] = [];
  const c = getLacunaRestPkiEnvConfig();
  if (!c.apiUrl) missing.push('SIGNATURE_LACUNA_API_URL');
  if (!c.clientId) missing.push('SIGNATURE_LACUNA_CLIENT_ID');
  if (!c.clientSecret) missing.push('SIGNATURE_LACUNA_CLIENT_SECRET');
  if (!c.redirectUri) missing.push('SIGNATURE_LACUNA_REDIRECT_URI');
  return `Lacuna Rest PKI não configurada no servidor (defina: ${missing.join(', ')}).`;
}
