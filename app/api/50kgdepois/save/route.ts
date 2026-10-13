import { NextRequest, NextResponse } from 'next/server';
import {
  requireCinquentaKgDepoisAuth,
  resolveParticipantId,
} from '@/lib/50kgdepois/apiAuth.server';
import type { CinquentaKgDepoisPhase } from '@/types/cinquentaKgDepois';
import {
  acceptCinquentaKgDepoisConsent,
  saveCinquentaKgDepoisAnswers,
  saveCinquentaKgDepoisMemories,
} from '@/services/cinquentaKgDepoisService';

type SaveBody = {
  action?: 'answers' | 'consent' | 'memories';
  answers?: Array<{ questionId: string; answer: string; skipped?: boolean }>;
  memories?: Array<{
    id?: string;
    title?: string;
    text: string;
    approxDate?: string;
    lifePhase?: string;
  }>;
  currentChapterIndex?: number;
  currentPhase?: CinquentaKgDepoisPhase;
  skippedQuestionIds?: string[];
  markCompleted?: boolean;
  consentVersion?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCinquentaKgDepoisAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = (await request.json().catch(() => null)) as SaveBody | null;
    if (!body?.action) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const participantId = resolveParticipantId(request);

    if (body.action === 'consent') {
      const participant = await acceptCinquentaKgDepoisConsent({
        participantId,
        consentVersion: body.consentVersion,
      });
      return NextResponse.json({ success: true, participant });
    }

    if (body.action === 'memories') {
      if (!Array.isArray(body.memories)) {
        return NextResponse.json({ error: 'Memórias inválidas.' }, { status: 400 });
      }
      const session = await saveCinquentaKgDepoisMemories({
        participantId,
        memories: body.memories,
        currentPhase: body.currentPhase,
        markCompleted: body.markCompleted,
      });
      return NextResponse.json({ success: true, session });
    }

    if (!Array.isArray(body.answers)) {
      return NextResponse.json({ error: 'Respostas inválidas.' }, { status: 400 });
    }

    const session = await saveCinquentaKgDepoisAnswers({
      participantId,
      answers: body.answers,
      currentChapterIndex: body.currentChapterIndex,
      currentPhase: body.currentPhase,
      skippedQuestionIds: body.skippedQuestionIds,
      markCompleted: body.markCompleted,
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('[API 50kgdepois/save] POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar.' },
      { status: 500 }
    );
  }
}
