/**
 * Busca evidências das apostilas OftReview via Discovery Engine,
 * com fallback para tópicos mapeados no Firestore.
 * Usado por /api/chat e /api/oftpay/questoes/chat-duvidas.
 */

import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildMappedTopicSources, loadMappedTopics } from '@/lib/oftpay/chatDuvidasContext';
import { evidenceDedupeKey } from '@/lib/oftpay/chatSourceNavigation';

export const APOSTILA_EVIDENCE_MAX_SOURCES = 10;

export type ApostilaEvidenceSource = {
  id: number;
  title: string;
  snippet: string;
  page?: number;
  uri?: string;
  /** Identificador já presente no resultado do Discovery. Não é gerado aqui. */
  docId?: string;
};

function readStableDocId(
  doc: Record<string, unknown> | undefined,
  chunk: Record<string, unknown> | undefined
): string | undefined {
  const meta = chunk?.documentMetadata as Record<string, unknown> | undefined;
  if (typeof meta?.document === 'string' && meta.document.trim()) return meta.document.trim();
  if (typeof doc?.id === 'string' && doc.id.includes('/')) return doc.id.trim();
  if (typeof doc?.name === 'string' && doc.name.includes('/documents/')) return doc.name.trim();
  return undefined;
}

export type ApostilaEvidenceResult = {
  sources: ApostilaEvidenceSource[];
  evidenceText: string;
  evidenceSource: 'discovery' | 'mapped_topics' | 'none';
  discoveryResultCount: number;
};

function parsePageNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/\D/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function extractSnippetsFromSearchResponse(data: Record<string, unknown>): string[] {
  const results = data.results as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(results)) return [];

  const texts: string[] = [];
  for (const r of results) {
    const doc = r.document as Record<string, unknown> | undefined;
    if (doc?.derivedStructData && typeof doc.derivedStructData === 'object') {
      const d = doc.derivedStructData as Record<string, unknown>;
      if (Array.isArray(d.snippets)) {
        for (const s of d.snippets) {
          const snip =
            typeof s === 'object' && s !== null && 'snippet' in s
              ? (s as { snippet?: string }).snippet
              : s;
          if (typeof snip === 'string' && snip.trim()) texts.push(snip.trim());
        }
      }
      if (Array.isArray(d.extractive_segments)) {
        for (const seg of d.extractive_segments) {
          const content =
            typeof seg === 'object' && seg !== null && 'content' in seg
              ? (seg as { content?: string }).content
              : seg;
          if (typeof content === 'string' && content.trim()) texts.push(content.trim());
        }
      }
      if (Array.isArray(d.extractive_answers)) {
        for (const a of d.extractive_answers) {
          const content =
            typeof a === 'object' && a !== null && 'content' in a
              ? (a as { content?: string }).content
              : a;
          if (typeof content === 'string' && content.trim()) texts.push(content.trim());
        }
      }
    }
    const chunk = r.chunk as Record<string, unknown> | undefined;
    if (chunk && typeof chunk.content === 'string' && chunk.content.trim()) {
      texts.push(chunk.content.trim());
    }
  }
  return [...new Set(texts)];
}

