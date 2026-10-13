import { Timestamp, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const PACIENTES_COLLECTION = 'pacientes_completos';
const MEDICOS_COLLECTION = 'medicos';
export const CANAL_CHAT_SEM_MEDICO_ID = '__sem_medico__';

export type CanalChatVerifiedPatient = {
  id: string;
  nome: string;
  phone?: string;
  verifiedAt?: string;
};

export type CanalChatVerifiedDoctorGroup = {
  medicoId: string;
  medicoNome: string;
  patients: CanalChatVerifiedPatient[];
};

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === 'object' && value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractPatientName(data: Record<string, unknown>): string {
  const identificacao = asRecord(data.dadosIdentificacao);
  return (
    pickString(identificacao?.nomeCompleto) ||
    pickString(data.nome) ||
    pickString(data.nomeCompleto) ||
    'Paciente'
  );
}

function extractPatientPhone(data: Record<string, unknown>): string | undefined {
  const identificacao = asRecord(data.dadosIdentificacao);
  const raw =
    pickString(data.canalChatPhoneKey) ||
    pickString(identificacao?.telefone) ||
    pickString(data.telefone) ||
    pickString(data.celular);
  return raw || undefined;
}

function extractMedicoNome(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  return pickString(data.nome) || pickString(data.nomeCompleto) || '';
}

async function resolveMedicoNome(db: Firestore, medicoId: string): Promise<string> {
  const byId = await db.collection(MEDICOS_COLLECTION).doc(medicoId).get();
  if (byId.exists) {
    return extractMedicoNome(byId.data() as Record<string, unknown>) || medicoId;
  }
  const byUser = await db.collection(MEDICOS_COLLECTION).where('userId', '==', medicoId).limit(1).get();
  if (!byUser.empty) {
    return extractMedicoNome(byUser.docs[0]?.data() as Record<string, unknown>) || medicoId;
  }
  return medicoId;
}

export async function listCanalChatVerifiedPatientsByDoctor(): Promise<{
  groups: CanalChatVerifiedDoctorGroup[];
  total: number;
}> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(PACIENTES_COLLECTION).where('canalChatVerified', '==', true).get();

  const docs: QueryDocumentSnapshot[] = snap.docs;
  const byDoctor = new Map<string, CanalChatVerifiedPatient[]>();

  for (const doc of docs) {
    const data = doc.data() as Record<string, unknown>;
    const medicoId =
      pickString(data.medicoResponsavelId) ||
      pickString(data.medicoResponsavelID) ||
      pickString(data.medicoResponsavelAnteriorId) ||
      CANAL_CHAT_SEM_MEDICO_ID;
    const list = byDoctor.get(medicoId) ?? [];
    list.push({
      id: doc.id,
      nome: extractPatientName(data),
      phone: extractPatientPhone(data),
      verifiedAt: toIso(data.canalChatVerifiedAt),
    });
    byDoctor.set(medicoId, list);
  }

  const medicoIds = [...byDoctor.keys()].filter((id) => id !== CANAL_CHAT_SEM_MEDICO_ID);
  const medicoNomeById = new Map<string, string>();
  await Promise.all(
    medicoIds.map(async (id) => {
      medicoNomeById.set(id, await resolveMedicoNome(db, id));
    }),
  );

  const groups: CanalChatVerifiedDoctorGroup[] = [...byDoctor.entries()].map(([medicoId, patients]) => ({
    medicoId,
    medicoNome:
      medicoId === CANAL_CHAT_SEM_MEDICO_ID
        ? 'Sem médico vinculado'
        : medicoNomeById.get(medicoId) || medicoId,
    patients: patients.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }));

  groups.sort((a, b) => {
    if (a.medicoId === CANAL_CHAT_SEM_MEDICO_ID) return 1;
    if (b.medicoId === CANAL_CHAT_SEM_MEDICO_ID) return -1;
    return a.medicoNome.localeCompare(b.medicoNome, 'pt-BR');
  });

  return {
    groups,
    total: docs.length,
  };
}
