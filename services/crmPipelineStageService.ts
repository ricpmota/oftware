import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLeadStageKey } from '@/lib/crm/leadStageKey';
import { defaultStageColor } from '@/lib/crm/resolveCrmPipelineStages';
import { LeadMedicoService } from '@/services/leadMedicoService';
import { LEAD_MEDICO_CRM_STAGES } from '@/types/leadMedicoCrm';
import type { LeadMedico } from '@/types/leadMedico';
import type {
  CreateCustomCrmPipelineStageInput,
  CrmPipelineStage,
  UpsertCrmPipelineStageInput,
} from '@/types/crmPipelineStage';

function stagesCollection(medicoId: string) {
  return collection(db, 'medicos', medicoId, 'crmPipelineStages');
}

function stageDocRef(medicoId: string, stageId: string) {
  return doc(db, 'medicos', medicoId, 'crmPipelineStages', stageId);
}

function mapStageDoc(id: string, medicoId: string, data: Record<string, unknown>): CrmPipelineStage {
  const stageKey = String(data.stageKey || id);
  const isDefault =
    data.isDefault !== undefined
      ? Boolean(data.isDefault)
      : LEAD_MEDICO_CRM_STAGES.some((s) => s.value === stageKey);
  return {
    id,
    medicoId: String(data.medicoId || medicoId),
    stageKey,
    label: String(data.label || ''),
    color: String(data.color || '#475569'),
    backgroundColor: data.backgroundColor ? String(data.backgroundColor) : undefined,
    order: typeof data.order === 'number' ? data.order : 0,
    isDefault,
    archived: Boolean(data.archived),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
  };
}

export class CrmPipelineStageService {
  static async getCrmPipelineStages(medicoId: string): Promise<CrmPipelineStage[]> {
    if (!medicoId) return [];
    const snap = await getDocs(stagesCollection(medicoId));
    return snap.docs.map((d) => mapStageDoc(d.id, medicoId, d.data() as Record<string, unknown>));
  }

  /** Etapas ativas (não arquivadas) */
  static async getStagesByMedico(medicoId: string): Promise<CrmPipelineStage[]> {
    const all = await this.getCrmPipelineStages(medicoId);
    return all.filter((s) => !s.archived);
  }

  static getDefaultStageOrder(stageKey: string): number {
    const idx = LEAD_MEDICO_CRM_STAGES.findIndex((s) => s.value === stageKey);
    return idx >= 0 ? idx : LEAD_MEDICO_CRM_STAGES.length;
  }

  static async ensureDefaultCrmPipelineStages(_medicoId: string): Promise<void> {
    // Etapas padrão vêm do código; persistência só quando personalizadas.
  }

  static async updateCrmPipelineStage(
    medicoId: string,
    stageId: string,
    data: Partial<UpsertCrmPipelineStageInput>
  ): Promise<CrmPipelineStage> {
    if (!medicoId || !stageId) throw new Error('Etapa inválida.');
    const ref = stageDocRef(medicoId, stageId);
    const payload: Record<string, unknown> = {
      medicoId,
      updatedAt: serverTimestamp(),
    };
    if (data.label !== undefined) payload.label = data.label.trim();
    if (data.color !== undefined) payload.color = data.color;
    if (data.backgroundColor !== undefined) payload.backgroundColor = data.backgroundColor || null;
    if (data.order !== undefined) payload.order = data.order;
    if (data.stageKey !== undefined) payload.stageKey = data.stageKey;
    if (data.isDefault !== undefined) payload.isDefault = data.isDefault;
    payload.archived = false;
    await setDoc(ref, payload, { merge: true });
    const stageKey = data.stageKey || stageId;
    return {
      id: stageId,
      medicoId,
      stageKey,
      label: String(data.label || '').trim(),
      color: data.color || '#475569',
      backgroundColor: data.backgroundColor,
      order: data.order ?? 0,
      isDefault: data.isDefault ?? LEAD_MEDICO_CRM_STAGES.some((s) => s.value === stageKey),
      archived: false,
      updatedAt: new Date(),
    };
  }

