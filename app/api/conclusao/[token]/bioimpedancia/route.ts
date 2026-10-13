import { NextRequest, NextResponse } from 'next/server';
import { resolveConclusaoFotoContext } from '@/lib/conclusao/resolveConclusaoFotoContext';
import {
  listarBioRegistrosPaciente,
  salvarBioRegistrosPaciente,
} from '@/lib/bioImpedancia/bioRegistrosPublicos';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    const registros = await listarBioRegistrosPaciente(ctx.pacienteId);
    return NextResponse.json({ registros });
  } catch (error) {
    console.error('Erro ao carregar bioimpedância da conclusão:', error);
    return NextResponse.json({ error: 'Erro ao carregar bioimpedância' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const registros = await salvarBioRegistrosPaciente(ctx.pacienteId, body?.registros);
    return NextResponse.json({ registros });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar bioimpedância';
    const status = /inválid|Limite/.test(message) ? 400 : 500;
    if (status === 500) console.error('Erro ao salvar bioimpedância da conclusão:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
