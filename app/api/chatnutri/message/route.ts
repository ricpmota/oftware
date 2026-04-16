/**
 * DELETE /api/chatnutri/message?patientId=...&dateKey=YYYY-MM-DD&messageId=...
 * Apaga uma mensagem (e par relacionado em refeição). Atualiza dayTotals e usage.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPatientStatusTratamento,
  deleteChatNutriMessage,
} from '@/services/chatNutriServerService';

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
