/**
 * Compartilhamento médico ↔ médico de prontuário (via Comunicação).
 * O paciente NÃO muda de dono e NÃO entra na lista do destinatário —
 * só concede acesso de edição via grant.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const COL_PACIENTE_MEDICO_COMPARTILHADO = 'paciente_medico_compartilhado';

export type PacienteMedicoCompartilhadoDoc = {
  id: string;
  pacienteId: string;
  ownerMedicoId: string;
  sharedMedicoId: string;
  permissions: 'edit';
  status: 'ativo' | 'revogado';
  sourceMensagemId?: string | null;
  organizationId?: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
};

function docId(pacienteId: string, sharedMedicoId: string) {
  return `${pacienteId}_${sharedMedicoId}`;
}

function mapDoc(id: string, data: Record<string, any>): PacienteMedicoCompartilhadoDoc {
  return {
    id,
    pacienteId: String(data.pacienteId || ''),
    ownerMedicoId: String(data.ownerMedicoId || ''),
    sharedMedicoId: String(data.sharedMedicoId || ''),
    permissions: 'edit',
    status: data.status === 'revogado' ? 'revogado' : 'ativo',
    sourceMensagemId:
      typeof data.sourceMensagemId === 'string' ? data.sourceMensagemId : null,
    organizationId:
      typeof data.organizationId === 'string' ? data.organizationId : null,
    criadoEm: data.criadoEm?.toDate?.() || data.criadoEm || new Date(),
    atualizadoEm: data.atualizadoEm?.toDate?.() || data.atualizadoEm || new Date(),
  };
}

export class PacienteMedicoCompartilhadoService {
  /** Concede (ou reativa) acesso de edição ao médico destinatário. */
  static async upsertGrant(params: {
    pacienteId: string;
    ownerMedicoId: string;
    sharedMedicoId: string;
    sourceMensagemId?: string | null;
    organizationId?: string | null;
  }): Promise<string> {
    const pacienteId = String(params.pacienteId || '').trim();
    const ownerMedicoId = String(params.ownerMedicoId || '').trim();
    const sharedMedicoId = String(params.sharedMedicoId || '').trim();
    if (!pacienteId || !ownerMedicoId || !sharedMedicoId) {
      throw new Error('Dados incompletos para compartilhar paciente');
    }
    if (ownerMedicoId === sharedMedicoId) {
      return docId(pacienteId, sharedMedicoId);
    }

    const id = docId(pacienteId, sharedMedicoId);
    const ref = doc(db, COL_PACIENTE_MEDICO_COMPARTILHADO, id);
    const existing = await getDoc(ref);
    const now = new Date();
    const payload: Record<string, unknown> = {
      pacienteId,
      ownerMedicoId,
      sharedMedicoId,
      permissions: 'edit',
      status: 'ativo',
      sourceMensagemId: params.sourceMensagemId || null,
      organizationId: params.organizationId || null,
      atualizadoEm: now,
    };
    if (!existing.exists()) {
      payload.criadoEm = now;
    }
    await setDoc(ref, payload, { merge: true });
    return id;
  }

  static async hasActiveEditAccess(
    pacienteId: string,
    sharedMedicoId: string
  ): Promise<boolean> {
    const id = docId(
      String(pacienteId || '').trim(),
      String(sharedMedicoId || '').trim()
    );
    if (!pacienteId || !sharedMedicoId) return false;
    const snap = await getDoc(doc(db, COL_PACIENTE_MEDICO_COMPARTILHADO, id));
    if (!snap.exists()) return false;
    const data = snap.data();
    return data?.status === 'ativo' && data?.permissions === 'edit';
  }

  static async listActiveBySharedMedico(
    sharedMedicoId: string
  ): Promise<PacienteMedicoCompartilhadoDoc[]> {
    const q = query(
      collection(db, COL_PACIENTE_MEDICO_COMPARTILHADO),
      where('sharedMedicoId', '==', sharedMedicoId),
      where('status', '==', 'ativo')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDoc(d.id, d.data()));
  }
}
