import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  extractMetodoImagensFromWhiteLabel,
  METODO_IMAGENS_SOURCE_EMAIL,
  type MetodoImagensTemplate,
} from '@/lib/metodo/metodoImagens';
import type { MedicoWhiteLabelStored } from '@/types/medico';

const COLLECTION = 'platformSettings';
const DOC_ID = 'metodoImagens';

let cachedTemplate: MetodoImagensTemplate | null | undefined;
let cacheExpiresAt = 0;
const CACHE_MS = 60_000;

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

function docToTemplate(data: FirebaseFirestore.DocumentData | undefined): MetodoImagensTemplate | null {
  if (!data) return null;
  const template: MetodoImagensTemplate = {
    ogImageUrl: typeof data.ogImageUrl === 'string' ? data.ogImageUrl.trim() || null : null,
    faviconUrl: typeof data.faviconUrl === 'string' ? data.faviconUrl.trim() || null : null,
    pdfLogoUrl: typeof data.pdfLogoUrl === 'string' ? data.pdfLogoUrl.trim() || null : null,
    drPageLogoUrl: typeof data.drPageLogoUrl === 'string' ? data.drPageLogoUrl.trim() || null : null,
    aplicacaoPageLogoUrl:
      typeof data.aplicacaoPageLogoUrl === 'string' ? data.aplicacaoPageLogoUrl.trim() || null : null,
    conclusaoPageLogoUrl:
      typeof data.conclusaoPageLogoUrl === 'string' ? data.conclusaoPageLogoUrl.trim() || null : null,
    syncedAt: data.syncedAt?.toDate?.()?.toISOString?.() ?? data.syncedAt ?? null,
    sourceMedicoId: typeof data.sourceMedicoId === 'string' ? data.sourceMedicoId : null,
    sourceEmail: typeof data.sourceEmail === 'string' ? data.sourceEmail : null,
  };
  const hasAny =
    !!template.ogImageUrl ||
    !!template.faviconUrl ||
    !!template.pdfLogoUrl ||
    !!template.drPageLogoUrl ||
    !!template.aplicacaoPageLogoUrl ||
    !!template.conclusaoPageLogoUrl;
  return hasAny ? template : null;
}

export async function getMetodoImagensTemplateFromFirestore(): Promise<MetodoImagensTemplate | null> {
  const now = Date.now();
  if (cachedTemplate !== undefined && cacheExpiresAt > now) {
    return cachedTemplate;
  }
  const db = getFirestoreAdmin();
  const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
  const template = docToTemplate(snap.data());
  cachedTemplate = template;
  cacheExpiresAt = now + CACHE_MS;
  return template;
}

export function invalidateMetodoImagensTemplateCache(): void {
  cachedTemplate = undefined;
  cacheExpiresAt = 0;
}

async function findMedicoByEmail(email: string): Promise<{
  id: string;
  whiteLabel?: MedicoWhiteLabelStored | null;
} | null> {
  const db = getFirestoreAdmin();
  const normalized = normalizeEmail(email);
  const exact = await db.collection('medicos').where('email', '==', normalized).limit(1).get();
  if (!exact.empty) {
    const doc = exact.docs[0];
    const data = doc.data();
    return { id: doc.id, whiteLabel: data.whiteLabel as MedicoWhiteLabelStored | undefined };
  }
  const all = await db.collection('medicos').get();
  const match = all.docs.find((d) => normalizeEmail((d.data() as { email?: string }).email) === normalized);
  if (!match) return null;
  const data = match.data();
  return { id: match.id, whiteLabel: data.whiteLabel as MedicoWhiteLabelStored | undefined };
}

/** Copia as 6 imagens da conta fonte (ricpmota) para `platformSettings/metodoImagens`. */
export async function syncMetodoImagensTemplateFromSourceMedico(): Promise<MetodoImagensTemplate> {
  const source = await findMedicoByEmail(METODO_IMAGENS_SOURCE_EMAIL);
  if (!source) {
    throw new Error(`Médico fonte não encontrado: ${METODO_IMAGENS_SOURCE_EMAIL}`);
  }
  const extracted = extractMetodoImagensFromWhiteLabel(source.whiteLabel);
  const missing = (
    [
      ['ogImageUrl', 'Imagem de compartilhamento'],
      ['faviconUrl', 'Favicon'],
      ['pdfLogoUrl', 'Logo PDF'],
      ['drPageLogoUrl', 'Logo Meu Link'],
      ['aplicacaoPageLogoUrl', 'Logo Aplicações'],
      ['conclusaoPageLogoUrl', 'Logo Conclusão'],
    ] as const
  ).filter(([key]) => !extracted[key]);
  if (missing.length > 0) {
    throw new Error(
      `Conta fonte sem imagens: ${missing.map(([, label]) => label).join(', ')}. Configure em Identidade → Navegador / Páginas públicas.`
    );
  }

  const payload = {
    ...extracted,
    sourceMedicoId: source.id,
    sourceEmail: METODO_IMAGENS_SOURCE_EMAIL,
    syncedAt: new Date(),
  };

  const db = getFirestoreAdmin();
  await db.collection(COLLECTION).doc(DOC_ID).set(payload, { merge: true });
  invalidateMetodoImagensTemplateCache();

  return {
    ...extracted,
    syncedAt: payload.syncedAt.toISOString(),
    sourceMedicoId: source.id,
    sourceEmail: METODO_IMAGENS_SOURCE_EMAIL,
  };
}

export async function getOrSyncMetodoImagensTemplate(): Promise<MetodoImagensTemplate | null> {
  const existing = await getMetodoImagensTemplateFromFirestore();
  if (existing) return existing;
  try {
    return await syncMetodoImagensTemplateFromSourceMedico();
  } catch {
    return null;
  }
}
