import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';

export class LeadMedicoService {
  private static COLLECTION_NAME = 'leads_medico';

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

      // Se tem ID, atualizar; senão, criar novo
      if ('id' in lead && lead.id) {
        // Usar merge: true para não sobrescrever campos que não foram passados
        await updateDoc(doc(db, this.COLLECTION_NAME, lead.id), leadData);
        return lead.id;
      } else {
        // Usar UID como ID do documento para evitar duplicatas
        const docRef = doc(db, this.COLLECTION_NAME, lead.uid);
        await setDoc(docRef, {
          ...leadData,
          createdAtFirestore: new Date(),
        });
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
      const updateData: any = {
        status: newStatus,
        dataStatus: new Date(),
        updatedAt: new Date(),
      };

      if (atualizadoPor) {
        updateData.atualizadoPor = atualizadoPor;
      }

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(doc(db, this.COLLECTION_NAME, leadId), updateData);
    } catch (error) {
      console.error('Erro ao atualizar status do lead médico:', error);
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
      
      const leads = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || '',
          name: data.name || '',
          telefone: data.telefone,
          cidade: data.cidade,
          estado: data.estado,
          createdAt: data.createdAt?.toDate(),
          lastSignInTime: data.lastSignInTime,
          emailVerified: data.emailVerified,
          status: data.status || 'nao_qualificado',
          dataStatus: data.dataStatus?.toDate() || new Date(),
          observacoes: data.observacoes,
          atualizadoPor: data.atualizadoPor,
          medicoId: data.medicoId,
          solicitacaoId: data.solicitacaoId,
          createdAtFirestore: data.createdAtFirestore?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as LeadMedico;
      });
      
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
   * Buscar lead por ID
   */
  static async getLeadById(leadId: string): Promise<LeadMedico | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, leadId));
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        email: data.email || '',
        name: data.name || '',
        telefone: data.telefone,
        cidade: data.cidade,
        estado: data.estado,
        createdAt: data.createdAt?.toDate(),
        lastSignInTime: data.lastSignInTime,
        emailVerified: data.emailVerified,
        status: data.status || 'nao_qualificado',
        dataStatus: data.dataStatus?.toDate() || new Date(),
        observacoes: data.observacoes,
        atualizadoPor: data.atualizadoPor,
        medicoId: data.medicoId,
        solicitacaoId: data.solicitacaoId,
        createdAtFirestore: data.createdAtFirestore?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as LeadMedico;
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
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || '',
          name: data.name || '',
          telefone: data.telefone,
          cidade: data.cidade,
          estado: data.estado,
          createdAt: data.createdAt?.toDate(),
          lastSignInTime: data.lastSignInTime,
          emailVerified: data.emailVerified,
          status: data.status || 'nao_qualificado',
          dataStatus: data.dataStatus?.toDate() || new Date(),
          observacoes: data.observacoes,
          atualizadoPor: data.atualizadoPor,
          medicoId: data.medicoId,
          solicitacaoId: data.solicitacaoId,
          createdAtFirestore: data.createdAtFirestore?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as LeadMedico;
      });
    } catch (error) {
      console.error('Erro ao buscar leads por status:', error);
      return [];
    }
  }
}

