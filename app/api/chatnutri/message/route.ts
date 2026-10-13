/**
 * POST /api/chatnutri/message — mensagem humana (paciente/médico/nutri) sem Gemini.
 * DELETE /api/chatnutri/message?patientId=...&dateKey=...&messageId=... — apaga mensagem.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiErrorResponse,
  ApiHumanMessageSuccessResponse,
  ChatNutriHumanAuthorKind,
  ChatNutriInputHumanMessage,
} from '@/lib/chatnutri/types';
import { executeChatNutriHumanMessage } from '@/lib/chat/executeChatNutriHumanMessage';
import {
  getPatientStatusTratamento,
  deleteChatNutriMessage,
} from '@/services/chatNutriServerService';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ChatNutriInputHumanMessage>;
    const { patientId, dateKey, text, authorKind, authorName, authorId } = body;

    if (
      !patientId ||
      !dateKey ||
      typeof text !== 'string' ||
      !text.trim() ||
      !authorKind
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'patientId, dateKey, text e authorKind obrigatórios.',
          },
        } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const result = await executeChatNutriHumanMessage({
      patientId,
      dateKey,
      text,
      authorKind: authorKind as ChatNutriHumanAuthorKind,
      authorName: typeof authorName === 'string' ? authorName : undefined,
      authorId: typeof authorId === 'string' ? authorId : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error } as ApiErrorResponse,
        { status: result.status }
      );
    }

    const response: ApiHumanMessageSuccessResponse = {
      ok: true,
      message: result.message,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[chatnutri/message POST] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } } as ApiErrorResponse,
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const dateKey = searchParams.get('dateKey');
    const messageId = searchParams.get('messageId');

    if (!patientId || !dateKey || !messageId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'patientId, dateKey e messageId obrigatórios.' } },
        { status: 400 }
      );
    }

    const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateKeyRegex.test(dateKey)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_DATE_KEY', message: 'dateKey deve ser YYYY-MM-DD.' } },
        { status: 400 }
      );
    }

    const statusTratamento = await getPatientStatusTratamento(patientId);
    if (statusTratamento !== 'em_tratamento') {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_IN_TREATMENT', message: 'Disponível apenas para pacientes em Tratamento.' } },
        { status: 403 }
      );
    }

    const result = await deleteChatNutriMessage(patientId, dateKey, messageId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { code: 'ERROR', message: result.error } }, { status: 400 });
    }
    return NextResponse.json({ ok: true, dayTotals: result.dayTotals });
  } catch (error) {
    console.error('[chatnutri/message] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } },
      { status: 500 }
    );
  }
}
