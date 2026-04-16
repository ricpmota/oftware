/**
 * DELETE /api/chatnutri/day?patientId=...&dateKey=YYYY-MM-DD
 * Apaga todas as mensagens do dia e zera contagem e dayTotals
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPatientStatusTratamento,
  clearChatNutriDay,
} from '@/services/chatNutriServerService';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const dateKey = searchParams.get('dateKey');

    if (!patientId || !dateKey) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'patientId e dateKey obrigatórios.' } },
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

    await clearChatNutriDay(patientId, dateKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[chatnutri/day] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } },
      { status: 500 }
    );
  }
}
