/**
 * Carrega credenciais GCP para Storage e Speech.
 * Prioridade: GCP_SA_JSON_BASE64 > GOOGLE_APPLICATION_CREDENTIALS_JSON
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

/**
 * Retorna credenciais válidas. Lança se não encontrar ou inválidas.
 */
export function getGcpCredentials(): {
  projectId: string;
  credentials: { client_email: string; private_key: string };
} {
  let parsed: ParsedCreds | null = null;

  const base64 = process.env.GCP_SA_JSON_BASE64;
  if (base64 && typeof base64 === 'string') {
    try {
      const json = Buffer.from(base64, 'base64').toString('utf8');
      parsed = parseCreds(json);
    } catch (e) {
      console.error('Falha ao decodificar GCP_SA_JSON_BASE64:', e);
    }
  }

  if (!parsed) {
    const envJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (envJson && typeof envJson === 'string') {
      try {
        parsed = parseCreds(envJson);
      } catch (e) {
        console.error('Falha ao fazer parse de GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
      }
    }
  }

  if (!parsed) {
    throw new Error(
      'Credenciais GCP não configuradas. Defina GCP_SA_JSON_BASE64 ou GOOGLE_APPLICATION_CREDENTIALS_JSON.'
    );
  }

  const client_email = parsed.client_email;
  const private_key = parsed.private_key;
  const projectId = parsed.project_id;

  if (!client_email || typeof client_email !== 'string') {
    throw new Error('Credenciais inválidas: client_email ausente ou inválido');
  }
  if (!private_key || typeof private_key !== 'string') {
    throw new Error('Credenciais inválidas: private_key ausente ou inválido');
  }
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Credenciais inválidas: project_id ausente ou inválido');
  }

  return {
    projectId,
    credentials: { client_email, private_key },
  };
}

/**
 * Retorna o email da service account para log (nunca expõe private_key).
 */
export function getServiceAccountEmailSafe(): string {
  try {
    const { credentials } = getGcpCredentials();
    return credentials.client_email || 'unknown';
  } catch {
    return 'unknown';
  }
}
