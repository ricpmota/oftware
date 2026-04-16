/**
 * ChatNutri Service - Firestore operations (ETAPA 1)
 * Estrutura:
 * - pacientes_completos/{patientId} - statusTratamento
 * - pacientes_completos/{patientId}/usage/chatNutri_{dateKey} - count
 * - pacientes_completos/{patientId}/chatNutri/{dateKey}/messages/{messageId}
 * - pacientes_completos/{patientId}/chatNutri/{dateKey} - dayTotals
 */

import { doc, getDoc, setDoc, addDoc, collection, getDocs, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatNutriMessage, ChatNutriDayTotals, ChatNutriTotals } from '@/lib/chatnutri/types';

const COL_PACIENTES = 'pacientes_completos';

/** Obter statusTratamento do paciente */
export async function getPatientStatusTratamento(patientId: string): Promise<string | null> {
  const ref = doc(db, COL_PACIENTES, patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data()?.statusTratamento ?? null) : null;
}

/** Obter contagem de fotos do dia (usage) */
export async function getChatNutriDailyImageCount(patientId: string, dateKey: string): Promise<number> {
  const docId = `chatNutri_${dateKey}`;
  const ref = doc(db, COL_PACIENTES, patientId, 'usage', docId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data()?.count ?? 0) : 0;
}

/** Incrementar contagem de fotos do dia */
export async function incrementChatNutriDailyImageCount(patientId: string, dateKey: string): Promise<number> {
  const docId = `chatNutri_${dateKey}`;
  const ref = doc(db, COL_PACIENTES, patientId, 'usage', docId);
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data()?.count ?? 0) : 0;
  const next = current + 1;
  await setDoc(ref, { count: next });
  return next;
}

/** Salvar mensagem no chatNutri. Se message.id for fornecido, usa setDoc; senão addDoc. */
export async function saveChatNutriMessage(
  patientId: string,
  dateKey: string,
  message: (Omit<ChatNutriMessage, 'createdAt'> & { createdAt?: string }) | (Omit<ChatNutriMessage, 'id' | 'createdAt'> & { createdAt?: string })
): Promise<string> {
  const colRef = collection(db, COL_PACIENTES, patientId, 'chatNutri', dateKey, 'messages');
  const createdAt = message.createdAt ?? new Date().toISOString();
  const { id, ...rest } = message as ChatNutriMessage & { createdAt?: string };
  const data = { ...rest, createdAt };

  if (id) {
    const msgRef = doc(colRef, id);
    await setDoc(msgRef, data);
    return id;
  }
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

/** Atualizar ou criar dayTotals do dia */
export async function upsertChatNutriDayTotals(
  patientId: string,
  dateKey: string,
  dayTotals: ChatNutriDayTotals
): Promise<void> {
  const ref = doc(db, COL_PACIENTES, patientId, 'chatNutri', dateKey);
  await setDoc(ref, { dayTotals }, { merge: true });
}

/** Obter dayTotals do dia */
export async function getChatNutriDayTotals(patientId: string, dateKey: string): Promise<{ calories: number; protein: number; carbs: number; fat: number } | null> {
  const ref = doc(db, COL_PACIENTES, patientId, 'chatNutri', dateKey);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data()?.dayTotals ? snap.data().dayTotals : null;
}

/** Listar mensagens do dia (ordenadas por createdAt) */
export async function listChatNutriMessages(patientId: string, dateKey: string): Promise<ChatNutriMessage[]> {
  const colRef = collection(db, COL_PACIENTES, patientId, 'chatNutri', dateKey, 'messages');
  const q = query(colRef, orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role ?? 'assistant',
      type: (data.type ?? 'chat') as ChatNutriMessage['type'],
      text: data.text ?? '',
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString()),
      imageUrl: data.imageUrl ?? null,
      totals: data.totals,
      confidence: data.confidence
    } as ChatNutriMessage;
  });
}

/** Adicionar dateKey em chatNutriDatasComFotos do paciente (para seletor flutuante) */
export async function addDateToChatNutriDatasComFotos(patientId: string, dateKey: string): Promise<void> {
  const patientRef = doc(db, COL_PACIENTES, patientId);
  const snap = await getDoc(patientRef);
  const data = snap.data();
  const datas: string[] = data?.chatNutriDatasComFotos ?? [];
  if (!datas.includes(dateKey)) {
    datas.push(dateKey);
    datas.sort((a, b) => b.localeCompare(a));
    await updateDoc(patientRef, { chatNutriDatasComFotos: datas });
  }
}
