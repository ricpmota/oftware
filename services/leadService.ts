import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lead, LeadStatus } from '@/types/lead';

export class LeadService {
  /**
   * Criar ou atualizar um lead no Firestore
   */
  static async createOrUpdateLead(lead: Omit<Lead, 'id'> | Lead): Promise<string> {
    try {
      const leadData: any = {
        uid: lead.uid,
        email: lead.email,
        name: lead.name,
        status: lead.status || 'nao_qualificado',
        createdAt: lead.createdAt || new Date(),
        updatedAt: new Date(),
        dataStatus: lead.dataStatus || new Date(),
      };

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

      // Se tem ID, atualizar; senão, criar novo
      if ('id' in lead && lead.id) {
        await updateDoc(doc(db, 'leads', lead.id), leadData);
        return lead.id;
      } else {
        // Usar UID como ID do documento para evitar duplicatas
        const docRef = doc(db, 'leads', lead.uid);
        await setDoc(docRef, {
          ...leadData,
          createdAtFirestore: new Date(),
        });
        return lead.uid;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar lead:', error);
      throw error;
    }
  }

  /**
   * Atualizar status de um lead
   */
  static async updateLeadStatus(leadId: string, newStatus: LeadStatus, atualizadoPor?: string, observacoes?: string): Promise<void> {
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

      await updateDoc(doc(db, 'leads', leadId), updateData);
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      throw error;
    }
  }

  /**
   * Buscar todos os leads
   */
  static async getAllLeads(): Promise<Lead[]> {
    try {
      const snapshot = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc')));
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || '',
          name: data.name || '',
          createdAt: data.createdAt?.toDate(),
          lastSignInTime: data.lastSignInTime,
          emailVerified: data.emailVerified,
          status: data.status || 'nao_qualificado',
          observacoes: data.observacoes,
          dataStatus: data.dataStatus?.toDate(),
          atualizadoPor: data.atualizadoPor,
          createdAtFirestore: data.createdAtFirestore?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Lead;
      });
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      return [];
    }
  }

  /**
   * Buscar lead por ID
   */
  static async getLeadById(leadId: string): Promise<Lead | null> {
    try {
      const docSnap = await getDoc(doc(db, 'leads', leadId));
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        email: data.email || '',
        name: data.name || '',
        createdAt: data.createdAt?.toDate(),
        lastSignInTime: data.lastSignInTime,
        emailVerified: data.emailVerified,
        status: data.status || 'nao_qualificado',
        observacoes: data.observacoes,
        dataStatus: data.dataStatus?.toDate(),
        atualizadoPor: data.atualizadoPor,
        createdAtFirestore: data.createdAtFirestore?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Lead;
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      return null;
    }
  }

  /**
   * Buscar leads por status
   */
  static async getLeadsByStatus(status: LeadStatus): Promise<Lead[]> {
    try {
      const q = query(
        collection(db, 'leads'),
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
          createdAt: data.createdAt?.toDate(),
          lastSignInTime: data.lastSignInTime,
          emailVerified: data.emailVerified,
          status: data.status || 'nao_qualificado',
          observacoes: data.observacoes,
          dataStatus: data.dataStatus?.toDate(),
          atualizadoPor: data.atualizadoPor,
          createdAtFirestore: data.createdAtFirestore?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Lead;
      });
    } catch (error) {
      console.error('Erro ao buscar leads por status:', error);
      return [];
    }
  }
}


