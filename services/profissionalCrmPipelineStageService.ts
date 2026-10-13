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
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { COL_PSIQUIATRAS } from '@/features/metaPsi/metaPsi.constants';
import { getLeadProfissionalStageKey } from '@/lib/crm/leadProfissionalStageKey';
import { profissionalStageColor } from '@/lib/crm/resolveProfissionalPipelineStages';
import { LeadProfissionalService } from '@/services/leadProfissionalService';
import { getLeadProfissionalCrmStages } from '@/types/leadProfissionalCrm';
import type { LeadProfissional, LeadProfissionalRole } from '@/types/leadProfissional';
import type {
  CreateCustomCrmPipelineStageInput,
  CrmPipelineStage,
  UpsertCrmPipelineStageInput,
} from '@/types/crmPipelineStage';

const OWNER_COL: Record<LeadProfissionalRole, string> = {
  nutri: COL_NUTRICIONISTAS,
  personal: COL_PERSONAL_TRAINERS,
  psiquiatra: COL_PSIQUIATRAS,
};

function stagesCollection(role: LeadProfissionalRole, profissionalId: string) {
  return collection(db, OWNER_COL[role], profissionalId, 'crmPipelineStages');
}

function stageDocRef(role: LeadProfissionalRole, profissionalId: string, stageId: string) {
  return doc(db, OWNER_COL[role], profissionalId, 'crmPipelineStages', stageId);
}

function mapStageDoc(
  id: string,
  profissionalId: string,
  role: LeadProfissionalRole,
  data: Record<string, unknown>
): CrmPipelineStage {
  const stageKey = String(data.stageKey || id);
  const defaults = getLeadProfissionalCrmStages(role);
  const isDefault =
    data.isDefault !== undefined
      ? Boolean(data.isDefault)
      : defaults.some((s) => s.value === stageKey);
  return {
    id,
    profissionalId: String(data.profissionalId || profissionalId),
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

export class ProfissionalCrmPipelineStageService {
  static async getCrmPipelineStages(
    role: LeadProfissionalRole,
    profissionalId: string
  ): Promise<CrmPipelineStage[]> {
    if (!profissionalId) return [];
    const snap = await getDocs(stagesCollection(role, profissionalId));
    return snap.docs.map((d) =>
      mapStageDoc(d.id, profissionalId, role, d.data() as Record<string, unknown>)
    );
  }

  static async upsertStage(
    role: LeadProfissionalRole,
    profissionalId: string,
    input: UpsertCrmPipelineStageInput
  ): Promise<CrmPipelineStage> {
    const defaults = getLeadProfissionalCrmStages(role);
    const isDefault = input.isDefault ?? defaults.some((s) => s.value === input.stageKey);
    const docId = input.stageKey;
    const ref = stageDocRef(role, profissionalId, docId);
    await setDoc(
      ref,
      {
        profissionalId,
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
      profissionalId,
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
    role: LeadProfissionalRole,
    profissionalId: string,
    data: CreateCustomCrmPipelineStageInput
  ): Promise<CrmPipelineStage> {
    if (!profissionalId) throw new Error('Profissional inválido.');
    const ref = await addDoc(stagesCollection(role, profissionalId), {
      profissionalId,
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
      profissionalId,
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
    role: LeadProfissionalRole;
    profissionalId: string;
    stageKeyToArchive: string;
    stageIdToArchive: string;
    targetStageKey: string;
    leads: LeadProfissional[];
    atualizadoPor?: string;
  }): Promise<void> {
    const {
      role,
      profissionalId,
      stageKeyToArchive,
      stageIdToArchive,
      targetStageKey,
      leads,
      atualizadoPor,
    } = params;
    if (!profissionalId) throw new Error('Profissional inválido.');

    const affected = leads.filter((l) => getLeadProfissionalStageKey(l) === stageKeyToArchive);
    for (const lead of affected) {
      if (!lead.id) continue;
      await LeadProfissionalService.updateLeadStage(role, lead.id, targetStageKey, atualizadoPor);
    }

    const defaults = getLeadProfissionalCrmStages(role);
    const colors = profissionalStageColor(stageKeyToArchive);
    const ref = stageDocRef(role, profissionalId, stageIdToArchive);
    await setDoc(
      ref,
      {
        profissionalId,
        stageKey: stageKeyToArchive,
        label: defaults.find((s) => s.value === stageKeyToArchive)?.label || stageKeyToArchive,
        color: colors.color,
        backgroundColor: colors.backgroundColor,
        isDefault: defaults.some((s) => s.value === stageKeyToArchive),
        archived: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  static async restoreDefaultCrmPipelineStages(
    role: LeadProfissionalRole,
    profissionalId: string
  ): Promise<void> {
    if (!profissionalId) throw new Error('Profissional inválido.');
    const snap = await getDocs(stagesCollection(role, profissionalId));
    const defaults = getLeadProfissionalCrmStages(role);
    const batch = writeBatch(db);
    let hasWrites = false;
    snap.docs.forEach((d) => {
      const data = d.data();
      const stageKey = String(data.stageKey || d.id);
      const isDefault =
        data.isDefault !== undefined
          ? Boolean(data.isDefault)
          : defaults.some((s) => s.value === stageKey);
      if (isDefault) {
        batch.delete(d.ref);
        hasWrites = true;
      }
    });
    if (hasWrites) await batch.commit();
  }

  static async reorderCrmPipelineStages(
    role: LeadProfissionalRole,
    profissionalId: string,
    orderedStages: Array<{ id: string; stageKey: string; isDefault: boolean }>
  ): Promise<void> {
    if (!profissionalId) throw new Error('Profissional inválido.');
    const batch = writeBatch(db);
    orderedStages.forEach((stage, index) => {
      const ref = stageDocRef(role, profissionalId, stage.id);
      batch.set(
        ref,
        {
          profissionalId,
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
}
