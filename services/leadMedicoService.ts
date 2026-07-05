import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, orderBy, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { LeadMedico, LeadMedicoStatus, type LeadReferralSnapshot } from '@/types/leadMedico';
import { LeadMedicoTimelineService } from '@/services/leadMedicoTimelineService';
import { normalizeLeadStatus } from '@/lib/crm/leadMedicoCrmUtils';
import { isDefaultStageKey } from '@/lib/crm/leadStageKey';
import { normalizeLeadReferral, referralToFirestore, formatReferralChangeDescription } from '@/lib/crm/resolveLeadReferral';
import { dedupeLeadCrmTags, normalizeLeadCrmTags } from '@/lib/crm/leadCrmTagUtils';
import type { LeadCrmTagSnapshot } from '@/types/crmTag';

export class LeadMedicoService {
  private static COLLECTION_NAME = 'leads_medico';

  private static mapDoc(id: string, data: Record<string, unknown>): LeadMedico {
    return {
      id,
      uid: (data.uid as string) || id,
      email: (data.email as string) || '',
      name: (data.name as string) || '',
      telefone: data.telefone as string | undefined,
      cidade: data.cidade as string | undefined,
      estado: data.estado as string | undefined,
      createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.(),
      lastSignInTime: data.lastSignInTime as string | undefined,
      emailVerified: data.emailVerified as boolean | undefined,
      status: (data.status as LeadMedicoStatus) || 'nao_qualificado',
      crmStageKey: typeof data.crmStageKey === 'string' ? data.crmStageKey : undefined,
      dataStatus: (data.dataStatus as { toDate?: () => Date })?.toDate?.() || new Date(),
      observacoes: data.observacoes as string | undefined,
      atualizadoPor: data.atualizadoPor as string | undefined,
      medicoId: data.medicoId as string,
      solicitacaoId: data.solicitacaoId as string | undefined,
      orcamento: typeof data.orcamento === 'number' ? data.orcamento : undefined,
      crmTags: normalizeLeadCrmTags(data.crmTags),
      referral: normalizeLeadReferral(data.referral),
      createdAtFirestore: (data.createdAtFirestore as { toDate?: () => Date })?.toDate?.(),
      updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.(),
      estrelas: typeof data.estrelas === 'number' ? data.estrelas : 0,
    };
  }

