import { collection, doc, getDocs, getDoc, updateDoc, addDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { Medico } from '@/types/medico';

/**
 * Remove valores undefined recursivamente de um objeto (Firestore não aceita undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

export class MedicoService {
  private static normalizeEmail(email?: string | null): string {
    return (email || '').trim().toLowerCase();
  }

  private static async findMedicoDocByEmailNormalized(email?: string | null) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    const exactQuery = query(collection(db, 'medicos'), where('email', '==', normalizedEmail));
    const exactSnapshot = await getDocs(exactQuery);
    if (!exactSnapshot.empty) {
      return exactSnapshot.docs[0];
    }

    const allSnapshot = await getDocs(collection(db, 'medicos'));
    return (
      allSnapshot.docs.find((d) => {
        const data = d.data() as { email?: string };
        return this.normalizeEmail(data.email) === normalizedEmail;
      }) || null
    );
  }

  // Criar ou atualizar perfil do médico
  static async createOrUpdateMedico(medico: Omit<Medico, 'id'>): Promise<string> {
    try {
      const normalizedEmail = this.normalizeEmail(medico.email);
      const medicoData = removeUndefined({
        ...medico,
        email: normalizedEmail,
        dataCadastro: new Date()
      });

      // 1) Tenta por userId (regra atual)
      const userId = (medico.userId || '').trim();
      if (userId) {
        const existingQuery = query(collection(db, 'medicos'), where('userId', '==', userId));
        const existingSnapshot = await getDocs(existingQuery);
        if (!existingSnapshot.empty) {
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(doc(db, 'medicos', existingDoc.id), medicoData);
          return existingDoc.id;
        }
      }

      // 2) Fallback por e-mail (evita duplicação legado/UID diferente)
      const existingByEmailDoc = await this.findMedicoDocByEmailNormalized(normalizedEmail);
      if (existingByEmailDoc) {
        await updateDoc(doc(db, 'medicos', existingByEmailDoc.id), medicoData);
        return existingByEmailDoc.id;
      }

      // 3) Não encontrou: cria novo
      const docRef = await addDoc(collection(db, 'medicos'), {
        ...medicoData,
        ...shadowOrganizationFields(),
      });
      return docRef.id;
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
      const normalizedEmail = this.normalizeEmail(email);
      if (!normalizedEmail) return null;

      const medicoQuery = query(collection(db, 'medicos'), where('email', '==', normalizedEmail));
      const medicoSnapshot = await getDocs(medicoQuery);
      
      const medicoDoc =
        !medicoSnapshot.empty
          ? medicoSnapshot.docs[0]
          : await this.findMedicoDocByEmailNormalized(normalizedEmail);

      if (!medicoDoc) return null;

      const medicoData = medicoDoc.data();
      return {
        id: medicoDoc.id,
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

  // Atualizar médico por ID
  static async updateMedico(medicoId: string, updates: Partial<Medico>): Promise<void> {
    try {
      const medicoRef = doc(db, 'medicos', medicoId);
      const medicoData = removeUndefined(updates);
      await updateDoc(medicoRef, medicoData);
    } catch (error) {
      console.error('Erro ao atualizar médico:', error);
      throw error;
    }
  }

  // Deletar médico
  static async deleteMedico(medicoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'medicos', medicoId));
    } catch (error) {
      console.error('Erro ao deletar médico:', error);
      throw error;
    }
  }

  // Buscar médico por nome e sobrenome (para links personalizados)
  static async getMedicoByNomeSobrenome(nomeSobrenome: string): Promise<Medico | null> {
    try {
      // Buscar todos os médicos e filtrar por nome e sobrenome
      const medicos = await this.getAllMedicos();
      
      // Converter nomeSobrenome de "ricardo-mota" para "Ricardo Mota"
      const partesNome = nomeSobrenome
        .split('-')
        .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase());
      
      const nomeBusca = partesNome.join(' ');
      
      // Buscar médico que tenha o nome começando com o nome buscado
      // Por exemplo: "Ricardo Mota" deve encontrar "Ricardo Mota Silva" ou "Ricardo Mota"
      const medicoEncontrado = medicos.find(medico => {
        const nomeMedico = medico.nome.trim();
        // Verifica se o nome do médico começa com o nome buscado
        return nomeMedico.toLowerCase().startsWith(nomeBusca.toLowerCase());
      });
      
      return medicoEncontrado || null;
    } catch (error) {
      console.error('Erro ao buscar médico por nome e sobrenome:', error);
      throw error;
    }
  }
}