export function extractSourcesFromSearchResponse(
  data: Record<string, unknown>,
  maxSources = APOSTILA_EVIDENCE_MAX_SOURCES
): ApostilaEvidenceSource[] {
  const results = data.results as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const raw: { title: string; snippet: string; page?: number; uri?: string; docId?: string }[] = [];

  for (const r of results) {
    if (raw.length >= maxSources) break;

    const doc = r.document as Record<string, unknown> | undefined;
    const chunk = r.chunk as Record<string, unknown> | undefined;
    const docMeta = chunk?.documentMetadata as Record<string, unknown> | undefined;
    const docId = readStableDocId(doc, chunk);
    const title =
      (typeof docMeta?.title === 'string' ? docMeta.title : null) ??
      ((doc?.derivedStructData &&
        typeof doc.derivedStructData === 'object' &&
        (doc.derivedStructData as Record<string, unknown>).title) as string | undefined) ??
      (typeof doc?.title === 'string' ? doc.title : null) ??
      'Apostila';
    const pageNum =
      parsePageNumber(docMeta?.pageIdentifier) ??
      parsePageNumber(
        (chunk as { pageSpan?: { pageStart?: unknown } } | undefined)?.pageSpan?.pageStart
      );
    const uri =
      typeof docMeta?.uri === 'string'
        ? docMeta.uri
        : ((doc?.derivedStructData &&
            typeof doc.derivedStructData === 'object' &&
            (doc.derivedStructData as Record<string, unknown>).link) as string | undefined) ??
          undefined;

    const push = (snippet: string, page?: number) => {
      const trimmed = snippet.trim();
      if (!trimmed) return;
      const resolvedPage = page ?? pageNum;
      const key = evidenceDedupeKey({
        title,
        snippet: trimmed,
        page: resolvedPage,
        uri,
        docId,
      });
      if (seen.has(key)) return;
      seen.add(key);
      raw.push({
        title,
        snippet: trimmed,
        ...(resolvedPage != null && { page: resolvedPage }),
        ...(uri && { uri }),
        ...(docId && { docId }),
      });
    };

    if (doc?.derivedStructData && typeof doc.derivedStructData === 'object') {
      const d = doc.derivedStructData as Record<string, unknown>;
      if (Array.isArray(d.snippets)) {
        for (const s of d.snippets) {
          const snip =
            typeof s === 'object' && s !== null && 'snippet' in s
              ? (s as { snippet?: string }).snippet
              : s;
          if (typeof snip === 'string') push(snip);
        }
      }
      if (Array.isArray(d.extractive_segments)) {
        for (const seg of d.extractive_segments) {
          const row = typeof seg === 'object' && seg !== null ? (seg as Record<string, unknown>) : null;
          const content = row && 'content' in row ? row.content : seg;
          const segPage = row ? parsePageNumber(row.pageNumber ?? row.pageIdentifier) : undefined;
          if (typeof content === 'string') push(content, segPage);
        }
      }
      if (Array.isArray(d.extractive_answers)) {
        for (const a of d.extractive_answers) {
          const row = typeof a === 'object' && a !== null ? (a as Record<string, unknown>) : null;
          const content = row && 'content' in row ? row.content : a;
          const ansPage = row ? parsePageNumber(row.pageNumber ?? row.pageIdentifier) : undefined;
          if (typeof content === 'string') push(content, ansPage);
        }
      }
    }
    if (chunk && typeof chunk.content === 'string') push(chunk.content);
  }

  return raw.slice(0, maxSources).map((s, i) => ({ ...s, id: i + 1 }));
}

function buildDiscoverySearchPayload(query: string, mode: 'DOCUMENTS' | 'CHUNKS') {
  return {
    query,
    pageSize: 10,
    languageCode: 'pt-BR',
    contentSearchSpec: {
      ...(mode === 'CHUNKS'
        ? {
            searchResultMode: 'CHUNKS',
            chunkSpec: { numPreviousChunks: 1, numNextChunks: 1 },
          }
        : {}),
      snippetSpec: { returnSnippet: true },
      extractiveContentSpec: {
        maxExtractiveSegmentCount: 8,
        maxExtractiveAnswerCount: 2,
      },
    },
  };
}

async function runDiscoverySearch(
  searchUrl: string,
  accessToken: string,
  query: string,
  mode: 'DOCUMENTS' | 'CHUNKS'
): Promise<Record<string, unknown>> {
  const searchRes = await fetch(searchUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDiscoverySearchPayload(query, mode)),
  });
  const searchData = (await searchRes.json().catch(() => ({}))) as Record<string, unknown>;
  if (!searchRes.ok) {
    const errMsg =
      (searchData as { error?: { message?: string } }).error?.message || searchRes.statusText;
    console.warn(`[apostilaEvidenceSearch] Discovery (${mode}) error:`, searchRes.status, errMsg);
    return {};
  }
  return searchData;
}

function buildEvidenceText(
  sources: ApostilaEvidenceSource[],
  snippets: string[]
): string {
  if (sources.length > 0) {
    return sources.map((s) => `[${s.id}] ${s.title}\n${s.snippet}`).join('\n\n');
  }
  if (snippets.length > 0) return snippets.join('\n\n---\n\n');
  return '';
}

