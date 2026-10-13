import { after, NextRequest, NextResponse } from 'next/server';
import { resolveConclusaoFotoContext } from '@/lib/conclusao/resolveConclusaoFotoContext';
import { scheduleBodyScanGeneration } from '@/lib/bodyscan/tryGenerateBodyScan';
import {
  createProgressPhoto,
  deleteProgressPhoto,
  listProgressPhotos,
  ProgressPhotoError,
  readSharePreference,
  type TipoFotoProgresso,
} from '@/lib/progresso/progressPhotosPublicStore';

function parseBool(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'true';
}

function jsonError(error: unknown, fallback: string) {
  if (error instanceof ProgressPhotoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json(
    { error: fallback, details: error instanceof Error ? error.message : String(error) },
    { status: 500 }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });

    const fotos = await listProgressPhotos(ctx.pacienteId);
    const fotosDaAplicacao = fotos.filter((f) => f.applicationId === ctx.applicationId);
    const compartilharComMedico = await readSharePreference(
      ctx.pacienteId,
      ctx.applicationId,
      fotosDaAplicacao
    );

    return NextResponse.json({
      applicationId: ctx.applicationId,
      compartilharComMedico,
      fotos,
    });
  } catch (error) {
    return jsonError(error, 'Erro ao carregar fotos de progresso');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const tipoRaw = String(formData.get('tipo') || '').trim().toLowerCase();
    const tipo: TipoFotoProgresso | null =
      tipoRaw === 'frontal' || tipoRaw === 'perfil' ? tipoRaw : null;
    const compartilharRaw = formData.get('compartilharComMedico');
    const compartilharComMedico = compartilharRaw == null ? true : parseBool(compartilharRaw);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de foto inválido' }, { status: 400 });
    }

    const foto = await createProgressPhoto(
      {
        pacienteId: ctx.pacienteId,
        applicationId: ctx.applicationId,
        semana: ctx.semana,
        dataAplicacao: ctx.dataAplicacao,
        origem: 'conclusao_tratamento',
      },
      file,
      tipo,
      compartilharComMedico
    );

    if (ctx.semana != null && ctx.semana > 0) {
      after(() => {
        scheduleBodyScanGeneration({
          patientId: ctx.pacienteId,
          week: ctx.semana as number,
          date: ctx.dataAplicacao || undefined,
        });
      });
    }

    return NextResponse.json({ foto });
  } catch (error) {
    return jsonError(error, 'Erro ao salvar foto de progresso');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });

    let photoId = String(request.nextUrl.searchParams.get('photoId') || '').trim();
    if (!photoId) {
      try {
        const body = (await request.json()) as { photoId?: string };
        photoId = String(body?.photoId || '').trim();
      } catch {
        photoId = '';
      }
    }

    await deleteProgressPhoto(
      {
        pacienteId: ctx.pacienteId,
        applicationId: ctx.applicationId,
        semana: ctx.semana,
        dataAplicacao: ctx.dataAplicacao,
        origem: 'conclusao_tratamento',
      },
      photoId
    );

    return NextResponse.json({ success: true, photoId });
  } catch (error) {
    return jsonError(error, 'Erro ao excluir foto de progresso');
  }
}
