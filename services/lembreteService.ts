import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lembrete } from '@/types/lembrete';

const COLLECTION = 'lembretes';

function docToLembrete(docSnap: any): Lembrete {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    medicoId: d.medicoId ?? undefined,
    nutricionistaId: d.nutricionistaId ?? undefined,
    pacienteId: d.pacienteId ?? '',
    pacienteNome: d.pacienteNome ?? '',
    data: d.data ?? '',
    texto: d.texto ?? '',
    tag: d.tag ?? 'Consulta',
    criadoEm: d.criadoEm?.toDate?.() ?? new Date(),
    concluido: d.concluido ?? false,
  };
}

export const LembreteService = {
  async getLembretesPorMedico(medicoId: string): Promise<Lembrete[]> {
    const q = query(
      collection(db, COLLECTION),
      where('medicoId', '==', medicoId),
    );
    const snap = await getDocs(q);
    const result = snap.docs.map(docToLembrete);
    result.sort((a, b) => a.data.localeCompare(b.data));
    return result;
  },

  async getLembretesPorNutricionista(nutricionistaId: string): Promise<Lembrete[]> {
    const q = query(
      collection(db, COLLECTION),
      where('nutricionistaId', '==', nutricionistaId),
    );
    const snap = await getDocs(q);
    const result = snap.docs.map(docToLembrete);
    result.sort((a, b) => a.data.localeCompare(b.data));
    return result;
  },

  async criarLembrete(dados: Omit<Lembrete, 'id' | 'criadoEm'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...dados,
      criadoEm: Timestamp.now(),
    });
    return docRef.id;
  },

  async toggleConcluido(lembreteId: string, concluido: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTION, lembreteId), { concluido });
  },

  async atualizarLembrete(
    lembreteId: string,
    dados: Pick<Lembrete, 'pacienteId' | 'pacienteNome' | 'data' | 'texto' | 'tag'>,
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTION, lembreteId), dados);
  },

  async deletarLembrete(lembreteId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, lembreteId));
  },
};
