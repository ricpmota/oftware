import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import {
  getLeadProfissionalStageKey,
  isDefaultProfissionalStageKey,
} from '@/lib/crm/leadProfissionalStageKey';
import {
  normalizeLeadProfissionalStatus,
} from '@/lib/crm/leadProfissionalCrmUtils';
import { dedupeLeadCrmTags, normalizeLeadCrmTags } from '@/lib/crm/leadCrmTagUtils';
import type {
  LeadProfissional,
  LeadProfissionalRole,
} from '@/types/leadProfissional';
import { getDefaultLeadProfissionalStatus, getLeadProfissionalCrmStages } from '@/types/leadProfissionalCrm';
import { LeadProfissionalTimelineService } from '@/services/leadProfissionalTimelineService';
import type { LeadCrmTagSnapshot } from '@/types/crmTag';
import { optionalLeadDdiPais } from '@/lib/whatsapp/resolveLeadPhone';

const COLLECTION_BY_ROLE: Record<LeadProfissionalRole, string> = {
  nutri: 'leads_nutri',
  personal: 'leads_personal',
  psiquiatra: 'leads_psiquiatra',
};

export class LeadProfissionalService {
  static collectionName(role: LeadProfissionalRole): string {
    return COLLECTION_BY_ROLE[role];
  }

  private static mapDoc(
    id: string,
    role: LeadProfissionalRole,
    data: Record<string, unknown>
  ): LeadProfissional {
    return {
      id,
      pacienteId: String(data.pacienteId || ''),
      vinculoId: String(data.vinculoId || id),
      name: String(data.name || ''),
      email: String(data.email || ''),
      telefone: data.telefone ? String(data.telefone) : undefined,
      ...optionalLeadDdiPais(data),
      cidade: data.cidade ? String(data.cidade) : undefined,
      estado: data.estado ? String(data.estado) : undefined,
      status: normalizeLeadProfissionalStatus(role, String(data.status || '')),
      crmStageKey: typeof data.crmStageKey === 'string' ? data.crmStageKey : undefined,
      dataStatus: (data.dataStatus as { toDate?: () => Date })?.toDate?.() || new Date(),
      observacoes: data.observacoes ? String(data.observacoes) : undefined,
      atualizadoPor: data.atualizadoPor ? String(data.atualizadoPor) : undefined,
      profissionalId: String(data.profissionalId || ''),
      role,
      medicoId: String(data.medicoId || ''),
      medicoNome: String(data.medicoNome || 'Médico'),
      orcamento: typeof data.orcamento === 'number' ? data.orcamento : undefined,
      crmTags: normalizeLeadCrmTags(data.crmTags),
      dataCompartilhamento:
        (data.dataCompartilhamento as { toDate?: () => Date })?.toDate?.() ||
        (data.createdAt as { toDate?: () => Date })?.toDate?.(),
      consulta:
        data.consulta && typeof data.consulta === 'object'
          ? {
              date: String((data.consulta as { date?: string }).date || ''),
              startTime: String((data.consulta as { startTime?: string }).startTime || ''),
              endTime: String((data.consulta as { endTime?: string }).endTime || ''),
              availabilityId: (data.consulta as { availabilityId?: string }).availabilityId
                ? String((data.consulta as { availabilityId?: string }).availabilityId)
                : undefined,
            }
          : undefined,
      createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.(),
      updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.(),
    };
  }

