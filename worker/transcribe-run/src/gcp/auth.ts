/**
 * Carrega credenciais GCP para Storage e Speech.
 * Prioridade: GCP_SA_JSON_BASE64 > GOOGLE_APPLICATION_CREDENTIALS_JSON > ADC
 * ADC = Application Default Credentials (Cloud Run metadata server)
 */
interface ParsedCreds {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
}

function parseCreds(json: string): ParsedCreds {
  const parsed = JSON.parse(json) as ParsedCreds;
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

export function getGcpCredentials(): {
  projectId: string;
  credentials: { client_email: string; private_key: string } | null;
} {
  let parsed: ParsedCreds | null = null;

  const base64 = process.env.GCP_SA_JSON_BASE64;
  if (base64 && typeof base64 === 'string') {
    try {
      const json = Buffer.from(base64, 'base64').toString('utf8');
      parsed = parseCreds(json);
    } catch (e) {
      console.error('[auth] Falha ao decodificar GCP_SA_JSON_BASE64:', e);
    }
  }

  if (!parsed) {
    const envJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (envJson && typeof envJson === 'string') {
      try {
        parsed = parseCreds(envJson);
      } catch (e) {
        console.error('[auth] Falha ao fazer parse de GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
      }
    }
  }

  const projectId =
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    parsed?.project_id ||
    '';

  if (!parsed) {
    console.log('[auth] Usando ADC (cloud run), projectId:', projectId || '(não definido)');
    return { projectId, credentials: null };
  }

  const client_email = parsed.client_email;
  const private_key = parsed.private_key;

  if (!client_email || typeof client_email !== 'string') {
    console.warn('[auth] JSON incompleto (client_email), caindo para ADC');
    return { projectId, credentials: null };
  }
  if (!private_key || typeof private_key !== 'string') {
    console.warn('[auth] JSON incompleto (private_key), caindo para ADC');
    return { projectId, credentials: null };
  }

  return {
    projectId: projectId || (parsed.project_id as string) || '',
    credentials: { client_email, private_key },
  };
}

export function getServiceAccountEmailSafe(): string {
  const { credentials } = getGcpCredentials();
  if (credentials) return credentials.client_email;
  return 'adc (cloud run)';
}
