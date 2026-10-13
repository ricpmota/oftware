/**
 * POST /api/chatnutri/chat
 * Analisar com IA: texto → Gemini → resposta do assistente.
 * Mensagens humanas comuns usam POST /api/chatnutri/message (sem Gemini).
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  ChatNutriInputText,
  ApiChatSuccessResponse,
  ApiErrorResponse,
  ChatNutriHumanAuthorKind,
} from '@/lib/chatnutri/types';
import { executeChatNutriTextTurn } from '@/lib/chat/executeChatNutriTextTurn';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ChatNutriInputText>;
    const { patientId, dateKey, type, text, authorKind, authorName, authorId } = body;

    if (!patientId || !dateKey || type !== 'text' || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'patientId, dateKey, type="text" e text obrigatórios.',
          },
        } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const result = await executeChatNutriTextTurn({
      patientId,
      dateKey,
      text: text.trim(),
      authorKind: (authorKind as ChatNutriHumanAuthorKind | undefined) ?? 'patient',
      authorName: typeof authorName === 'string' ? authorName : undefined,
      authorId: typeof authorId === 'string' ? authorId : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error } as ApiErrorResponse,
        { status: result.status }
      );
    }

    const response: ApiChatSuccessResponse = {
      ok: true,
      message: result.message,
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
