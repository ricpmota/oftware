import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  getOrganizationById,
  listOrganizations,
  METODO_ORGANIZATION_ID,
} from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { getOrCreateRelatorioFinanceiroUrl } from '@/services/relatorioFinanceiroLinkService';

const COLLECTION = 'financeiro_cobranca_envios';

export type FinanceiroCobrancaEnvioTipo = 'avulsa' | 'automatica';

export type FinanceiroCobrancaEnvio = {
  id: string;
  medicoId: string;
  pacienteId: string;
  pacienteNome?: string;
  medicoNome?: string;
  organizationId?: string;
  phone?: string;
  valorAberto?: number;
  relatorioUrl?: string;
  tipo: FinanceiroCobrancaEnvioTipo;
  status: 'sent' | 'failed';
  errorMessage?: string;
  sentAt: Date;
};

export type FinanceiroCobrancaEnvioDto = {
  id: string;
  medicoId: string;
  pacienteId: string;
  pacienteNome?: string;
  medicoNome?: string;
  organizationId?: string;
  organizationName?: string;
  phone?: string;
  valorAberto?: number;
  relatorioUrl?: string;
  tipo: FinanceiroCobrancaEnvioTipo;
  status: 'sent' | 'failed';
  errorMessage?: string;
  sentAt: string;
};

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      try {
        return maybe.toDate();
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function docToEnvio(docId: string, data: Record<string, unknown>): FinanceiroCobrancaEnvio {
  return {
    id: docId,
    medicoId: String(data.medicoId ?? ''),
    pacienteId: String(data.pacienteId ?? ''),
    pacienteNome: typeof data.pacienteNome === 'string' ? data.pacienteNome : undefined,
    medicoNome: typeof data.medicoNome === 'string' ? data.medicoNome : undefined,
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : undefined,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    valorAberto: typeof data.valorAberto === 'number' ? data.valorAberto : undefined,
    relatorioUrl: typeof data.relatorioUrl === 'string' ? data.relatorioUrl : undefined,
    tipo: data.tipo === 'automatica' ? 'automatica' : 'avulsa',
    status: data.status === 'failed' ? 'failed' : 'sent',
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    sentAt: toDate(data.sentAt) ?? new Date(),
  };
}

function organizationNameById(organizationId?: string): string | undefined {
  if (!organizationId) return undefined;
  const fromRegistry = getOrganizationById(organizationId as OrganizationId)?.name;
  if (fromRegistry) return fromRegistry;
  return listOrganizations().find((o) => o.id === organizationId)?.name;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function toFinanceiroCobrancaEnvioDto(envio: FinanceiroCobrancaEnvio): FinanceiroCobrancaEnvioDto {
  const organizationId = envio.organizationId || METODO_ORGANIZATION_ID;
  return {
    id: envio.id,
    medicoId: envio.medicoId,
    pacienteId: envio.pacienteId,
    pacienteNome: envio.pacienteNome,
    medicoNome: envio.medicoNome,
    organizationId,
    organizationName: organizationNameById(organizationId) || organizationId,
    phone: envio.phone,
    valorAberto: envio.valorAberto,
    relatorioUrl: envio.relatorioUrl,
    tipo: envio.tipo,
    status: envio.status,
    errorMessage: envio.errorMessage,
    sentAt: envio.sentAt.toISOString(),
  };
}

function metaFromMedicoData(data: Record<string, unknown>): {
  medicoNome?: string;
  organizationId: string;
} {
  const whiteLabel = data.whiteLabel as Record<string, unknown> | undefined;
  const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const medicoNome = pickString(
    data.nome,
    data.nomeCompleto,
    data.nomeMedico,
    dadosIdentificacao?.nomeCompleto,
    whiteLabel?.brandName,
    data.email,
  );
  const organizationId =
    pickString(data.organizationId) ||
    (data.metodoImagensAtivo === true ? METODO_ORGANIZATION_ID : undefined) ||
    METODO_ORGANIZATION_ID;
  return { medicoNome, organizationId };
}

async function resolveMedicoMeta(medicoId: string): Promise<{
  medicoNome?: string;
  organizationId: string;
}> {
  const fallback = { organizationId: METODO_ORGANIZATION_ID };
  try {
    const db = getFirestoreAdmin();
    const byId = await db.collection('medicos').doc(medicoId).get();
    if (byId.exists) {
      return metaFromMedicoData(byId.data() as Record<string, unknown>);
    }

    // Fallback: doctorId às vezes é o userId do Auth, não o id do doc em medicos
    const byUser = await db.collection('medicos').where('userId', '==', medicoId).limit(1).get();
    if (!byUser.empty) {
      return metaFromMedicoData(byUser.docs[0].data() as Record<string, unknown>);
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function resolvePacienteNome(pacienteId: string): Promise<string | undefined> {
  try {
    const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
    if (!snap.exists) return undefined;
    const data = snap.data() as Record<string, unknown>;
    const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
    return pickString(dadosIdentificacao?.nomeCompleto, data.nome, data.nomeCompleto);
  } catch {
    return undefined;
  }
}

async function resolveRelatorioUrl(pacienteId: string): Promise<string | undefined> {
  try {
    return await getOrCreateRelatorioFinanceiroUrl(pacienteId);
  } catch {
    return undefined;
  }
}

/**
 * Completa campos faltantes (registros antigos ou lookup falho) para o Log do Canal Chat.
 * Também faz backfill silencioso no Firestore quando preencher algo.
 */
async function enrichEnvios(items: FinanceiroCobrancaEnvio[]): Promise<FinanceiroCobrancaEnvio[]> {
  const medicoCache = new Map<string, Awaited<ReturnType<typeof resolveMedicoMeta>>>();
  const pacienteNomeCache = new Map<string, string | undefined>();
  const linkCache = new Map<string, string | undefined>();
  const db = getFirestoreAdmin();

  return Promise.all(
    items.map(async (item) => {
      const next = { ...item };
      const patch: Record<string, unknown> = {};

      if (next.medicoId && (!next.medicoNome || !next.organizationId)) {
        let meta = medicoCache.get(next.medicoId);
        if (!meta) {
          meta = await resolveMedicoMeta(next.medicoId);
          medicoCache.set(next.medicoId, meta);
        }
        if (!next.medicoNome && meta.medicoNome) {
          next.medicoNome = meta.medicoNome;
          patch.medicoNome = meta.medicoNome;
        }
        if (!next.organizationId) {
          next.organizationId = meta.organizationId;
          patch.organizationId = meta.organizationId;
        }
      }

      if (!next.organizationId) {
        next.organizationId = METODO_ORGANIZATION_ID;
        patch.organizationId = METODO_ORGANIZATION_ID;
      }

      if (next.pacienteId && !next.pacienteNome) {
        if (!pacienteNomeCache.has(next.pacienteId)) {
          pacienteNomeCache.set(next.pacienteId, await resolvePacienteNome(next.pacienteId));
        }
        const nome = pacienteNomeCache.get(next.pacienteId);
        if (nome) {
          next.pacienteNome = nome;
          patch.pacienteNome = nome;
        }
      }

      if (next.pacienteId && !next.relatorioUrl) {
        if (!linkCache.has(next.pacienteId)) {
          linkCache.set(next.pacienteId, await resolveRelatorioUrl(next.pacienteId));
        }
        const url = linkCache.get(next.pacienteId);
        if (url) {
          next.relatorioUrl = url;
          patch.relatorioUrl = url;
        }
      }

      if (Object.keys(patch).length > 0 && next.id) {
        void db
          .collection(COLLECTION)
          .doc(next.id)
          .set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
          .catch(() => undefined);
      }

      return next;
    }),
  );
}

export async function registrarFinanceiroCobrancaEnvio(params: {
  medicoId: string;
  pacienteId: string;
  pacienteNome?: string;
  medicoNome?: string;
  organizationId?: string;
  phone?: string;
  valorAberto?: number;
  relatorioUrl?: string;
  tipo?: FinanceiroCobrancaEnvioTipo;
  status: 'sent' | 'failed';
  errorMessage?: string;
  docId?: string;
}): Promise<FinanceiroCobrancaEnvio> {
  const medicoId = params.medicoId?.trim();
  const pacienteId = params.pacienteId?.trim();
  if (!medicoId || !pacienteId) {
    throw new Error('medicoId e pacienteId são obrigatórios.');
  }

  const meta = await resolveMedicoMeta(medicoId);
  const ref = params.docId?.trim()
    ? getFirestoreAdmin().collection(COLLECTION).doc(params.docId.trim())
    : getFirestoreAdmin().collection(COLLECTION).doc();
  const now = Timestamp.now();
  const tipo: FinanceiroCobrancaEnvioTipo = params.tipo === 'automatica' ? 'automatica' : 'avulsa';

  const medicoNome = pickString(params.medicoNome, meta.medicoNome);
  const organizationId =
    pickString(params.organizationId, meta.organizationId) || METODO_ORGANIZATION_ID;
  const pacienteNome =
    pickString(params.pacienteNome) || (await resolvePacienteNome(pacienteId));
  const relatorioUrl =
    pickString(params.relatorioUrl) || (await resolveRelatorioUrl(pacienteId));

  await ref.set(
    {
      medicoId,
      pacienteId,
      pacienteNome: pacienteNome || null,
      medicoNome: medicoNome || null,
      organizationId,
      phone: params.phone?.trim() || null,
      valorAberto:
        typeof params.valorAberto === 'number' && Number.isFinite(params.valorAberto)
          ? params.valorAberto
          : null,
      relatorioUrl: relatorioUrl || null,
      tipo,
      status: params.status,
      errorMessage: params.errorMessage?.trim() || null,
      sentAt: now,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    id: ref.id,
    medicoId,
    pacienteId,
    pacienteNome,
    medicoNome,
    organizationId,
    phone: params.phone?.trim() || undefined,
    valorAberto:
      typeof params.valorAberto === 'number' && Number.isFinite(params.valorAberto)
        ? params.valorAberto
        : undefined,
    relatorioUrl,
    tipo,
    status: params.status,
    errorMessage: params.errorMessage?.trim() || undefined,
    sentAt: now.toDate(),
  };
}

export async function listFinanceiroCobrancaEnviosByMedico(
  medicoId: string,
  options?: { limit?: number },
): Promise<FinanceiroCobrancaEnvio[]> {
  const id = medicoId?.trim();
  if (!id) return [];

  const limit = Math.max(1, Math.min(options?.limit ?? 300, 500));
  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('medicoId', '==', id)
    .limit(limit)
    .get();

  const items = snap.docs.map((doc) => docToEnvio(doc.id, doc.data() as Record<string, unknown>));
  items.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  return enrichEnvios(items);
}

/** Lista global para o Log do Canal Chat (metaadmingeral). */
export async function listFinanceiroCobrancaEnviosGlobal(options?: {
  limit?: number;
}): Promise<FinanceiroCobrancaEnvio[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
  const snap = await getFirestoreAdmin().collection(COLLECTION).limit(Math.min(limit * 2, 800)).get();
  const items = snap.docs.map((doc) => docToEnvio(doc.id, doc.data() as Record<string, unknown>));
  items.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const sliced = items.slice(0, limit);
  return enrichEnvios(sliced);
}
