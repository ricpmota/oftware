/**
 * Carrega catálogo leve de questões publicadas (Admin SDK + select de campos).
 * Cache em memória com TTL para evitar reler ~30k docs a cada request.
 */

import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { OftpayQuestaoCatalogItem } from '@/types/oftpayQuestaoCatalog';
import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';

const COLLECTION = 'oftpayQuestoes';
const CATALOG_TTL_MS = Math.max(
  30_000,
  Number.parseInt(process.env.OFTPAY_QUESTOES_CATALOG_TTL_MS ?? '', 10) || 120_000
);

type CatalogCache = {
  items: OftpayQuestaoCatalogItem[];
  loadedAt: number;
};

let catalogCache: CatalogCache | null = null;
let catalogInflight: Promise<OftpayQuestaoCatalogItem[]> | null = null;

function timestampToMillis(value: unknown): number | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function parseDificuldade(raw: unknown): QuestaoDificuldade {
  if (raw === 'facil' || raw === 'medio' || raw === 'dificil') return raw;
  return 'medio';
}

function catalogFromData(id: string, data: Record<string, unknown>): OftpayQuestaoCatalogItem {
  const fonte = (data.fonte ?? {}) as Record<string, unknown>;
  return {
    id,
    tema: String(data.tema ?? ''),
    ...(data.subtema != null && String(data.subtema).trim()
      ? { subtema: String(data.subtema).trim() }
      : {}),
    ...(data.capituloTitulo != null && String(data.capituloTitulo).trim()
      ? { capituloTitulo: String(data.capituloTitulo).trim() }
      : {}),
    dificuldade: parseDificuldade(data.dificuldade),
    fonte: { apostilaTitulo: String(fonte.apostilaTitulo ?? '') },
    createdAt: timestampToMillis(data.createdAt),
  };
}

function fullFromData(id: string, data: Record<string, unknown>): OftpayQuestaoDoc {
  const fonte = (data.fonte ?? {}) as Record<string, unknown>;
  const alternativasRaw = Array.isArray(data.alternativas) ? data.alternativas : [];
  return {
    id,
    courseId: 'oftreview',
    tema: String(data.tema ?? ''),
    ...(data.subtema != null ? { subtema: String(data.subtema) } : {}),
    ...(data.capituloTitulo != null && String(data.capituloTitulo).trim()
      ? { capituloTitulo: String(data.capituloTitulo).trim() }
      : {}),
    enunciado: String(data.enunciado ?? ''),
    alternativas: alternativasRaw.map((alt) => {
      const row = (alt ?? {}) as Record<string, unknown>;
      return {
        letra: (row.letra as OftpayQuestaoDoc['alternativas'][number]['letra']) ?? 'A',
        texto: String(row.texto ?? ''),
        correta: Boolean(row.correta),
      };
    }),
    explicacao: String(data.explicacao ?? ''),
    dificuldade: parseDificuldade(data.dificuldade),
    status: 'publicado',
    fonte: {
      apostilaTitulo: String(fonte.apostilaTitulo ?? ''),
      ...(fonte.pagina != null ? { pagina: Number(fonte.pagina) } : {}),
      ...(fonte.trechoBase != null ? { trechoBase: String(fonte.trechoBase) } : {}),
      ...(fonte.uri != null ? { uri: String(fonte.uri) } : {}),
      sourceType: 'pdf_bucket',
      ...(fonte.bucketPath != null ? { bucketPath: String(fonte.bucketPath) } : {}),
    },
    criadoPor: String(data.criadoPor ?? ''),
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

async function fetchCatalogFromFirestore(): Promise<OftpayQuestaoCatalogItem[]> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'publicado')
    .select('tema', 'subtema', 'capituloTitulo', 'dificuldade', 'fonte', 'createdAt')
    .get();

  const items = snap.docs.map((d) => catalogFromData(d.id, d.data() as Record<string, unknown>));
  items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return items;
}

/** Invalida o cache (ex.: após publicar questões no admin). */
export function invalidatePublishedQuestoesCatalogCache(): void {
  catalogCache = null;
}

/**
 * Catálogo publicado com cache TTL. Use no chat-duvidas e na API de catálogo.
 */
export async function loadPublishedQuestoesCatalogAdmin(options?: {
  forceRefresh?: boolean;
}): Promise<OftpayQuestaoCatalogItem[]> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    catalogCache &&
    now - catalogCache.loadedAt < CATALOG_TTL_MS
  ) {
    return catalogCache.items;
  }

  if (!options?.forceRefresh && catalogInflight) {
    return catalogInflight;
  }

  catalogInflight = fetchCatalogFromFirestore()
    .then((items) => {
      catalogCache = { items, loadedAt: Date.now() };
      return items;
    })
    .finally(() => {
      catalogInflight = null;
    });

  return catalogInflight;
}

const GET_BY_IDS_CHUNK = 100;

/** Carrega questões completas por ID (para rodar o simulado). */
export async function loadQuestoesByIdsAdmin(ids: string[]): Promise<OftpayQuestaoDoc[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const db = getFirestoreAdmin();
  const byId = new Map<string, OftpayQuestaoDoc>();

  for (let i = 0; i < unique.length; i += GET_BY_IDS_CHUNK) {
    const chunk = unique.slice(i, i + GET_BY_IDS_CHUNK);
    const refs = chunk.map((id) => db.collection(COLLECTION).doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      byId.set(snap.id, fullFromData(snap.id, snap.data() as Record<string, unknown>));
    }
  }

  // Preserva ordem pedida
  return unique.map((id) => byId.get(id)).filter(Boolean) as OftpayQuestaoDoc[];
}
