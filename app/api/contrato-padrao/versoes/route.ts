import { NextRequest, NextResponse } from 'next/server';
import {
  getContratoPadraoMedicoPacienteConfig,
  listContratoPadraoVersoes,
  verifyAuthToken,
} from '@/lib/contratos/contratoPadraoService.server';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(getBearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const versoes = await listContratoPadraoVersoes(100);
    return NextResponse.json({ versoes });
  } catch (e) {
    console.error('[contrato-padrao/versoes GET]', e);
    return NextResponse.json({ error: 'Falha ao listar versões.' }, { status: 500 });
  }
}
