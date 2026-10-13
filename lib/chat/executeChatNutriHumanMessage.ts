import type {
  ApiHumanMessageSuccessResponse,
  ChatNutriHumanAuthorKind,
  ChatNutriMessage,
} from '@/lib/chatnutri/types';
import { getPatientStatusTratamento, saveChatNutriMessage } from '@/services/chatNutriServerService';

export type ChatNutriHumanMessageError = {
  ok: false;
  status: number;
  error: { code: string; message: string };
};

export type ChatNutriHumanMessageSuccess = {
  ok: true;
  message: ChatNutriMessage;
};

export type ChatNutriHumanMessageResult = ChatNutriHumanMessageSuccess | ChatNutriHumanMessageError;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const AUTHOR_KINDS: ChatNutriHumanAuthorKind[] = ['patient', 'doctor', 'nutritionist'];

/**
 * Grava mensagem humana no ChatNutri sem chamar Gemini.
 */
export async function executeChatNutriHumanMessage(params: {
  patientId: string;
  dateKey: string;
  text: string;
  authorKind: ChatNutriHumanAuthorKind;
  authorName?: string;
  authorId?: string;
}): Promise<ChatNutriHumanMessageResult> {
  const { patientId, dateKey, authorKind } = params;
  const trimmed = params.text.trim();
  const authorName = params.authorName?.trim() || undefined;
  const authorId = params.authorId?.trim() || undefined;

  if (!patientId || !dateKey || !trimmed) {
    return {
      ok: false,
      status: 400,
      error: { code: 'INVALID_INPUT', message: 'patientId, dateKey e text obrigatórios.' },
    };
  }

  if (!DATE_KEY_RE.test(dateKey)) {
    return {
      ok: false,
      status: 400,
      error: { code: 'INVALID_DATE_KEY', message: 'dateKey deve ser YYYY-MM-DD.' },
    };
  }

  if (!AUTHOR_KINDS.includes(authorKind)) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'INVALID_AUTHOR',
        message: 'authorKind deve ser patient, doctor ou nutritionist.',
      },
    };
  }

  const statusTratamento = await getPatientStatusTratamento(patientId);
  if (statusTratamento !== 'em_tratamento') {
    return {
      ok: false,
      status: 403,
      error: {
        code: 'NOT_IN_TREATMENT',
        message: 'Disponível apenas para pacientes em Tratamento.',
      },
    };
  }

  const now = new Date().toISOString();
  const isProfessional = authorKind === 'doctor' || authorKind === 'nutritionist';
  const role: ChatNutriMessage['role'] = isProfessional ? 'professional' : 'user';

  const message: ApiHumanMessageSuccessResponse['message'] = {
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    role,
    type: 'chat',
    text: trimmed,
    createdAt: now,
    authorKind,
    authorName: authorName ?? null,
    authorId: authorId ?? null,
  };

  await saveChatNutriMessage(patientId, dateKey, message);

  return { ok: true, message };
}
