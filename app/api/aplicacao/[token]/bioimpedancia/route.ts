import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  isValidAplicacaoPublicToken,
  normalizeAplicacaoPublicToken,
} from '@/lib/aplicacao/aplicacaoPublicToken';
import {
  listarBioRegistrosPaciente,
  salvarBioRegistrosPaciente,
} from '@/lib/bioImpedancia/bioRegistrosPublicos';

async function pacienteIdDoToken(tokenRaw: string): Promise<string | null> {
  const token = normalizeAplicacaoPublicToken(tokenRaw);
  if (!isValidAplicacaoPublicToken(token)) return null;
  const link = await getFirestoreAdmin().collection('aplicacao_links').doc(token).get();
  if (!link.exists) return null;
  const pacienteId = String(link.data()?.pacienteId || '').trim();
  return pacienteId || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const pacienteId = await pacienteIdDoToken((await params).token);
    if (!pacienteId) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }
    const registros = await listarBioRegistrosPaciente(pacienteId);
    return NextResponse.json({ registros });
  } catch (error) {
    console.error('Erro ao carregar bioimpedância da aplicação:', error);
    return NextResponse.json({ error: 'Erro ao carregar bioimpedância' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const pacienteId = await pacienteIdDoToken((await params).token);
    if (!pacienteId) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const registros = await salvarBioRegistrosPaciente(pacienteId, body?.registros);
    return NextResponse.json({ registros });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar bioimpedância';
    const status = /inválid|Limite/.test(message) ? 400 : 500;
    if (status === 500) console.error('Erro ao salvar bioimpedância da aplicação:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
