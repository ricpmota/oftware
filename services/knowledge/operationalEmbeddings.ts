/**
 * Embeddings operacionais — cache em memória, provider plugável (Vertex, OpenAI, teste).
 */

import { JWT } from 'google-auth-library';
import type { OperationalFlowDefinition } from './operationalFlowIndex';
import { OPERATIONAL_FLOW_DEFINITIONS, flowTextForEmbedding } from './operationalFlowIndex';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export interface EmbeddingProvider {
  readonly name: string;
  embed(text: string): Promise<number[]>;
}

function l2Normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const n = Math.sqrt(sum) || 1;
  return v.map((x) => x / n);
}

/** Cosine similarity entre vetores já normalizados = produto escalar. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.min(1, Math.max(-1, dot));
}

/** Mapa id do fluxo → vetor L2-normalizado (lazy). */
const flowEmbeddingCache = new Map<string, number[]>();

let providerOverride: EmbeddingProvider | null = null;

/** Injeta provider (ex. testes). null restaura o padrão por env. */
export function setOperationalEmbeddingProviderOverride(provider: EmbeddingProvider | null): void {
  providerOverride = provider;
}

function getCredentialsFromEnv(): { projectId: string; clientEmail: string; privateKey: string } | null {
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

async function getAccessToken(creds: { clientEmail: string; privateKey: string }): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [SCOPE],
  });
  const t = await client.authorize();
  return (t as { access_token?: string }).access_token || '';
}

/**
 * Vertex AI — modelo via `VERTEX_EMBEDDING_MODEL_ID` (default textembedding-gecko@003).
 */
class VertexEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'vertex';
  async embed(text: string): Promise<number[]> {
    const creds = getCredentialsFromEnv();
    if (!creds) throw new Error('Vertex: credenciais ausentes');
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const modelId = process.env.VERTEX_EMBEDDING_MODEL_ID || 'textembedding-gecko@003';
    const token = await getAccessToken(creds);
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ content: text }] }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      predictions?: Array<{ embeddings?: { values?: number[] }; values?: number[] }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(`Vertex embedding: ${data?.error?.message || res.statusText}`);
    }

    const pred = data?.predictions?.[0];
    const vec = pred?.embeddings?.values ?? pred?.values;
    if (!vec?.length) throw new Error('Vertex embedding: resposta sem vetor');
    return l2Normalize(vec);
  }
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  async embed(text: string): Promise<number[]> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI: OPENAI_API_KEY ausente');
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: Array<{ embedding?: number[] }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(`OpenAI embedding: ${data?.error?.message || res.statusText}`);
    }
    const vec = data?.data?.[0]?.embedding;
    if (!vec?.length) throw new Error('OpenAI embedding: resposta sem vetor');
    return l2Normalize(vec);
  }
}

/** Sem chamadas externas — falha de propósito para acionar fallback heurístico. */
class DisabledEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'disabled';
  async embed(_text: string): Promise<number[]> {
    throw new Error('Embedding provider desabilitado (OPERATIONAL_EMBEDDING_PROVIDER=disabled)');
  }
}

/**
 * Resolve provider por `OPERATIONAL_EMBEDDING_PROVIDER`:
 * vertex | openai | disabled — default: vertex se credenciais Vertex existem, senão disabled.
 */
export function resolveEmbeddingProvider(): EmbeddingProvider {
  if (providerOverride) return providerOverride;
  const mode = (process.env.OPERATIONAL_EMBEDDING_PROVIDER || '').toLowerCase().trim();
  if (mode === 'disabled' || mode === 'none' || mode === 'off') return new DisabledEmbeddingProvider();
  if (mode === 'openai') return new OpenAIEmbeddingProvider();
  if (mode === 'vertex') return new VertexEmbeddingProvider();
  return getCredentialsFromEnv() ? new VertexEmbeddingProvider() : new DisabledEmbeddingProvider();
}

/** Gera embedding para texto arbitrário (usa provider atual). */
export async function generateEmbedding(text: string): Promise<number[]> {
  const p = resolveEmbeddingProvider();
  const v = await p.embed(text.trim() || ' ');
  return l2Normalize(v);
}

/** Garante embedding cacheado para o texto canônico do fluxo. */
export async function getEmbeddingForFlow(flow: OperationalFlowDefinition): Promise<number[]> {
  const hit = flowEmbeddingCache.get(flow.id);
  if (hit) return hit;
  const combined = flowTextForEmbedding(flow);
  const v = await generateEmbedding(combined);
  flowEmbeddingCache.set(flow.id, v);
  return v;
}

/** Pré-aquece cache (opcional, primeiro request também lazy). */
export async function warmupOperationalFlowEmbeddings(defs = OPERATIONAL_FLOW_DEFINITIONS): Promise<void> {
  await Promise.all(defs.map((f) => getEmbeddingForFlow(f)));
}

/** Limpa cache (útil em testes). */
export function clearOperationalEmbeddingCache(): void {
  flowEmbeddingCache.clear();
}
