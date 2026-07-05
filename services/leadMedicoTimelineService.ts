import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LeadMedicoStatus } from '@/types/leadMedico';
import type { LeadMedicoTimelineEvent, LeadMedicoTimelineEventType } from '@/types/leadMedicoTimeline';
import { LEAD_MEDICO_CRM_STAGES } from '@/types/leadMedicoCrm';

const COLLECTION_NAME = 'leadMedicoTimeline';

function stageLabel(status: LeadMedicoStatus): string {
  return LEAD_MEDICO_CRM_STAGES.find((s) => s.value === status)?.label || status;
}

export class LeadMedicoTimelineService {
  static async appendEvent(input: {
    leadId: string;
    medicoId: string;
    type: LeadMedicoTimelineEventType;
    description: string;
    createdBy?: string;
  }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      leadId: input.leadId,
      medicoId: input.medicoId,
      type: input.type,
      description: input.description,
      createdBy: input.createdBy || null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  static async listByLead(leadId: string): Promise<LeadMedicoTimelineEvent[]> {
    const q = query(collection(db, COLLECTION_NAME), where('leadId', '==', leadId));
    const snapshot = await getDocs(q);

    const events = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        leadId: data.leadId,
        medicoId: data.medicoId,
        type: data.type as LeadMedicoTimelineEventType,
        description: data.description || '',
        createdBy: data.createdBy || undefined,
        createdAt: data.createdAt?.toDate?.() ?? null,
      } satisfies LeadMedicoTimelineEvent;
    });

    events.sort((a, b) => {
      const ta = a.createdAt?.getTime() || 0;
      const tb = b.createdAt?.getTime() || 0;
      return tb - ta;
    });

    return events;
  }

  static async recordLeadCreated(
    leadId: string,
    medicoId: string,
    name: string,
    createdBy?: string
  ): Promise<void> {
    await this.appendEvent({
      leadId,
      medicoId,
      type: 'lead_created',
      description: `Lead captado — ${name}`,
      createdBy,
    });
  }

  static async recordStageChange(
    leadId: string,
    medicoId: string,
    fromStatus: LeadMedicoStatus | null,
    toStatus: LeadMedicoStatus,
    createdBy?: string
  ): Promise<void> {
    const fromLabel = fromStatus ? stageLabel(fromStatus) : null;
    const toLabel = stageLabel(toStatus);
    const description = fromLabel
      ? `Estágio alterado: ${fromLabel} → ${toLabel}`
      : `Estágio atualizado para ${toLabel}`;

    await this.appendEvent({
      leadId,
      medicoId,
      type: 'stage_changed',
      description,
      createdBy,
    });
  }

  static async recordNote(
    leadId: string,
    medicoId: string,
    note: string,
    createdBy?: string
  ): Promise<void> {
    await this.appendEvent({
      leadId,
      medicoId,
      type: 'note',
      description: note.trim(),
      createdBy,
    });
  }

  static async recordEstrelasChange(
    leadId: string,
    medicoId: string,
    estrelas: number,
    createdBy?: string
  ): Promise<void> {
    const description =
      estrelas > 0
        ? `Classificação atualizada para ${estrelas} estrela${estrelas > 1 ? 's' : ''}`
        : 'Classificação removida';

    await this.appendEvent({
      leadId,
      medicoId,
      type: 'estrelas_changed',
      description,
      createdBy,
    });
  }
}
