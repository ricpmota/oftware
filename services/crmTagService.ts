import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeadMedicoService } from '@/services/leadMedicoService';
import type { LeadProfissionalRole } from '@/types/leadProfissional';
import type { CreateCrmTagInput, CrmTag, LeadCrmTagSnapshot, UpdateCrmTagInput } from '@/types/crmTag';

function tagsCollectionMedico(medicoId: string) {
  return collection(db, 'medicos', medicoId, 'crmTags');
}

function profissionalOwnerRoot(role: LeadProfissionalRole): string {
  if (role === 'nutri') return 'nutricionistas';
  if (role === 'psiquiatra') return 'psiquiatras';
  return 'personal_trainers';
}

function tagsCollectionProfissional(role: LeadProfissionalRole, profissionalId: string) {
  return collection(db, profissionalOwnerRoot(role), profissionalId, 'crmTags');
}

function mapTagDoc(id: string, ownerId: string, data: Record<string, unknown>): CrmTag {
  return {
    id,
    medicoId: String(data.medicoId || ownerId),
    label: String(data.label || '').trim(),
    color: String(data.color || '#475569'),
    backgroundColor: data.backgroundColor ? String(data.backgroundColor) : undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    archived: Boolean(data.archived),
  };
}

function toSnapshot(tag: CrmTag): LeadCrmTagSnapshot {
  return {
    tagId: tag.id,
    label: tag.label,
    color: tag.color,
    backgroundColor: tag.backgroundColor,
  };
}

export class CrmTagService {
  static async getCrmTagsByMedico(medicoId: string): Promise<CrmTag[]> {
    if (!medicoId) return [];
    const snap = await getDocs(tagsCollectionMedico(medicoId));
    return snap.docs
      .map((d) => mapTagDoc(d.id, medicoId, d.data() as Record<string, unknown>))
      .filter((t) => t.label && !t.archived)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  static async getCrmTagsByProfissional(
    role: LeadProfissionalRole,
    profissionalId: string
  ): Promise<CrmTag[]> {
    if (!profissionalId) return [];
    const snap = await getDocs(tagsCollectionProfissional(role, profissionalId));
    return snap.docs
      .map((d) => mapTagDoc(d.id, profissionalId, d.data() as Record<string, unknown>))
      .filter((t) => t.label && !t.archived)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  static async createCrmTag(medicoId: string, data: CreateCrmTagInput): Promise<CrmTag> {
    const label = data.label.trim();
    if (!medicoId || !label) throw new Error('Médico e nome da tag são obrigatórios.');

    const payload = {
      medicoId,
      label,
      color: data.color,
      backgroundColor: data.backgroundColor || null,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(tagsCollectionMedico(medicoId), payload);
    return {
      id: ref.id,
      medicoId,
      label,
      color: data.color,
      backgroundColor: data.backgroundColor,
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    };
  }

  static async createCrmTagForProfissional(
    role: LeadProfissionalRole,
    profissionalId: string,
    data: CreateCrmTagInput
  ): Promise<CrmTag> {
    const label = data.label.trim();
    if (!profissionalId || !label) throw new Error('Profissional e nome da tag são obrigatórios.');

    const payload = {
      medicoId: profissionalId,
      label,
      color: data.color,
      backgroundColor: data.backgroundColor || null,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(tagsCollectionProfissional(role, profissionalId), payload);
    return {
      id: ref.id,
      medicoId: profissionalId,
      label,
      color: data.color,
      backgroundColor: data.backgroundColor,
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    };
  }

  static async updateCrmTag(
    medicoId: string,
    tagId: string,
    data: UpdateCrmTagInput
  ): Promise<void> {
    if (!medicoId || !tagId) throw new Error('Tag inválida.');
    const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (data.label !== undefined) update.label = data.label.trim();
    if (data.color !== undefined) update.color = data.color;
    if (data.backgroundColor !== undefined) update.backgroundColor = data.backgroundColor || null;
    await updateDoc(doc(db, 'medicos', medicoId, 'crmTags', tagId), update);
  }

  static async updateCrmTagForProfissional(
    role: LeadProfissionalRole,
    profissionalId: string,
    tagId: string,
    data: UpdateCrmTagInput
  ): Promise<void> {
    if (!profissionalId || !tagId) throw new Error('Tag inválida.');
    const root = profissionalOwnerRoot(role);
    const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (data.label !== undefined) update.label = data.label.trim();
    if (data.color !== undefined) update.color = data.color;
    if (data.backgroundColor !== undefined) update.backgroundColor = data.backgroundColor || null;
    await updateDoc(doc(db, root, profissionalId, 'crmTags', tagId), update);
  }

  static async archiveCrmTag(medicoId: string, tagId: string): Promise<void> {
    if (!medicoId || !tagId) throw new Error('Tag inválida.');
    await updateDoc(doc(db, 'medicos', medicoId, 'crmTags', tagId), {
      archived: true,
      updatedAt: serverTimestamp(),
    });
  }

  static async archiveCrmTagForProfissional(
    role: LeadProfissionalRole,
    profissionalId: string,
    tagId: string
  ): Promise<void> {
    if (!profissionalId || !tagId) throw new Error('Tag inválida.');
    const root = profissionalOwnerRoot(role);
    await updateDoc(doc(db, root, profissionalId, 'crmTags', tagId), {
      archived: true,
      updatedAt: serverTimestamp(),
    });
  }

  static async applyTagToLead(
    leadId: string,
    tag: LeadCrmTagSnapshot | CrmTag,
    atualizadoPor?: string
  ): Promise<void> {
    const lead = await LeadMedicoService.getLeadById(leadId);
    if (!lead) throw new Error('Lead não encontrado.');
    const snapshot: LeadCrmTagSnapshot =
      'tagId' in tag && 'label' in tag && !('medicoId' in tag)
        ? tag
        : toSnapshot(tag as CrmTag);
    const current = lead.crmTags ?? [];
    if (current.some((t) => t.tagId === snapshot.tagId)) return;
    await LeadMedicoService.updateLeadCrmTags(leadId, [...current, snapshot], atualizadoPor);
  }

  static async removeTagFromLead(
    leadId: string,
    tagId: string,
    atualizadoPor?: string
  ): Promise<void> {
    const lead = await LeadMedicoService.getLeadById(leadId);
    if (!lead) throw new Error('Lead não encontrado.');
    const current = lead.crmTags ?? [];
    await LeadMedicoService.updateLeadCrmTags(
      leadId,
      current.filter((t) => t.tagId !== tagId),
      atualizadoPor
    );
  }
}

export function crmTagToSnapshot(tag: CrmTag): LeadCrmTagSnapshot {
  return toSnapshot(tag);
}
