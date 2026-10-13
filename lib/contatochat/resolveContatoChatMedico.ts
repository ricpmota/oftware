import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { MedicoWhiteLabelStored } from '@/types/medico';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';

export type ContatoChatMedicoRecord = {
  id: string;
  nome: string;
  genero: string | null;
  fotoUrl: string | null;
  organizationId: string | null;
  logoUrl: string | null;
  slug: string;
  crmEstado: string | null;
  crmNumero: string | null;
  isVerificado: boolean;
  whiteLabel: MedicoWhiteLabelStored | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeSlugPart(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function medicoFromDoc(
  id: string,
  data: Record<string, unknown>,
): ContatoChatMedicoRecord | null {
  const nome = pickString(data.nome);
  if (!nome) return null;
  const whiteLabel = asRecord(data.whiteLabel);
  const crm = asRecord(data.crm);
  return {
    id,
    nome,
    genero: pickString(data.genero),
    fotoUrl: pickString(data.fotoPerfilUrl, data.fotoUrl, data.fotoPerfilUrl),
    organizationId: pickString(data.organizationId),
    logoUrl: pickString(
      whiteLabel.drPageLogoUrl,
      whiteLabel.publicPageLogoUrl,
      whiteLabel.drPageLogoUrl,
    ),
    slug: gerarSlugDrMedico(nome),
    crmEstado: pickString(crm.estado),
    crmNumero: pickString(crm.numero),
    isVerificado: data.isVerificado === true,
    whiteLabel: Object.keys(whiteLabel).length > 0 ? (whiteLabel as MedicoWhiteLabelStored) : null,
  };
}

async function findMedicoDocByDrSlug(
  slugParam: string,
): Promise<ContatoChatMedicoRecord | null> {
  const nomeSobrenome = slugParam.trim();
  if (!nomeSobrenome) return null;

  const db = getFirestoreAdmin();
  const snapshot = await db.collection('medicos').get();

  const matchNumero = nomeSobrenome.match(/^(.+?)(\d+)$/);
  const slugBase = matchNumero ? matchNumero[1].replace(/-$/, '') : nomeSobrenome;
  const indiceDuplicata = matchNumero ? parseInt(matchNumero[2], 10) : 1;
  const partesSlug = slugBase.split('-').filter((p) => p.length > 0);
  const firstSlug = partesSlug[0] ? normalizeSlugPart(partesSlug[0]) : '';
  const lastSlug = partesSlug.length > 1 ? normalizeSlugPart(partesSlug[partesSlug.length - 1]) : firstSlug;

  const medicos = snapshot.docs.filter((doc) => {
    const nomeCompleto = String(doc.data().nome || '').trim();
    if (!nomeCompleto) return false;
    const partes = nomeCompleto.split(/\s+/).filter((p: string) => p.length > 0);
    if (partes.length === 0) return false;
    const firstNome = normalizeSlugPart(partes[0]);
    const lastNome = partes.length > 1 ? normalizeSlugPart(partes[partes.length - 1]) : firstNome;
    return firstNome === firstSlug && lastNome === lastSlug;
  });

  if (medicos.length === 0) return null;
  const indice = Math.min(Math.max(indiceDuplicata - 1, 0), medicos.length - 1);
  const doc = medicos[indice];
  return medicoFromDoc(doc.id, doc.data() as Record<string, unknown>);
}

export async function resolveContatoChatMedico(opts: {
  medicoId?: string | null;
  slug?: string | null;
}): Promise<ContatoChatMedicoRecord | null> {
  const medicoId = opts.medicoId?.trim();
  const slug = opts.slug?.trim();
  const db = getFirestoreAdmin();

  if (medicoId) {
    const snap = await db.collection('medicos').doc(medicoId).get();
    if (snap.exists) {
      const record = medicoFromDoc(snap.id, (snap.data() || {}) as Record<string, unknown>);
      if (record) return record;
    }
    try {
      const byUser = await db.collection('medicos').where('userId', '==', medicoId).limit(1).get();
      if (!byUser.empty) {
        const doc = byUser.docs[0];
        const record = medicoFromDoc(doc.id, (doc.data() || {}) as Record<string, unknown>);
        if (record) return record;
      }
    } catch {
      /* índice pode não existir — segue para slug */
    }
  }

  if (slug) {
    return findMedicoDocByDrSlug(slug);
  }

  return null;
}
