import { collection, doc, getDocs, getDoc, updateDoc, addDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Medico } from '@/types/medico';

export class MedicoService {
  // Criar ou atualizar perfil do médico
  static async createOrUpdateMedico(medico: Omit<Medico, 'id'>): Promise<string> {
    try {
      // Verificar se já existe médico com este userId
      const existingQuery = query(collection(db, 'medicos'), where('userId', '==', medico.userId));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Atualizar médico existente
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(doc(db, 'medicos', existingDoc.id), {
          ...medico,
          dataCadastro: new Date()
        });
        return existingDoc.id;
      } else {
        // Criar novo médico
        const docRef = await addDoc(collection(db, 'medicos'), {
          ...medico,
          dataCadastro: new Date()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar médico:', error);
      throw error;
    }
  }

  // Buscar médico por ID
  static async getMedicoById(medicoId: string): Promise<Medico | null> {
    try {
      const medicoDoc = await getDoc(doc(db, 'medicos', medicoId));
      
      if (!medicoDoc.exists()) {
        return null;
      }
      
      const medicoData = medicoDoc.data();
      return {
        id: medicoDoc.id,
        ...medicoData,
        dataCadastro: medicoData.dataCadastro?.toDate(),
      } as Medico;
    } catch (error) {
      console.error('Erro ao buscar médico por ID:', error);
      throw error;
    }
  }

  // Buscar médico por userId
  static async getMedicoByUserId(userId: string): Promise<Medico | null> {
    try {
      const medicoQuery = query(collection(db, 'medicos'), where('userId', '==', userId));
      const medicoSnapshot = await getDocs(medicoQuery);
      
      if (medicoSnapshot.empty) {
        return null;
      }
      
      const medicoData = medicoSnapshot.docs[0].data();
      return {
        id: medicoSnapshot.docs[0].id,
        ...medicoData,
        dataCadastro: medicoData.dataCadastro?.toDate(),
      } as Medico;
    } catch (error) {
      console.error('Erro ao buscar médico:', error);
      throw error;
    }
  }

  // Buscar médico por email
  static async getMedicoByEmail(email: string): Promise<Medico | null> {
    try {
      const medicoQuery = query(collection(db, 'medicos'), where('email', '==', email));
      const medicoSnapshot = await getDocs(medicoQuery);
      
      if (medicoSnapshot.empty) {
        return null;
      }
      
      const medicoData = medicoSnapshot.docs[0].data();
      return {
        id: medicoSnapshot.docs[0].id,
        ...medicoData,
        dataCadastro: medicoData.dataCadastro?.toDate(),
      } as Medico;
    } catch (error) {
      console.error('Erro ao buscar médico por email:', error);
      throw error;
    }
  }

  // Buscar todos os médicos ativos
  static async getAllMedicos(): Promise<Medico[]> {
    try {
      const medicoSnapshot = await getDocs(collection(db, 'medicos'));
      return medicoSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate(),
        } as Medico;
      });
    } catch (error) {
      console.error('Erro ao buscar médicos:', error);
      throw error;
    }
  }

  // Buscar médicos por cidade
  static async getMedicosByCidade(cidade: string, estado: string): Promise<Medico[]> {
    try {
      const medicos = await this.getAllMedicos();
      return medicos.filter(medico => 
        medico.cidades.some(c => 
          c.cidade.toLowerCase() === cidade.toLowerCase() && 
          c.estado.toLowerCase() === estado.toLowerCase()
        )
      );
    } catch (error) {
      console.error('Erro ao buscar médicos por cidade:', error);
      throw error;
    }
  }
}

