import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { requirePacienteOrLinkedPersonal } from '@/lib/server/requirePacienteOrLinkedPersonal';
import {
  loadAvaliacaoTreinoProfessional,
  reviseAvaliacaoTreinoProfessional,
  saveAvaliacaoTreinoProfessionalStep,
  startAvaliacaoTreinoPublic,
} from '@/lib/personal/agenda/avaliacaoTreinoPublicService';
import type {
  AvaliacaoAtividadeFisicaBasicAnswers,
  AvaliacaoAtividadeFisicaSafety,
} from '@/types/avaliacaoAtividadeFisica';

type Body =
  | { action: 'start'; pacienteId?: string }
  | {
      action: 'step';
      pacienteId?: string;
      stepId?: string;
      partialAnswers?: Partial<AvaliacaoAtividadeFisicaBasicAnswers>;
      progressPercent?: number;
      nextStepId?: string;
      safety?: AvaliacaoAtividadeFisicaSafety | null;
    }
  | { action: 'complete'; pacienteId?: string; answers?: AvaliacaoAtividadeFisicaBasicAnswers };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function authorize(request: NextRequest, pacienteId: string) {
  const personal = await requirePacienteOrLinkedPersonal(request, pacienteId);
  if (!(personal instanceof NextResponse)) return null;
  if (personal.status === 401 || personal.status === 400 || personal.status === 404) return personal;
  const medico = await requireMedicoPacienteMetaadmin(request, pacienteId);
  if (!medico.ok) return medico.res;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const pacienteId = String(request.nextUrl.searchParams.get('pacienteId') || '').trim();
    if (!pacienteId) {
      return NextResponse.json({ error: 'Paciente inválido.' }, { status: 400 });
    }
    const denied = await authorize(request, pacienteId);
    if (denied) return denied;
    const avaliacao = await loadAvaliacaoTreinoProfessional(pacienteId);
    return NextResponse.json({ avaliacao });
  } catch (error) {
    console.error('[meta/personal/anamnese GET]', error);
    return NextResponse.json({ error: 'Erro ao carregar a anamnese.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const pacienteId = String(body?.pacienteId || '').trim();
    if (!pacienteId) {
      return NextResponse.json({ error: 'Paciente inválido.' }, { status: 400 });
    }
    const denied = await authorize(request, pacienteId);
    if (denied) return denied;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }

    if (body.action === 'start') {
      await startAvaliacaoTreinoPublic(pacienteId);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'step') {
      const stepId = typeof body.stepId === 'string' ? body.stepId.trim() : '';
      if (!stepId) return NextResponse.json({ error: 'Etapa inválida.' }, { status: 400 });
      await saveAvaliacaoTreinoProfessionalStep({
        pacienteId,
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
      await reviseAvaliacaoTreinoProfessional({
        pacienteId,
        answers: isPlainObject(body.answers) ? body.answers : {},
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    console.error('[meta/personal/anamnese POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar a anamnese.' },
      { status: 400 }
    );
  }
}
