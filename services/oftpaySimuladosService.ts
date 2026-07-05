import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  computeSimuladoResultado,
  OFTPAY_SIMULADO_ANSWERS_COLLECTION,
  OFTPAY_SIMULADOS_COLLECTION,
  type OftpaySimulado,
  type OftpaySimuladoAnswer,
  type OftpaySimuladoAnswerDoc,
  type OftpaySimuladoDoc,
  type OftpaySimuladoSelection,
} from '@/types/oftpaySimulados';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import type { AlternativaLetra } from '@/types/oftpayQuestoes';

function timestampToMillis(value: unknown): number | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function parseSelections(data: unknown): OftpaySimuladoSelection[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const dificuldade = row.dificuldade;
      if (dificuldade !== 'facil' && dificuldade !== 'medio' && dificuldade !== 'dificil') {
        return null;
      }
      const quantidade =
        typeof row.quantidade === 'number'
          ? row.quantidade
          : parseInt(String(row.quantidade ?? ''), 10);
      if (!Number.isFinite(quantidade) || quantidade < 1) return null;
      return {
        ...(row.tema != null && String(row.tema).trim()
          ? { tema: String(row.tema).trim() }
          : {}),
        ...(row.capituloTitulo != null && String(row.capituloTitulo).trim()
          ? { capituloTitulo: String(row.capituloTitulo).trim() }
          : {}),
        ...(row.subtema != null && String(row.subtema).trim()
          ? { subtema: String(row.subtema).trim() }
          : {}),
        dificuldade,
        quantidade,
      } satisfies OftpaySimuladoSelection;
    })
    .filter(Boolean) as OftpaySimuladoSelection[];
}

function simuladoFromFirestore(id: string, data: Record<string, unknown>): OftpaySimuladoDoc {
  const status = data.status === 'finalizado' ? 'finalizado' : 'em_andamento';
  const questionIds = Array.isArray(data.questionIds)
    ? data.questionIds.map((q) => String(q)).filter(Boolean)
    : [];
  const resultadoRaw = data.resultado as Record<string, unknown> | undefined;

  return {
    id,
    userId: String(data.userId ?? ''),
    userEmail: data.userEmail != null ? String(data.userEmail) : undefined,
    title: data.title != null ? String(data.title) : undefined,
    selections: parseSelections(data.selections),
    questionIds,
    status,
    startedAt: timestampToMillis(data.startedAt),
    finishedAt: timestampToMillis(data.finishedAt),
    ...(resultadoRaw &&
    typeof resultadoRaw.total === 'number' &&
    typeof resultadoRaw.acertos === 'number'
      ? {
          resultado: {
            total: resultadoRaw.total,
            acertos: resultadoRaw.acertos,
            erros: Number(resultadoRaw.erros ?? 0),
            percentualAcerto: Number(resultadoRaw.percentualAcerto ?? 0),
          },
        }
      : {}),
  };
}

function answerFromFirestore(id: string, data: Record<string, unknown>): OftpaySimuladoAnswerDoc {
  return {
    id,
    simuladoId: String(data.simuladoId ?? ''),
    userId: String(data.userId ?? ''),
    questionId: String(data.questionId ?? ''),
    respostaSelecionada: String(data.respostaSelecionada ?? '') as AlternativaLetra,
    respostaCorreta: String(data.respostaCorreta ?? '') as AlternativaLetra,
    acertou: Boolean(data.acertou),
    tema: data.tema != null ? String(data.tema) : undefined,
    capituloTitulo: data.capituloTitulo != null ? String(data.capituloTitulo) : undefined,
    subtema: data.subtema != null ? String(data.subtema) : undefined,
    dificuldade: data.dificuldade != null ? String(data.dificuldade) : undefined,
    apostilaTitulo: data.apostilaTitulo != null ? String(data.apostilaTitulo) : undefined,
    answeredAt: timestampToMillis(data.answeredAt),
  };
}

function answerDocId(simuladoId: string, questionId: string): string {
  return `${simuladoId}_${questionId}`;
}

