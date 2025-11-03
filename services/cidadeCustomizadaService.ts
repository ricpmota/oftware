import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CidadeCustomizada {
  id: string;
  estado: string;
  cidade: string;
  criadoPor: string; // userId do médico que criou
  criadoEm: Date;
}

export class CidadeCustomizadaService {
  /**
   * Buscar todas as cidades customizadas de um estado
   */
  static async getCidadesCustomizadasPorEstado(estado: string): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'cidades_customizadas'),
        where('estado', '==', estado)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return data.cidade;
      });
    } catch (error) {
      console.error('Erro ao buscar cidades customizadas:', error);
      return [];
    }
  }

  /**
   * Buscar todas as cidades customizadas
   */
  static async getAllCidadesCustomizadas(): Promise<CidadeCustomizada[]> {
    try {
      const snapshot = await getDocs(collection(db, 'cidades_customizadas'));
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          estado: data.estado,
          cidade: data.cidade,
          criadoPor: data.criadoPor,
          criadoEm: data.criadoEm?.toDate() || new Date()
        } as CidadeCustomizada;
      });
    } catch (error) {
      console.error('Erro ao buscar todas as cidades customizadas:', error);
      return [];
    }
  }

  /**
   * Adicionar uma nova cidade customizada
   */
  static async criarCidadeCustomizada(
    estado: string,
    cidade: string,
    userId: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'cidades_customizadas'), {
        estado,
        cidade,
        criadoPor: userId,
        criadoEm: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar cidade customizada:', error);
      throw error;
    }
  }
}

