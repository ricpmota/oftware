import { NextRequest, NextResponse } from 'next/server';
import { loadPersonalConsultaLinkByToken } from '@/lib/personal/agenda/consultaLinkService';
import {
  completeAvaliacaoTreinoPublic,
  loadAvaliacaoTreinoPublic,
  saveAvaliacaoTreinoStepPublic,
  startAvaliacaoTreinoPublic,
} from '@/lib/personal/agenda/avaliacaoTreinoPublicService';
import { isValidPublicLinkToken, normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import type {
  AvaliacaoAtividadeFisicaBasicAnswers,
  AvaliacaoAtividadeFisicaSafety,
} from '@/types/avaliacaoAtividadeFisica';

type Body =
  | { action: 'start' }
  | {
      action: 'step';
      stepId?: string;
      partialAnswers?: Partial<AvaliacaoAtividadeFisicaBasicAnswers>;
      progressPercent?: number;
      nextStepId?: string;
      safety?: AvaliacaoAtividadeFisicaSafety | null;
    }
  | { action: 'complete'; answers?: AvaliacaoAtividadeFisicaBasicAnswers };

async function resolveLink(params: Promise<{ token: string }>) {
  const token = normalizePublicLinkToken((await params).token);
  if (!isValidPublicLinkToken(token)) return null;
  const link = await loadPersonalConsultaLinkByToken(token);
  if (!link || link.status === 'revoked') return null;
  return link;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const link = await resolveLink(params);
    if (!link) return NextResponse.json({ error: 'Este link não é válido.' }, { status: 404 });
    const avaliacao = await loadAvaliacaoTreinoPublic(link.pacienteId);
    return NextResponse.json({ avaliacao });
  } catch (error) {
    console.error('[consulta-personal/anamnese GET]', error);
    return NextResponse.json({ error: 'Erro ao carregar a anamnese.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const link = await resolveLink(params);
    if (!link) return NextResponse.json({ error: 'Este link não é válido.' }, { status: 404 });

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }

    if (body.action === 'start') {
      await startAvaliacaoTreinoPublic(link.pacienteId);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'step') {
      const stepId = typeof body.stepId === 'string' ? body.stepId.trim() : '';
      if (!stepId) return NextResponse.json({ error: 'Etapa inválida.' }, { status: 400 });
      await saveAvaliacaoTreinoStepPublic({
        pacienteId: link.pacienteId,
        stepId,
        partialAnswers: isPlainObject(body.partialAnswers) ? body.partialAnswers : {},
        progressPercent:
          typeof body.progressPercent === 'number'
            ? Math.max(0, Math.min(100, Math.round(body.progressPercent)))
            : 0,
        nextStepId: typeof body.nextStepId === 'string' ? body.nextStepId : stepId,
        safety: isPlainObject(body.safety) ? (body.safety as AvaliacaoAtividadeFisicaSafety) : null,
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'complete') {
      await completeAvaliacaoTreinoPublic({
        pacienteId: link.pacienteId,
        answers: isPlainObject(body.answers) ? body.answers : {},
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    console.error('[consulta-personal/anamnese POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar a anamnese.' },
      { status: 400 }
    );
  }
}
