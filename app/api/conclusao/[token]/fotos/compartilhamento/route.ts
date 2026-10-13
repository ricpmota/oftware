import { NextRequest, NextResponse } from 'next/server';
import { resolveConclusaoFotoContext } from '@/lib/conclusao/resolveConclusaoFotoContext';
import {
  ProgressPhotoError,
  setProgressPhotoShare,
} from '@/lib/progresso/progressPhotosPublicStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });

    const body = await request.json();
    const compartilharComMedico = Boolean(body?.compartilharComMedico);
    await setProgressPhotoShare(
      {
        pacienteId: ctx.pacienteId,
        applicationId: ctx.applicationId,
        semana: ctx.semana,
        dataAplicacao: ctx.dataAplicacao,
        origem: 'conclusao_tratamento',
      },
      compartilharComMedico
    );
    return NextResponse.json({ success: true, compartilharComMedico });
  } catch (error) {
    if (error instanceof ProgressPhotoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao atualizar compartilhamento de fotos da conclusão:', error);
    return NextResponse.json({ error: 'Erro ao atualizar compartilhamento' }, { status: 500 });
  }
}
