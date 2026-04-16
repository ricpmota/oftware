import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProfissionalTipo } from '@/types/classificacaoProfissional';

const COLLECTION = 'classificacao_profissionais';
const COLLECTION_ADMIN = 'classificacao_profissionais_admin';

export interface AgregadoClassificacao {
  count: number;
  media: number;
}

export interface DetalhamentoClassificacao {
  count5: number;
  count4: number;
  count3: number;
  count2: number;
  count1: number;
  total: number;
  media: number;
}

function adminDocId(profissionalTipo: ProfissionalTipo, profissionalId: string): string {
  return `${profissionalTipo}_${profissionalId}`;
}

function docId(pacienteId: string, profissionalTipo: ProfissionalTipo, profissionalId: string): string {
  return `${pacienteId}_${profissionalTipo}_${profissionalId}`;
}

export class ClassificacaoProfissionalService {
  /**
   * Busca a classificação (1-5 estrelas) que o paciente deu a um profissional.
   * Retorna null ou undefined se ainda não votou.
   */
  static async getClassificacao(
    pacienteId: string,
    profissionalTipo: ProfissionalTipo,
    profissionalId: string
  ): Promise<number | null> {
    try {
      const ref = doc(db, COLLECTION, docId(pacienteId, profissionalTipo, profissionalId));
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const estrelas = snap.data()?.estrelas;
      return typeof estrelas === 'number' && estrelas >= 1 && estrelas <= 5 ? estrelas : null;
    } catch (error) {
      console.error('Erro ao buscar classificação do profissional:', error);
      return null;
    }
  }

  /**
   * Salva a classificação do paciente para o profissional (1-5 estrelas).
   * Só pode ser feita uma vez (o documento é criado e não deve ser alterado - conforme regra do produto).
   * Por simplicidade, permitimos update caso o produto mude: paciente pode alterar voto.
   */
  static async setClassificacao(
    pacienteId: string,
    profissionalTipo: ProfissionalTipo,
    profissionalId: string,
    estrelas: number
  ): Promise<void> {
    if (estrelas < 1 || estrelas > 5) {
      throw new Error('Estrelas devem ser entre 1 e 5');
    }
    const id = docId(pacienteId, profissionalTipo, profissionalId);
    await setDoc(doc(db, COLLECTION, id), {
      pacienteId,
      profissionalTipo,
      profissionalId,
      estrelas,
      updatedAt: new Date(),
    }, { merge: true });
  }

  /**
   * Busca o agregado de classificação de um profissional (total de votos e média).
   * Se existir override do admin, soma os votos reais dos pacientes ao total editado:
   * ex.: admin colocou 29 votos → 1 paciente vota → total exibido = 30.
   */
  static async getAgregado(
    profissionalTipo: ProfissionalTipo,
    profissionalId: string
  ): Promise<AgregadoClassificacao> {
    try {
      const override = await this.getAdminOverride(profissionalTipo, profissionalId);
      const real = await this.getVotosReais(profissionalTipo, profissionalId);

      if (override && override.total > 0) {
        const total = override.total + real.count;
        const overrideSum = 5 * override.count5 + 4 * override.count4 + 3 * override.count3 + 2 * override.count2 + 1 * override.count1;
        const sum = overrideSum + real.sum;
        const media = total > 0 ? Math.round((sum / total) * 10) / 10 : override.media;
        return { count: total, media };
      }

      if (real.count > 0) {
        const media = Math.round((real.sum / real.count) * 10) / 10;
        return { count: real.count, media };
      }

      return { count: 0, media: 0 };
    } catch (error) {
      console.error('Erro ao buscar agregado de classificação:', error);
      return { count: 0, media: 0 };
    }
  }

