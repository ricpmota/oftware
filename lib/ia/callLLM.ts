/**
 * Camada única de chamada ao LLM — evoluir providers aqui.
 */

import { JWT } from 'google-auth-library';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function getVertexCredentials(): GoogleCreds | null {
  const jsonEnv = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as { project_id?: string; client_email?: string; private_key?: string };
      const key = typeof parsed.private_key === 'string' ? parsed.private_key.replace(/\\n/g, '\n') : '';
      if (parsed.project_id && parsed.client_email && key) {
        return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: key };
      }
    } catch {
      /* ignore */
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

function getVertexAccessToken(creds: GoogleCreds): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return client.authorize().then((t) => (t as { access_token?: string }).access_token || '');
}

async function callOpenAI(systemPrompt: string, history: ChatTurn[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY não configurada.');

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const messages: { role: string; content: string }[] = [{ role: 'system', content: systemPrompt }];
  for (const t of history) {
    messages.push({ role: t.role === 'user' ? 'user' : 'assistant', content: t.content });
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || 'OpenAI error');
  }
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Resposta vazia do OpenAI.');
  return text;
}

async function callVertexGemini(systemPrompt: string, history: ChatTurn[]): Promise<string> {
  const creds = getVertexCredentials();
  if (!creds) throw new Error('Credenciais Vertex não configuradas.');

  const accessToken = await getVertexAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash-001';
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const contents = history.map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }],
  }));

  const payload = {
    systemInstruction: {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || 'Gemini error');
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  let answer = '';
  for (const p of parts) {
    if (typeof p.text === 'string') answer += p.text;
  }
  answer = answer.trim();
  if (!answer) throw new Error('Resposta vazia do Gemini.');
  return answer;
}

/**
 * Ordem: OpenAI se OPENAI_API_KEY; senão Vertex Gemini.
 */
export async function callLLM(systemPrompt: string, history: ChatTurn[]): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(systemPrompt, history);
  }
  return callVertexGemini(systemPrompt, history);
}
