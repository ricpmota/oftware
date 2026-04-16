/**
 * Credenciais e token OAuth para Vertex AI (mesmo padrão de services/chatNutriGeminiService.ts).
 * Uso apenas em código server-side (API routes, server actions).
 */

import { JWT } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export interface GoogleVertexCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getGoogleVertexCredentials(): GoogleVertexCredentials | null {
  const jsonEnv = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as { project_id?: string; client_email?: string; private_key?: string };
      const key = typeof parsed.private_key === 'string' ? parsed.private_key.replace(/\\n/g, '\n') : '';
      if (parsed.project_id && parsed.client_email && key) {
        return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: key };
      }
    } catch (e) {
      console.error('[googleVertexAuth] GOOGLE_VERTEX_CREDENTIALS_JSON parse error:', e);
    }
  }
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (projectId && clientEmail && rawKey) {
    return { projectId, clientEmail, privateKey: rawKey.replace(/\\n/g, '\n') };
  }
  return null;
}

export function getVertexAccessToken(creds: GoogleVertexCredentials): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [SCOPE],
  });
  return client.authorize().then((t) => (t as { access_token?: string }).access_token || '');
}