  static async getLeadsByProfissional(
    role: LeadProfissionalRole,
    profissionalId: string
  ): Promise<LeadProfissional[]> {
    if (!profissionalId) return [];
    const q = query(
      collection(db, this.collectionName(role)),
      where('profissionalId', '==', profissionalId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => this.mapDoc(d.id, role, d.data() as Record<string, unknown>));
  }

  static async createOrUpdateLead(
    role: LeadProfissionalRole,
    lead: Omit<LeadProfissional, 'id' | 'role'> & { id?: string }
  ): Promise<string> {
    const leadId = lead.id || lead.vinculoId;
    if (!leadId) throw new Error('Lead sem id/vinculoId');

    const ref = doc(db, this.collectionName(role), leadId);
    const existing = await getDoc(ref);
    const payload: Record<string, unknown> = {
      pacienteId: lead.pacienteId,
      vinculoId: lead.vinculoId,
      name: lead.name,
      email: lead.email,
      status: lead.status || getDefaultLeadProfissionalStatus(role),
      profissionalId: lead.profissionalId,
      role,
      medicoId: lead.medicoId,
      medicoNome: lead.medicoNome || 'Médico',
      updatedAt: new Date(),
    };

    if (lead.telefone) payload.telefone = lead.telefone;
    if (lead.telefoneDdi) {
      payload.telefoneDdi = lead.telefoneDdi;
      if (lead.telefonePais) payload.telefonePais = lead.telefonePais;
    }
    if (lead.cidade) payload.cidade = lead.cidade;
    if (lead.estado) payload.estado = lead.estado;
    if (lead.observacoes) payload.observacoes = lead.observacoes;
    if (lead.atualizadoPor) payload.atualizadoPor = lead.atualizadoPor;
    if (typeof lead.orcamento === 'number') payload.orcamento = Math.max(0, lead.orcamento);
    if (lead.crmStageKey) payload.crmStageKey = lead.crmStageKey;
    if (lead.dataCompartilhamento) payload.dataCompartilhamento = lead.dataCompartilhamento;

    if (existing.exists()) {
      await setDoc(ref, payload, { merge: true });
    } else {
      const compartilhadoEm = lead.dataCompartilhamento || lead.createdAt || new Date();
      await setDoc(ref, {
        ...payload,
        ...shadowOrganizationFields(),
        dataStatus: lead.dataStatus || compartilhadoEm,
        dataCompartilhamento: compartilhadoEm,
        createdAt: lead.createdAt || compartilhadoEm,
      });
    }
    return leadId;
  }

  static async updateLeadStage(
    role: LeadProfissionalRole,
    leadId: string,
    stageKey: string,
    atualizadoPor?: string
  ): Promise<void> {
    const ref = doc(db, this.collectionName(role), leadId);
    const existing = await getDoc(ref);
    const prev = existing.exists() ? this.mapDoc(leadId, role, existing.data() as Record<string, unknown>) : null;
    const fromKey = prev ? getLeadProfissionalStageKey(prev) : null;

    const updateData: Record<string, unknown> = {
      dataStatus: new Date(),
      updatedAt: new Date(),
    };

    if (isDefaultProfissionalStageKey(role, stageKey)) {
      updateData.status = stageKey;
      updateData.crmStageKey = deleteField();
    } else {
      updateData.crmStageKey = stageKey;
    }

    if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;
    await updateDoc(ref, updateData);

    const stages = getLeadProfissionalCrmStages(role);
    const fromLabel = fromKey
      ? stages.find((s) => s.value === fromKey)?.label || fromKey
      : null;
    const toLabel = stages.find((s) => s.value === stageKey)?.label || stageKey;
    try {
      await LeadProfissionalTimelineService.appendEvent({
        leadId,
        role,
        profissionalId: prev?.profissionalId || '',
        type: 'stage_changed',
        description: fromLabel
          ? `Estágio alterado: ${fromLabel} → ${toLabel}`
          : `Estágio atualizado para ${toLabel}`,
        createdBy: atualizadoPor,
      });
    } catch (error) {
      console.error('[leadProfissional] timeline estágio', error);
    }
  }

  static async updateLeadOrcamento(
    role: LeadProfissionalRole,
    leadId: string,
    orcamento: number,
    atualizadoPor?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      orcamento: Math.max(0, Math.round(orcamento)),
      updatedAt: new Date(),
    };
    if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;
    await updateDoc(doc(db, this.collectionName(role), leadId), updateData);
  }

  static async updateLeadObservacoes(
    role: LeadProfissionalRole,
    leadId: string,
    observacoes: string,
    atualizadoPor?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      observacoes,
      updatedAt: new Date(),
    };
    if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;
    await updateDoc(doc(db, this.collectionName(role), leadId), updateData);
  }

  static async updateLeadCrmTags(
    role: LeadProfissionalRole,
    leadId: string,
    crmTags: LeadCrmTagSnapshot[],
    atualizadoPor?: string
  ): Promise<void> {
    const tags = dedupeLeadCrmTags(crmTags);
    const updateData: Record<string, unknown> = {
      crmTags: tags,
      updatedAt: new Date(),
    };
    if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;
    await updateDoc(doc(db, this.collectionName(role), leadId), updateData);
  }

  static async syncLeadIdentity(
    role: LeadProfissionalRole,
    leadId: string,
    patch: {
      name?: string;
      email?: string;
      telefone?: string;
      telefoneDdi?: string;
      telefonePais?: string;
      cidade?: string;
      estado?: string;
      medicoId?: string;
      medicoNome?: string;
      pacienteId?: string;
      dataCompartilhamento?: Date;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) updateData[key] = value;
    }
    await updateDoc(doc(db, this.collectionName(role), leadId), updateData);
  }
}