export async function listUserSimulados(userId: string): Promise<OftpaySimuladoDoc[]> {
  const q = query(collection(db, OFTPAY_SIMULADOS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => simuladoFromFirestore(d.id, d.data() as Record<string, unknown>));
  return items.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

export async function getSimulado(simuladoId: string): Promise<OftpaySimuladoDoc | null> {
  const snap = await getDoc(doc(db, OFTPAY_SIMULADOS_COLLECTION, simuladoId));
  if (!snap.exists()) return null;
  return simuladoFromFirestore(snap.id, snap.data() as Record<string, unknown>);
}

function sanitizeSelectionForFirestore(sel: OftpaySimuladoSelection): Record<string, unknown> {
  const out: Record<string, unknown> = {
    dificuldade: sel.dificuldade,
    quantidade: sel.quantidade,
  };
  if (sel.capituloTitulo?.trim()) out.capituloTitulo = sel.capituloTitulo.trim();
  if (sel.tema?.trim()) out.tema = sel.tema.trim();
  if (sel.subtema?.trim()) out.subtema = sel.subtema.trim();
  return out;
}

export async function createSimulado(params: {
  userId: string;
  userEmail?: string | null;
  title?: string;
  selections: OftpaySimuladoSelection[];
  questionIds: string[];
}): Promise<string> {
  const now = Timestamp.now();
  const payload: Record<string, unknown> = {
    userId: params.userId,
    selections: params.selections.map(sanitizeSelectionForFirestore),
    questionIds: params.questionIds,
    status: 'em_andamento',
    startedAt: now,
    updatedAt: now,
  };

  const trimmedTitle = params.title?.trim();
  if (trimmedTitle) payload.title = trimmedTitle;
  if (params.userEmail?.trim()) payload.userEmail = params.userEmail.trim();

  const ref = await addDoc(collection(db, OFTPAY_SIMULADOS_COLLECTION), payload);
  return ref.id;
}

/** Upsert: uma resposta por questão dentro do simulado. */
export async function saveSimuladoAnswer(params: {
  simuladoId: string;
  userId: string;
  questao: OftpayQuestaoDoc;
  respostaSelecionada: AlternativaLetra;
  respostaCorreta: AlternativaLetra;
  acertou: boolean;
}): Promise<void> {
  const { simuladoId, userId, questao } = params;
  const ref = doc(
    db,
    OFTPAY_SIMULADO_ANSWERS_COLLECTION,
    answerDocId(simuladoId, questao.id)
  );

  const payload: OftpaySimuladoAnswer = {
    simuladoId,
    userId,
    questionId: questao.id,
    respostaSelecionada: params.respostaSelecionada,
    respostaCorreta: params.respostaCorreta,
    acertou: params.acertou,
    answeredAt: Date.now(),
  };

  if (questao.tema?.trim()) payload.tema = questao.tema.trim();
  if (questao.capituloTitulo?.trim()) payload.capituloTitulo = questao.capituloTitulo.trim();
  if (questao.subtema?.trim()) payload.subtema = questao.subtema.trim();
  if (questao.dificuldade) payload.dificuldade = questao.dificuldade;
  if (questao.fonte?.apostilaTitulo?.trim()) {
    payload.apostilaTitulo = questao.fonte.apostilaTitulo.trim();
  }

  await setDoc(ref, { ...payload, answeredAt: Timestamp.now() }, { merge: true });
}

export async function listSimuladoAnswers(simuladoId: string): Promise<OftpaySimuladoAnswerDoc[]> {
  const q = query(
    collection(db, OFTPAY_SIMULADO_ANSWERS_COLLECTION),
    where('simuladoId', '==', simuladoId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => answerFromFirestore(d.id, d.data() as Record<string, unknown>));
}

export async function listUserSimuladoAnswers(userId: string): Promise<OftpaySimuladoAnswerDoc[]> {
  const q = query(
    collection(db, OFTPAY_SIMULADO_ANSWERS_COLLECTION),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => answerFromFirestore(d.id, d.data() as Record<string, unknown>));
}

export async function finalizeSimulado(simuladoId: string, userId: string): Promise<OftpaySimuladoDoc> {
  const simulado = await getSimulado(simuladoId);
  if (!simulado) throw new Error('Simulado não encontrado.');
  if (simulado.userId !== userId) throw new Error('Acesso negado a este simulado.');
  if (simulado.status === 'finalizado') return simulado;

  const answers = await listSimuladoAnswers(simuladoId);
  const resultado = computeSimuladoResultado(simulado.questionIds, answers);
  const now = Timestamp.now();

  await updateDoc(doc(db, OFTPAY_SIMULADOS_COLLECTION, simuladoId), {
    status: 'finalizado',
    finishedAt: now,
    resultado,
    updatedAt: now,
  });

  return {
    ...simulado,
    status: 'finalizado',
    finishedAt: Date.now(),
    resultado,
  };
}

export function assertSimuladoEditable(simulado: OftpaySimuladoDoc): void {
  if (simulado.status === 'finalizado') {
    throw new Error('Simulados finalizados não podem ser editados.');
  }
}

/** Remove simulado e todas as respostas associadas. */
export async function deleteSimulado(simuladoId: string, userId: string): Promise<void> {
  const simulado = await getSimulado(simuladoId);
  if (!simulado) throw new Error('Simulado não encontrado.');
  if (simulado.userId !== userId) throw new Error('Acesso negado a este simulado.');

  const answers = await listSimuladoAnswers(simuladoId);
  const batch = writeBatch(db);

  for (const ans of answers) {
    batch.delete(doc(db, OFTPAY_SIMULADO_ANSWERS_COLLECTION, ans.id));
  }
  batch.delete(doc(db, OFTPAY_SIMULADOS_COLLECTION, simuladoId));

  await batch.commit();
}
