/**
 * GET /api/chatnutri/messages?patientId=...&dateKey=YYYY-MM-DD
 * Lista mensagens do dia. Regenera signed URLs para imagens (gcsPath).
 */

import { NextRequest, NextResponse } from 'next/server';
import { listChatNutriMessages, getChatNutriDayTotals } from '@/services/chatNutriServerService';
import { getSignedUrlForGcsPath } from '@/services/chatNutriStorageService';
import type { ChatNutriMessage } from '@/lib/chatnutri/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const dateKey = searchParams.get('dateKey');

    if (!patientId || !dateKey) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'patientId e dateKey obrigatórios.' } }, { status: 400 });
    }

    const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateKeyRegex.test(dateKey)) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_DATE_KEY', message: 'dateKey deve ser YYYY-MM-DD.' } }, { status: 400 });
    }

    // GET (leitura): permite visualizar mensagens independente do status do paciente
    // para que Médico, Nutricionista e Personal possam ver o histórico de conversas
    const [rawMessages, dayTotals] = await Promise.all([
      listChatNutriMessages(patientId, dateKey),
      getChatNutriDayTotals(patientId, dateKey)
    ]);

    // Regenera signed URLs para mensagens com gcsPath (URLs antigas expiram em ~10 min)
    const messages: ChatNutriMessage[] = await Promise.all(
      rawMessages.map(async (msg) => {
        const gcsPath = msg.gcsPath ?? (msg as { gcsPath?: string }).gcsPath;
        if (gcsPath && typeof gcsPath === 'string') {
          try {
            const freshUrl = await getSignedUrlForGcsPath(gcsPath);
            return { ...msg, imageUrl: freshUrl };
          } catch (e) {
            console.warn('[chatnutri/messages] Erro ao gerar signed URL para', gcsPath, e);
          }
        }
        return msg;
      })
    );

    return NextResponse.json({ ok: true, messages, dayTotals });
  } catch (error) {
    console.error('[chatnutri/messages] Erro:', error);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } }, { status: 500 });
  }
}
