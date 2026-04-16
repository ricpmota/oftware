/**
 * POST /api/chatnutri/chat
 * ETAPA 2: Gemini real (reutiliza padrão app/api/chat)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ChatNutriInputText, ApiChatSuccessResponse, ApiErrorResponse } from '@/lib/chatnutri/types';
import {
  getPatientStatusTratamento,
  saveChatNutriMessage,
  listChatNutriMessages,
  getChatNutriDayTotals,
  getPatientContextForChat,
} from '@/services/chatNutriServerService';
import { chatNutriTextReply, type ChatHistoryEntry } from '@/services/chatNutriGeminiService';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ChatNutriInputText>;
    const { patientId, dateKey, type, text } = body;

    if (!patientId || !dateKey || type !== 'text' || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'patientId, dateKey, type="text" e text obrigatórios.' } } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const statusTratamento = await getPatientStatusTratamento(patientId);
    if (statusTratamento !== 'em_tratamento') {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_IN_TREATMENT', message: 'Disponível apenas para pacientes em Tratamento.' } } as ApiErrorResponse,
        { status: 403 }
      );
    }

    const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateKeyRegex.test(dateKey)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_DATE_KEY', message: 'dateKey deve ser YYYY-MM-DD.' } } as ApiErrorResponse,
        { status: 400 }
      );
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
        userText: text.trim(),
      });
    } catch (e) {
      console.error('[chatnutri/chat] Gemini error:', e);
      replyText = 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente em instantes.';
    }

    const now = new Date().toISOString();

    await saveChatNutriMessage(patientId, dateKey, {
      role: 'user',
      type: 'chat',
      text: text.trim(),
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

    const response: ApiChatSuccessResponse = {
      ok: true,
      message: assistantMsg,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[chatnutri/chat] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
