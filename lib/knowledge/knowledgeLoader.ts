import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  KNOWLEDGE_MANIFEST,
  type KnowledgeManifestEntry,
  type KnowledgeSurface,
} from './knowledgeManifest';

export type LoadedSource = { path: string; hash: string; priority: number };

export type KnowledgeSegment = LoadedSource & { content: string };

export type KnowledgeLoadResult = {
  /** Texto contínuo (só corpos), para prompts que não precisam de marcadores. */
  text: string;
  sources: LoadedSource[];
  /** Fragmentos por arquivo, na ordem aplicada ao prompt; use com `buildKnowledgeBlock`. */
  segments: KnowledgeSegment[];
};

export type LoadKnowledgeOptions = {
  surface: KnowledgeSurface;
  maxTotalChars?: number;
  /**
   * Troca o manifest (ex.: testes ou backend futuro tipo Firestore).
   * Produção: omitir e usar `KNOWLEDGE_MANIFEST`.
   */
  manifest?: KnowledgeManifestEntry[];
  /** Raiz do repo; padrão `process.cwd()`. */
  rootDir?: string;
};

function sha1Hex(utf8: string): string {
  return createHash('sha1').update(utf8, 'utf8').digest('hex');
}

function lenChars(s: string): number {
  return [...s].length;
}

function truncateChars(s: string, max: number): string {
  if (max <= 0) return '';
  if (lenChars(s) <= max) return s;
  return [...s].slice(0, max).join('');
}

function matchesSurface(entry: KnowledgeManifestEntry, surface: KnowledgeSurface): boolean {
  return entry.surface === 'all' || entry.surface === surface;
}

/**
 * Lê apenas arquivos listados no manifest, filtra por `surface`, ordena por `priority`,
 * aplica `maxChars` por entrada e corta pelo `maxTotalChars` global.
 */
export async function loadKnowledge(opts: LoadKnowledgeOptions): Promise<KnowledgeLoadResult> {
  const maxTotalChars = opts.maxTotalChars ?? 120_000;
  const rootDir = opts.rootDir ?? process.cwd();
  const manifest = opts.manifest ?? KNOWLEDGE_MANIFEST;

  const entries = manifest
    .filter((e) => matchesSurface(e, opts.surface))
    .sort((a, b) => a.priority - b.priority);

  const segments: KnowledgeSegment[] = [];
  let used = 0;

  for (const entry of entries) {
    if (used >= maxTotalChars) break;

    let text: string;
    try {
      const raw = await readFile(join(rootDir, entry.path), 'utf8');
      text = raw.trim();
    } catch {
      continue;
    }

    if (entry.maxChars != null) {
      text = truncateChars(text, entry.maxChars);
    }

    const room = maxTotalChars - used;
    if (room <= 0) break;

    if (lenChars(text) > room) {
      text = truncateChars(text, room);
    }

    if (!text) continue;

    const hash = sha1Hex(text);
    segments.push({
      path: entry.path,
      content: text,
      hash,
      priority: entry.priority,
    });

    used += lenChars(text);
  }

  const sources: LoadedSource[] = segments.map(({ path: p, hash, priority }) => ({
    path: p,
    hash,
    priority,
  }));

  const flatText = segments.map((s) => s.content).join('\n\n');

  return { text: flatText, sources, segments };
}