  /**
   * Criar ou atualizar um lead médico no Firestore
   */
  static async createOrUpdateLead(lead: Omit<LeadMedico, 'id'> | LeadMedico): Promise<string> {
    try {
      const leadData: any = {
        uid: lead.uid,
        email: lead.email,
        name: lead.name,
        status: lead.status || 'nao_qualificado',
        medicoId: lead.medicoId,
        updatedAt: new Date(),
      };

      // Preservar createdAt se já existe (não sobrescrever)
      if (lead.createdAt) {
        leadData.createdAt = lead.createdAt;
      } else {
        leadData.createdAt = new Date();
      }

      // Preservar dataStatus se já existe (não sobrescrever)
      if (lead.dataStatus) {
        leadData.dataStatus = lead.dataStatus;
      } else {
        leadData.dataStatus = new Date();
      }

      if (lead.telefone) {
        leadData.telefone = lead.telefone;
      }

      if (lead.cidade) {
        leadData.cidade = lead.cidade;
      }

      if (lead.estado) {
        leadData.estado = lead.estado;
      }

      if (lead.lastSignInTime) {
        leadData.lastSignInTime = lead.lastSignInTime;
      }

      if (lead.emailVerified !== undefined) {
        leadData.emailVerified = lead.emailVerified;
      }

      if (lead.observacoes) {
        leadData.observacoes = lead.observacoes;
      }

      if (lead.atualizadoPor) {
        leadData.atualizadoPor = lead.atualizadoPor;
      }

      if (lead.solicitacaoId) {
        leadData.solicitacaoId = lead.solicitacaoId;
      }

      if (typeof lead.orcamento === 'number') {
        leadData.orcamento = Math.max(0, lead.orcamento);
      }

      if (lead.referral?.type) {
        leadData.referral = referralToFirestore(lead.referral);
      }

      if (lead.crmTags) {
        leadData.crmTags = dedupeLeadCrmTags(lead.crmTags);
      }

      if (lead.crmStageKey) {
        leadData.crmStageKey = lead.crmStageKey;
      }

      // Se tem ID, atualizar; senão, criar novo
      if ('id' in lead && lead.id) {
        // Usar merge: true para não sobrescrever campos que não foram passados
        await updateDoc(doc(db, this.COLLECTION_NAME, lead.id), leadData);
        return lead.id;
      } else {
        // Usar UID como ID do documento para evitar duplicatas
        const docRef = doc(db, this.COLLECTION_NAME, lead.uid);
        const existing = await getDoc(docRef);
        await setDoc(
          docRef,
          {
            ...leadData,
            ...(existing.exists() ? {} : shadowOrganizationFields()),
            createdAtFirestore: existing.exists()
              ? (existing.data()?.createdAtFirestore ?? new Date())
              : new Date(),
          },
          { merge: true }
        );
        if (!existing.exists()) {
          LeadMedicoTimelineService.recordLeadCreated(
            lead.uid,
            lead.medicoId,
            lead.name,
            lead.atualizadoPor
          ).catch(console.error);
        }
        return lead.uid;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar lead médico:', error);
      throw error;
    }
  }

  /**
   * Atualizar status de um lead médico
   */
  static async updateLeadStatus(
    leadId: string, 
    newStatus: LeadMedicoStatus, 
    atualizadoPor?: string, 
    observacoes?: string
  ): Promise<void> {
    try {
      const leadRef = doc(db, this.COLLECTION_NAME, leadId);
      const leadSnap = await getDoc(leadRef);
      const previousStatus = leadSnap.exists()
        ? normalizeLeadStatus(String(leadSnap.data()?.status || 'nao_qualificado'))
        : null;
      const medicoId = leadSnap.exists() ? String(leadSnap.data()?.medicoId || '') : '';

      const updateData: any = {
        status: newStatus,
        crmStageKey: deleteField(),
        dataStatus: new Date(),
        updatedAt: new Date(),
      };

      if (atualizadoPor) {
        updateData.atualizadoPor = atualizadoPor;
      }

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(leadRef, updateData);

      if (medicoId && previousStatus !== newStatus) {
        LeadMedicoTimelineService.recordStageChange(
          leadId,
          medicoId,
          previousStatus,
          newStatus,
          atualizadoPor
        ).catch(console.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do lead médico:', error);
      throw error;
    }
  }

  /** Move lead para etapa padrão ou customizada do pipeline CRM */
  static async updateLeadStage(
    leadId: string,
    stageKey: string,
    atualizadoPor?: string
  ): Promise<void> {
    try {
      const leadRef = doc(db, this.COLLECTION_NAME, leadId);
      const leadSnap = await getDoc(leadRef);
      const previousStatus = leadSnap.exists()
        ? normalizeLeadStatus(String(leadSnap.data()?.status || 'nao_qualificado'))
        : null;
      const medicoId = leadSnap.exists() ? String(leadSnap.data()?.medicoId || '') : '';

      const updateData: Record<string, unknown> = {
        dataStatus: new Date(),
        updatedAt: new Date(),
      };

      if (isDefaultStageKey(stageKey)) {
        updateData.status = stageKey;
        updateData.crmStageKey = deleteField();
      } else {
        updateData.crmStageKey = stageKey;
      }

      if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;

      await updateDoc(leadRef, updateData);

      if (medicoId && isDefaultStageKey(stageKey) && previousStatus !== stageKey) {
        LeadMedicoTimelineService.recordStageChange(
          leadId,
          medicoId,
          previousStatus,
          stageKey,
          atualizadoPor
        ).catch(console.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar etapa do lead médico:', error);
      throw error;
    }
  }

  static async updateLeadObservacoes(leadId: string, observacoes: string, atualizadoPor?: string): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        observacoes,
        updatedAt: new Date(),
      };
      if (atualizadoPor) {
        updateData.atualizadoPor = atualizadoPor;
      }
      await updateDoc(doc(db, this.COLLECTION_NAME, leadId), updateData);
    } catch (error) {
      console.error('Erro ao atualizar observações do lead médico:', error);
      throw error;
    }
  }

  static async updateLeadOrcamento(
    leadId: string,
    orcamento: number,
    atualizadoPor?: string
  ): Promise<void> {
    const value = Math.max(0, Math.round(orcamento));
    try {
      const updateData: Record<string, unknown> = {
        orcamento: value,
        updatedAt: new Date(),
      };
      if (atualizadoPor) {
        updateData.atualizadoPor = atualizadoPor;
      }
      await updateDoc(doc(db, this.COLLECTION_NAME, leadId), updateData);
    } catch (error) {
      console.error('Erro ao atualizar orçamento do lead médico:', error);
      throw error;
    }
  }

  static async updateLeadCrmTags(
    leadId: string,
    crmTags: LeadCrmTagSnapshot[],
    atualizadoPor?: string
  ): Promise<void> {
    const tags = dedupeLeadCrmTags(crmTags);
    try {
      const updateData: Record<string, unknown> = {
        crmTags: tags,
        updatedAt: new Date(),
      };
      if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;
      await updateDoc(doc(db, this.COLLECTION_NAME, leadId), updateData);
    } catch (error) {
      console.error('Erro ao atualizar tags do lead médico:', error);
      throw error;
    }
  }

  static async updateLeadReferral(
    leadId: string,
    referral: LeadMedico['referral'],
    atualizadoPor?: string
  ): Promise<void> {
    if (!referral?.type) return;
    try {
      const leadRef = doc(db, this.COLLECTION_NAME, leadId);
      const leadSnap = await getDoc(leadRef);
      const medicoId = leadSnap.exists() ? String(leadSnap.data()?.medicoId || '') : '';

      const updateData: Record<string, unknown> = {
        referral: referralToFirestore(referral),
        updatedAt: new Date(),
      };
      if (atualizadoPor) updateData.atualizadoPor = atualizadoPor;
      await updateDoc(leadRef, updateData);

      if (medicoId) {
        LeadMedicoTimelineService.recordNote(
          leadId,
          medicoId,
          formatReferralChangeDescription(referral),
          atualizadoPor
        ).catch(console.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar origem do lead médico:', error);
      throw error;
    }
  }

  /**
   * Atualiza a classificação por estrelas (0–5) de um lead no Firestore.
   */
  static async updateLeadEstrelas(leadId: string, estrelas: number, atualizadoPor?: string): Promise<void> {
    const n = Math.min(5, Math.max(0, Math.round(estrelas)));
    try {
      const leadRef = doc(db, this.COLLECTION_NAME, leadId);
      const leadSnap = await getDoc(leadRef);
      const previous = leadSnap.exists() ? Number(leadSnap.data()?.estrelas || 0) : 0;
      const medicoId = leadSnap.exists() ? String(leadSnap.data()?.medicoId || '') : '';

      await updateDoc(leadRef, {
        estrelas: n,
        updatedAt: new Date(),
      });

      if (medicoId && previous !== n) {
        LeadMedicoTimelineService.recordEstrelasChange(leadId, medicoId, n, atualizadoPor).catch(
          console.error
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar estrelas do lead médico:', error);
      throw error;
    }
  }

  /**
   * Buscar todos os leads de um médico
   */
  static async getLeadsByMedico(medicoId: string): Promise<LeadMedico[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenar no cliente depois
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('medicoId', '==', medicoId)
      );
      
      const snapshot = await getDocs(q);
      
      const leads = snapshot.docs.map((docSnap) => this.mapDoc(docSnap.id, docSnap.data()));
      
      // Ordenar no cliente por dataStatus (mais recente primeiro)
      leads.sort((a, b) => {
        const dateA = a.dataStatus?.getTime() || 0;
        const dateB = b.dataStatus?.getTime() || 0;
        return dateB - dateA;
      });
      
      return leads;
    } catch (error) {
      console.error('Erro ao buscar leads do médico:', error);
      return [];
    }
  }

  /**
   * Buscar lead por e-mail e médico (evita duplicata no cadastro manual de paciente).
   */
  static async findLeadByEmailAndMedico(medicoId: string, email: string): Promise<LeadMedico | null> {
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return null;

      const q = query(collection(db, this.COLLECTION_NAME), where('medicoId', '==', medicoId));
      const snapshot = await getDocs(q);
      const match = snapshot.docs.find(
        (d) => String(d.data().email || '').trim().toLowerCase() === normalized
      );
      if (!match) return null;
      return this.mapDoc(match.id, match.data());
    } catch (error) {
      console.error('Erro ao buscar lead por e-mail:', error);
      return null;
    }
  }

  /**
   * Buscar lead por ID
   */
  static async getLeadById(leadId: string): Promise<LeadMedico | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, leadId));
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return this.mapDoc(docSnap.id, data);
    } catch (error) {
      console.error('Erro ao buscar lead médico por ID:', error);
      return null;
    }
  }

  /**
   * Buscar leads por status
   */
  static async getLeadsByStatus(medicoId: string, status: LeadMedicoStatus): Promise<LeadMedico[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('medicoId', '==', medicoId),
        where('status', '==', status),
        orderBy('dataStatus', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((docSnap) => this.mapDoc(docSnap.id, docSnap.data()));
    } catch (error) {
      console.error('Erro ao buscar leads por status:', error);
      return [];
    }
  }
}

