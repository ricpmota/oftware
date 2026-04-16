import type { ChatNutriMessage, ApiChatSuccessResponse, ApiErrorResponse } from '@/lib/chatnutri/types';
import {
  getPatientStatusTratamento,
  saveChatNutriMessage,
  listChatNutriMessages,
  getChatNutriDayTotals,
  getPatientContextForChat,
} from '@/services/chatNutriServerService';
import { chatNutriTextReply, type ChatHistoryEntry } from '@/services/chatNutriGeminiService';

export type ChatNutriTurnError = {
  ok: false;
  status: number;
  error: ApiErrorResponse['error'];
};

export type ChatNutriTurnSuccess = {
  ok: true;
  answer: string;
  message: ChatNutriMessage;
};

export type ChatNutriTurnResult = ChatNutriTurnSuccess | ChatNutriTurnError;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Um turno de texto ChatNutri: validação, Firestore, Gemini (via chatNutriTextReply), persistência.
 * Usado por /api/chatnutri/chat e por /api/chat com surface=chatnutri.
 */
export async function executeChatNutriTextTurn(params: {
  patientId: string;
  dateKey: string;
  text: string;
}): Promise<ChatNutriTurnResult> {
  const { patientId, dateKey, text } = params;
  const trimmed = text.trim();

  if (!patientId || !dateKey || !trimmed) {
    return {
      ok: false as const,
      status: 400,
      error: { code: 'INVALID_INPUT', message: 'patientId, dateKey e text obrigatórios.' },
    };
  }

  if (!DATE_KEY_RE.test(dateKey)) {
    return {
      ok: false as const,
      status: 400,
      error: { code: 'INVALID_DATE_KEY', message: 'dateKey deve ser YYYY-MM-DD.' },
    };
  }

  const statusTratamento = await getPatientStatusTratamento(patientId);
  if (statusTratamento !== 'em_tratamento') {
    return {
      ok: false as const,
      status: 403,
      error: { code: 'NOT_IN_TREATMENT', message: 'Disponível apenas para pacientes em Tratamento.' },
    };
  }

  const [messages, dayTotals, patientContext] = await Promise.all([
    listChatNutriMessages(patientId, dateKey),
    getChatNutriDayTotals(patientId, dateKey),
    getPatientContextForChat(patientId),
  ]);

  const history: ChatHistoryEntry[] = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    text: m.text,
  }));

  let replyText: string;
  try {
    replyText = await chatNutriTextReply({
      history,
      dayTotals,
      patientContext,
      userText: trimmed,
    });
  } catch (e) {
    console.error('[executeChatNutriTextTurn] Gemini error:', e);
    replyText = 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente em instantes.';
  }

  const now = new Date().toISOString();

  await saveChatNutriMessage(patientId, dateKey, {
    role: 'user',
    type: 'chat',
    text: trimmed,
    createdAt: now,
  });

  const assistantMsg: ApiChatSuccessResponse['message'] = {
    id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    role: 'assistant',
    type: 'chat',
    text: replyText,
    createdAt: now,
  };

  await saveChatNutriMessage(patientId, dateKey, { ...assistantMsg, createdAt: now });

  return { ok: true, answer: replyText, message: assistantMsg };
}
