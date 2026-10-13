/**
 * GET /api/chatnutri/days?patientId=...
 * Lista datas (YYYY-MM-DD) com registros de conversa / foto no ChatNutri.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listChatNutriDayKeys } from '@/services/chatNutriServerService';

export async function GET(req: NextRequest) {
  try {
    const patientId = new URL(req.url).searchParams.get('patientId');

    if (!patientId?.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'patientId obrigatório.' } },
        { status: 400 }
      );
    }

    const days = await listChatNutriDayKeys(patientId.trim());
    return NextResponse.json({ ok: true, days });
  } catch (error) {
    console.error('[chatnutri/days] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } },
      { status: 500 }
    );
  }
}
