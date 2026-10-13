import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';

/** Vínculo leve — NÃO copia AlimentoGlobal. */
export const SUBCOL_ALIMENTOS_GLOBAIS_FAVORITOS = 'alimentos_globais_favoritos';

export type AlimentoGlobalFavoritoRef = {
  alimentoGlobalId: string;
  criadoEm: Date;
};

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/**
 * Favoritos da biblioteca METANUTRI.
 * Path: nutricionistas/{uid}/alimentos_globais_favoritos/{alimentoGlobalId}
 */
export class NutriAlimentosGlobaisFavoritosService {
  static collectionRef(nutricionistaId: string) {
    return collection(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL_ALIMENTOS_GLOBAIS_FAVORITOS);
  }

  static async listarIds(nutricionistaId: string): Promise<string[]> {
    const snap = await getDocs(this.collectionRef(nutricionistaId));
    return snap.docs.map((d) => d.id);
  }

  static async listar(nutricionistaId: string): Promise<AlimentoGlobalFavoritoRef[]> {
    const snap = await getDocs(this.collectionRef(nutricionistaId));
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        alimentoGlobalId: d.id,
        criadoEm: toDateSafe(data.criadoEm),
      };
    });
  }

  static async favoritar(nutricionistaId: string, alimentoGlobalId: string): Promise<void> {
    const id = alimentoGlobalId.trim();
    if (!id) throw new Error('alimentoGlobalId obrigatório.');
    await setDoc(
      doc(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL_ALIMENTOS_GLOBAIS_FAVORITOS, id),
      {
        alimentoGlobalId: id,
        criadoEm: serverTimestamp(),
      },
      { merge: true }
    );
  }

  static async desfavoritar(nutricionistaId: string, alimentoGlobalId: string): Promise<void> {
    const id = alimentoGlobalId.trim();
    if (!id) return;
    await deleteDoc(
      doc(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL_ALIMENTOS_GLOBAIS_FAVORITOS, id)
    );
  }

  static async toggle(
    nutricionistaId: string,
    alimentoGlobalId: string,
    currentlyFavorite: boolean
  ): Promise<boolean> {
    if (currentlyFavorite) {
      await this.desfavoritar(nutricionistaId, alimentoGlobalId);
      return false;
    }
    await this.favoritar(nutricionistaId, alimentoGlobalId);
    return true;
  }
}