  static async upsertStage(
    medicoId: string,
    input: UpsertCrmPipelineStageInput
  ): Promise<CrmPipelineStage> {
    const isDefault = input.isDefault ?? LEAD_MEDICO_CRM_STAGES.some((s) => s.value === input.stageKey);
    const docId = isDefault ? input.stageKey : input.stageKey;
    const ref = stageDocRef(medicoId, docId);
    await setDoc(
      ref,
      {
        medicoId,
        stageKey: input.stageKey,
        label: input.label.trim(),
        color: input.color,
        backgroundColor: input.backgroundColor || null,
        order: input.order,
        isDefault,
        archived: false,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return {
      id: docId,
      medicoId,
      stageKey: input.stageKey,
      label: input.label.trim(),
      color: input.color,
      backgroundColor: input.backgroundColor,
      order: input.order,
      isDefault,
      archived: false,
      updatedAt: new Date(),
    };
  }

  static async createCustomCrmPipelineStage(
    medicoId: string,
    data: CreateCustomCrmPipelineStageInput
  ): Promise<CrmPipelineStage> {
    if (!medicoId) throw new Error('Médico inválido.');
    const ref = await addDoc(stagesCollection(medicoId), {
      medicoId,
      label: data.label.trim(),
      color: data.color,
      backgroundColor: data.backgroundColor || null,
      order: data.order,
      isDefault: false,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stageKey: 'pending',
    });
    const stageKey = `custom_${ref.id}`;
    await setDoc(ref, { stageKey }, { merge: true });
    return {
      id: ref.id,
      medicoId,
      stageKey,
      label: data.label.trim(),
      color: data.color,
      backgroundColor: data.backgroundColor,
      order: data.order,
      isDefault: false,
      archived: false,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }

  static async archiveCrmPipelineStageAndReallocateLeads(params: {
    medicoId: string;
    stageKeyToArchive: string;
    stageIdToArchive: string;
    targetStageKey: string;
    leads: LeadMedico[];
    atualizadoPor?: string;
  }): Promise<void> {
    const { medicoId, stageKeyToArchive, stageIdToArchive, targetStageKey, leads, atualizadoPor } = params;
    if (!medicoId) throw new Error('Médico inválido.');

    const affected = leads.filter((l) => getLeadStageKey(l) === stageKeyToArchive);
    for (const lead of affected) {
      await LeadMedicoService.updateLeadStage(lead.id || lead.uid, targetStageKey, atualizadoPor);
    }

    const ref = stageDocRef(medicoId, stageIdToArchive);
    const defaults = defaultStageColor(stageKeyToArchive);
    await setDoc(
      ref,
      {
        medicoId,
        stageKey: stageKeyToArchive,
        label:
          LEAD_MEDICO_CRM_STAGES.find((s) => s.value === stageKeyToArchive)?.label || stageKeyToArchive,
        color: defaults.color,
        backgroundColor: defaults.backgroundColor,
        isDefault: LEAD_MEDICO_CRM_STAGES.some((s) => s.value === stageKeyToArchive),
        archived: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  static async restoreDefaultCrmPipelineStages(medicoId: string): Promise<void> {
    if (!medicoId) throw new Error('Médico inválido.');
    const snap = await getDocs(stagesCollection(medicoId));
    const batch = writeBatch(db);
    let hasWrites = false;
    snap.docs.forEach((d) => {
      const data = d.data();
      const stageKey = String(data.stageKey || d.id);
      const isDefault =
        data.isDefault !== undefined
          ? Boolean(data.isDefault)
          : LEAD_MEDICO_CRM_STAGES.some((s) => s.value === stageKey);
      if (isDefault) {
        batch.delete(d.ref);
        hasWrites = true;
      }
    });
    if (hasWrites) await batch.commit();
  }

  static async reorderCrmPipelineStages(
    medicoId: string,
    orderedStages: Array<{ id: string; stageKey: string; isDefault: boolean }>
  ): Promise<void> {
    if (!medicoId) throw new Error('Médico inválido.');
    const batch = writeBatch(db);
    orderedStages.forEach((stage, index) => {
      const ref = stageDocRef(medicoId, stage.id);
      batch.set(
        ref,
        {
          medicoId,
          stageKey: stage.stageKey,
          isDefault: stage.isDefault,
          order: index,
          archived: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  /** @deprecated use restoreDefaultCrmPipelineStages */
  static async restoreStageDefault(medicoId: string, stageKey: string): Promise<void> {
    const ref = stageDocRef(medicoId, stageKey);
    await setDoc(
      ref,
      { stageKey, archived: true, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
}
