import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  OFTPAY_QUESTION_ATTEMPTS_COLLECTION,
  type OftpayQuestionAttemptDoc,
} from '@/types/oftpayQuestionAttempts';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';

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

function fromFirestore(id: string, data: Record<string, unknown>): OftpayQuestionAttemptDoc {
  return {
    id,
    userId: String(data.userId ?? ''),
    userEmail: data.userEmail != null ? String(data.userEmail) : undefined,
    questionId: String(data.questionId ?? ''),
    acertou: Boolean(data.acertou),
    respostaSelecionada: String(data.respostaSelecionada ?? ''),
    respostaCorreta: String(data.respostaCorreta ?? ''),
    courseId: 'oftreview',
    apostilaTitulo: data.apostilaTitulo != null ? String(data.apostilaTitulo) : undefined,
    knowledgeMapId: data.knowledgeMapId != null ? String(data.knowledgeMapId) : undefined,
    capituloTitulo: data.capituloTitulo != null ? String(data.capituloTitulo) : undefined,
    tema: data.tema != null ? String(data.tema) : undefined,
    subtema: data.subtema != null ? String(data.subtema) : undefined,
    dificuldade: data.dificuldade != null ? String(data.dificuldade) : undefined,
    respondedAt: timestampToMillis(data.respondedAt),
  };
}

/** Nova tentativa a cada resposta — nunca sobrescreve histórico. */
export async function recordQuestionAttempt(params: {
  userId: string;
  userEmail?: string | null;
  questao: OftpayQuestaoDoc;
  respostaSelecionada: string;
  respostaCorreta: string;
  acertou: boolean;
}): Promise<string> {
  const { questao, userId, userEmail } = params;

  const payload: Record<string, unknown> = {
    userId,
    questionId: questao.id,
    acertou: params.acertou,
    respostaSelecionada: params.respostaSelecionada,
    respostaCorreta: params.respostaCorreta,
    courseId: 'oftreview',
    respondedAt: Timestamp.now(),
  };

  if (userEmail?.trim()) payload.userEmail = userEmail.trim();
  if (questao.fonte?.apostilaTitulo?.trim()) {
    payload.apostilaTitulo = questao.fonte.apostilaTitulo.trim();
  }
  if (questao.knowledgeMapId?.trim()) payload.knowledgeMapId = questao.knowledgeMapId.trim();
  if (questao.capituloTitulo?.trim()) payload.capituloTitulo = questao.capituloTitulo.trim();
  if (questao.tema?.trim()) payload.tema = questao.tema.trim();
  if (questao.subtema?.trim()) payload.subtema = questao.subtema.trim();
  if (questao.dificuldade) payload.dificuldade = questao.dificuldade;

  const ref = await addDoc(collection(db, OFTPAY_QUESTION_ATTEMPTS_COLLECTION), payload);
  return ref.id;
}

/** Lista todas as tentativas do usuário (sem orderBy no Firestore — sort no client). */
export async function listUserAttempts(userId: string): Promise<OftpayQuestionAttemptDoc[]> {
  const q = query(
    collection(db, OFTPAY_QUESTION_ATTEMPTS_COLLECTION),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
  return items.sort((a, b) => (b.respondedAt ?? 0) - (a.respondedAt ?? 0));
}
