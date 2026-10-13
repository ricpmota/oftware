import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  LeadProfissionalTimelineEvent,
  LeadProfissionalTimelineEventType,
} from '@/types/leadProfissionalTimeline';

const COLLECTION_NAME = 'leadProfissionalTimeline';

export class LeadProfissionalTimelineService {
  static async appendEvent(input: {
    leadId: string;
    role: 'nutri' | 'personal' | 'psiquiatra';
    profissionalId: string;
    type: LeadProfissionalTimelineEventType;
    description: string;
    createdBy?: string;
  }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      leadId: input.leadId,
      role: input.role,
      profissionalId: input.profissionalId,
      type: input.type,
      description: input.description,
      createdBy: input.createdBy || null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  static async listByLead(leadId: string): Promise<LeadProfissionalTimelineEvent[]> {
    const q = query(collection(db, COLLECTION_NAME), where('leadId', '==', leadId));
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        leadId: String(data.leadId || ''),
        role:
          data.role === 'personal'
            ? 'personal'
            : data.role === 'psiquiatra'
              ? 'psiquiatra'
              : 'nutri',
        profissionalId: String(data.profissionalId || ''),
        type: data.type as LeadProfissionalTimelineEventType,
        description: String(data.description || ''),
        createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
        createdAt: data.createdAt?.toDate?.() ?? null,
      } satisfies LeadProfissionalTimelineEvent;
    });
    events.sort((a, b) => {
      const ta = a.createdAt?.getTime() || 0;
      const tb = b.createdAt?.getTime() || 0;
      return tb - ta;
    });
    return events;
  }
}
