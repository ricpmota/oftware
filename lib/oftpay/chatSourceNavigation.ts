import type { ChatConversationSource } from '@/types/chatConversation';

export type ApostilaMatchTarget = {
  id: string;
  name: string;
  subject: string;
  url: string;
  storagePath?: string;
};

export function evidenceDedupeKey(item: {
  title: string;
  snippet: string;
  page?: number;
  uri?: string;
  docId?: string;
}): string {
  if (item.page != null) {
    const documentKey = (item.docId || item.uri || item.title).trim().toLowerCase();
    return `page:${documentKey}:${item.page}`;
  }
  return `text:${item.title}\0${item.snippet}`;
}

function normalizeApostilaName(value: string): string {
  return value
    .replace(/\.(pdf|cdr)$/i, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function fileBaseName(uri: string): string {
  const clean = uri.split('?')[0] || '';
  const part = clean.split('/').pop() || '';
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

export function parseCitedSourceIds(content: string): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    for (const piece of match[1].split(',')) {
      const id = parseInt(piece.trim(), 10);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function partitionResponseSources(
  sources: ChatConversationSource[],
  content: string
): { cited: ChatConversationSource[]; others: ChatConversationSource[] } {
  const citedIds = parseCitedSourceIds(content);
  const cited = citedIds
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ChatConversationSource => Boolean(source));
  const citedSet = new Set(citedIds);
  const others = sources.filter((source) => source.id == null || !citedSet.has(source.id));
  return { cited, others };
}

function exactNameMatches(value: string, apostilas: ApostilaMatchTarget[]): ApostilaMatchTarget[] {
  const name = normalizeApostilaName(value);
  if (!name) return [];
  return apostilas.filter((apostila) => {
    if (normalizeApostilaName(apostila.name) === name) return true;
    const stored = apostila.storagePath?.split('/').pop();
    return stored ? normalizeApostilaName(stored) === name : false;
  });
}

/**
 * Resolve a apostila só com metadados da fonte.
 * Correspondência ambígua devolve null — não escolhe um PDF parecido.
 */
export function resolveApostilaForSource(
  source: ChatConversationSource,
  apostilas: ApostilaMatchTarget[]
): ApostilaMatchTarget | null {
  if (source.uri) {
    const fromUri = exactNameMatches(fileBaseName(source.uri), apostilas);
    if (fromUri.length === 1) return fromUri[0];
    const pathHits = apostilas.filter(
      (apostila) => Boolean(apostila.storagePath) && source.uri!.includes(apostila.storagePath!)
    );
    if (pathHits.length === 1) return pathHits[0];
  }

  const exact = exactNameMatches(source.title, apostilas);
  if (exact.length === 1) return exact[0];

  const title = normalizeApostilaName(source.title);
  if (title.length < 6) return null;
  const loose = apostilas.filter((apostila) => {
    const name = normalizeApostilaName(apostila.name);
    return name === title || name.includes(title) || title.includes(name);
  });
  return loose.length === 1 ? loose[0] : null;
}
