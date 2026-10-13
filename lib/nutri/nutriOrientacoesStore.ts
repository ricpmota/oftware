import { addDoc, collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type NutriOrientacao = {
  id: string;
  pacienteId: string;
  titulo: string;
  mensagem: string;
  mensagemHtml?: string;
  createdAt: Date;
  createdById?: string;
  createdByName?: string;
  createdByRole?: 'nutritionist' | 'doctor' | 'patient';
  inboxMessageId?: string | null;
};

function orientacoesCol(pacienteId: string) {
  return collection(db, 'pacientes_completos', pacienteId, 'nutricao', 'dados', 'orientacoes');
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as Timestamp).toDate();
  }
  const d = new Date(String(value || ''));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function listNutriOrientacoes(pacienteId: string): Promise<NutriOrientacao[]> {
  try {
    const snap = await getDocs(query(orientacoesCol(pacienteId), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => mapDoc(pacienteId, d.id, d.data() as Record<string, unknown>));
  } catch {
    const snap = await getDocs(orientacoesCol(pacienteId));
    return snap.docs
      .map((d) => mapDoc(pacienteId, d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

function mapDoc(pacienteId: string, id: string, data: Record<string, unknown>): NutriOrientacao {
  return {
    id,
    pacienteId,
    titulo: String(data.titulo || 'Orientação nutricional'),
    mensagem: String(data.mensagem || ''),
    mensagemHtml: typeof data.mensagemHtml === 'string' ? data.mensagemHtml : undefined,
    createdAt: toDate(data.createdAt),
    createdById: typeof data.createdById === 'string' ? data.createdById : undefined,
    createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
    createdByRole: data.createdByRole as NutriOrientacao['createdByRole'],
    inboxMessageId: typeof data.inboxMessageId === 'string' ? data.inboxMessageId : null,
  };
}

export async function createNutriOrientacao(
  pacienteId: string,
  input: Omit<NutriOrientacao, 'id' | 'pacienteId' | 'createdAt'> & { createdAt?: Date }
): Promise<string> {
  const ref = await addDoc(orientacoesCol(pacienteId), {
    titulo: input.titulo,
    mensagem: input.mensagem,
    mensagemHtml: input.mensagemHtml || null,
    createdAt: input.createdAt || new Date(),
    createdById: input.createdById || null,
    createdByName: input.createdByName || null,
    createdByRole: input.createdByRole || 'nutritionist',
    inboxMessageId: input.inboxMessageId || null,
  });
  return ref.id;
}