  /**
   * Retorna quantidade e soma das estrelas dos votos reais (collection) do profissional.
   */
  private static async getVotosReais(
    profissionalTipo: ProfissionalTipo,
    profissionalId: string
  ): Promise<{ count: number; sum: number }> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('profissionalTipo', '==', profissionalTipo),
        where('profissionalId', '==', profissionalId)
      );
      const snapshot = await getDocs(q);
      let count = 0;
      let sum = 0;
      snapshot.docs.forEach((d) => {
        const est = d.data()?.estrelas;
        if (typeof est === 'number' && est >= 1 && est <= 5) {
          count += 1;
          sum += est;
        }
      });
      return { count, sum };
    } catch (error) {
      console.error('Erro ao buscar votos reais:', error);
      return { count: 0, sum: 0 };
    }
  }

  /**
   * Busca o detalhamento de votos por estrela (5, 4, 3, 2, 1).
   * Se existir override do admin, soma os votos reais dos pacientes ao detalhamento do admin.
   */
  static async getDetalhamento(
    profissionalTipo: ProfissionalTipo,
    profissionalId: string
  ): Promise<DetalhamentoClassificacao> {
    try {
      const override = await this.getAdminOverride(profissionalTipo, profissionalId);
      const q = query(
        collection(db, COLLECTION),
        where('profissionalTipo', '==', profissionalTipo),
        where('profissionalId', '==', profissionalId)
      );
      const snapshot = await getDocs(q);
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      snapshot.docs.forEach((d) => {
        const est = d.data()?.estrelas;
        if (typeof est === 'number' && est >= 1 && est <= 5) {
          counts[est as 1 | 2 | 3 | 4 | 5]++;
        }
      });

      const count5 = (override?.count5 ?? 0) + counts[5];
      const count4 = (override?.count4 ?? 0) + counts[4];
      const count3 = (override?.count3 ?? 0) + counts[3];
      const count2 = (override?.count2 ?? 0) + counts[2];
      const count1 = (override?.count1 ?? 0) + counts[1];
      const total = count5 + count4 + count3 + count2 + count1;
      const sum = 5 * count5 + 4 * count4 + 3 * count3 + 2 * count2 + 1 * count1;
      const media = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
      return { count5, count4, count3, count2, count1, total, media };
    } catch (error) {
      console.error('Erro ao buscar detalhamento:', error);
      return { count5: 0, count4: 0, count3: 0, count2: 0, count1: 0, total: 0, media: 0 };
    }
  }

  /**
   * Busca o override do admin (valores editados manualmente).
   */
  static async getAdminOverride(
    profissionalTipo: ProfissionalTipo,
    profissionalId: string
  ): Promise<DetalhamentoClassificacao | null> {
    try {
      const ref = doc(db, COLLECTION_ADMIN, adminDocId(profissionalTipo, profissionalId));
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const d = snap.data();
      const count5 = Math.max(0, Math.floor(Number(d?.count5) || 0));
      const count4 = Math.max(0, Math.floor(Number(d?.count4) || 0));
      const count3 = Math.max(0, Math.floor(Number(d?.count3) || 0));
      const count2 = Math.max(0, Math.floor(Number(d?.count2) || 0));
      const count1 = Math.max(0, Math.floor(Number(d?.count1) || 0));
      const total = count5 + count4 + count3 + count2 + count1;
      const media = total > 0
        ? Math.round((5 * count5 + 4 * count4 + 3 * count3 + 2 * count2 + 1 * count1) / total * 10) / 10
        : Math.round((Number(d?.media) || 0) * 10) / 10;
      return { count5, count4, count3, count2, count1, total, media };
    } catch (error) {
      console.error('Erro ao buscar override admin:', error);
      return null;
    }
  }

  /**
   * Salva o override do admin (valores editados manualmente).
   * O admin tem domínio total sobre as classificações exibidas.
   */
  static async setAdminOverride(
    profissionalTipo: ProfissionalTipo,
    profissionalId: string,
    data: { count5: number; count4: number; count3: number; count2: number; count1: number; media?: number }
  ): Promise<void> {
    const count5 = Math.max(0, Math.floor(data.count5));
    const count4 = Math.max(0, Math.floor(data.count4));
    const count3 = Math.max(0, Math.floor(data.count3));
    const count2 = Math.max(0, Math.floor(data.count2));
    const count1 = Math.max(0, Math.floor(data.count1));
    const total = count5 + count4 + count3 + count2 + count1;
    const media = data.media !== undefined && total === 0
      ? Math.round((Math.max(0, Math.min(5, data.media))) * 10) / 10
      : total > 0 ? Math.round((5 * count5 + 4 * count4 + 3 * count3 + 2 * count2 + 1 * count1) / total * 10) / 10 : 0;

    const id = adminDocId(profissionalTipo, profissionalId);
    await setDoc(doc(db, COLLECTION_ADMIN, id), {
      profissionalTipo,
      profissionalId,
      count5,
      count4,
      count3,
      count2,
      count1,
      media,
      updatedAt: new Date(),
    }, { merge: true });
  }
}