/**
 * Busca trechos das apostilas no Discovery; se vazio, usa tópicos mapeados do Firestore.
 * Não falha a request se Discovery estiver ausente — retorna evidenceSource: 'none' ou mapped_topics.
 */
export async function searchApostilaEvidence(
  query: string,
  options?: { maxSources?: number; skipMappedFallback?: boolean }
): Promise<ApostilaEvidenceResult> {
  const maxSources = options?.maxSources ?? APOSTILA_EVIDENCE_MAX_SOURCES;
  const trimmed = query.trim();
  if (!trimmed) {
    return { sources: [], evidenceText: '', evidenceSource: 'none', discoveryResultCount: 0 };
  }

  let sources: ApostilaEvidenceSource[] = [];
  let snippets: string[] = [];
  let discoveryResultCount = 0;
  let evidenceSource: ApostilaEvidenceResult['evidenceSource'] = 'none';

  const creds = getGoogleVertexCredentials();
  const dataStoreId = process.env.DISCOVERY_DATA_STORE_ID;
  const engineId = process.env.DISCOVERY_ENGINE_ID;

  if (creds && (dataStoreId || engineId)) {
    try {
      const accessToken = await getVertexAccessToken(creds);
      const servingPath = engineId
        ? `engines/${engineId}/servingConfigs/default_search`
        : `dataStores/${dataStoreId}/servingConfigs/default_search`;
      const searchUrl = `https://discoveryengine.googleapis.com/v1/projects/${creds.projectId}/locations/global/collections/default_collection/${servingPath}:search`;

      let searchData = await runDiscoverySearch(searchUrl, accessToken, trimmed, 'DOCUMENTS');
      snippets = extractSnippetsFromSearchResponse(searchData);
      sources = extractSourcesFromSearchResponse(searchData, maxSources);
      discoveryResultCount = Array.isArray(searchData.results)
        ? (searchData.results as unknown[]).length
        : 0;

      if (sources.length === 0 && snippets.length === 0) {
        const chunkSearch = await runDiscoverySearch(searchUrl, accessToken, trimmed, 'CHUNKS');
        if (Object.keys(chunkSearch).length > 0) {
          searchData = chunkSearch;
          snippets = extractSnippetsFromSearchResponse(searchData);
          sources = extractSourcesFromSearchResponse(searchData, maxSources);
          discoveryResultCount = Array.isArray(searchData.results)
            ? (searchData.results as unknown[]).length
            : 0;
        }
      }

      if (sources.length > 0 || snippets.length > 0) {
        evidenceSource = 'discovery';
      }
    } catch (e) {
      console.warn('[apostilaEvidenceSearch] Discovery failed:', e);
    }
  }

  if (evidenceSource === 'none' && !options?.skipMappedFallback) {
    try {
      const db = getFirestoreAdmin();
      const mappedTopics = await loadMappedTopics(db);
      const mappedSources = buildMappedTopicSources(trimmed, mappedTopics, maxSources);
      if (mappedSources.length > 0) {
        sources = mappedSources;
        evidenceSource = 'mapped_topics';
      }
    } catch (e) {
      console.warn('[apostilaEvidenceSearch] mapped topics fallback failed:', e);
    }
  }

  return {
    sources,
    evidenceText: buildEvidenceText(sources, snippets),
    evidenceSource,
    discoveryResultCount,
  };
}

/** Bloco de texto para injetar no prompt do tutor (chat-duvidas). */
export function formatApostilaEvidenceForPrompt(result: ApostilaEvidenceResult): string {
  if (!result.evidenceText.trim()) {
    return 'EVIDÊNCIAS DAS APOSTILAS: nenhuma evidência encontrada nesta busca.';
  }
  const label =
    result.evidenceSource === 'mapped_topics'
      ? 'EVIDÊNCIAS DAS APOSTILAS (tópicos mapeados — use como base factual da resposta didática):'
      : 'EVIDÊNCIAS DAS APOSTILAS (trechos indexados — base factual principal):';
  return `${label}\n\n${result.evidenceText}`;
}
