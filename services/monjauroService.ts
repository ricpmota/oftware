import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface MonjauroPreco {
  tipo: string; // '2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'
  preco: number; // Preço em reais
  atualizadoEm?: Date;
}

export class MonjauroService {
  private static readonly COLLECTION_NAME = 'monjauro_precos';

  // Buscar todos os preços
  static async getPrecos(): Promise<MonjauroPreco[]> {
    try {
      const precosSnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return precosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          tipo: data.tipo,
          preco: data.preco,
          atualizadoEm: data.atualizadoEm?.toDate(),
        } as MonjauroPreco;
      });
    } catch (error) {
      console.error('Erro ao buscar preços do Monjauro:', error);
      throw error;
    }
  }

  // Buscar preço de um tipo específico
  static async getPrecoPorTipo(tipo: string): Promise<MonjauroPreco | null> {
    try {
      const precoDoc = await getDoc(doc(db, this.COLLECTION_NAME, tipo));
      if (!precoDoc.exists()) {
        return null;
      }
      const data = precoDoc.data();
      return {
        tipo: data.tipo,
        preco: data.preco,
        atualizadoEm: data.atualizadoEm?.toDate(),
      } as MonjauroPreco;
    } catch (error) {
      console.error('Erro ao buscar preço do Monjauro:', error);
      throw error;
    }
  }

  // Atualizar ou criar preço de um tipo específico
  static async updatePreco(tipo: string, preco: number): Promise<void> {
    try {
      await setDoc(
        doc(db, this.COLLECTION_NAME, tipo),
        {
          tipo,
          preco,
          atualizadoEm: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao atualizar preço do Monjauro:', error);
      throw error;
    }
  }
}
