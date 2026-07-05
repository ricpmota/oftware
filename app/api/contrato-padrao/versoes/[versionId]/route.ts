import { NextRequest, NextResponse } from 'next/server';
import {
  getContratoPadraoMedicoPacienteConfig,
  getContratoPadraoVersao,
  isContratoPadraoEditor,
  restaurarContratoPadraoVersao,
  verifyAuthToken,
} from '@/lib/contratos/contratoPadraoService.server';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

type RouteContext = { params: Promise<{ versionId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await verifyAuthToken(getBearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { versionId } = await context.params;
    const versao = await getContratoPadraoVersao(versionId);
    if (!versao) {
      return NextResponse.json({ error: 'Versão não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ versao });
  } catch (e) {
    console.error('[contrato-padrao/versoes/[versionId] GET]', e);
    return NextResponse.json({ error: 'Falha ao carregar versão.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await verifyAuthToken(getBearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const config = await getContratoPadraoMedicoPacienteConfig();
    if (!isContratoPadraoEditor(config, auth.uid, auth.email)) {
      return NextResponse.json(
        { error: 'Você não tem permissão para restaurar versões.' },
        { status: 403 }
      );
    }

    const { versionId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action && body.action !== 'restaurar') {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const saved = await restaurarContratoPadraoVersao({
      versionId,
      updatedBy: {
        uid: auth.uid,
        email: auth.email,
        displayName: auth.displayName,
      },
    });

    return NextResponse.json({
      ok: true,
      template: saved.template,
      updatedAt: saved.updatedAt,
      updatedBy: saved.updatedBy,
      currentVersionId: saved.currentVersionId,
      currentVersionNumber: saved.currentVersionNumber,
    });
  } catch (e) {
    console.error('[contrato-padrao/versoes/[versionId] POST]', e);
    const message = e instanceof Error ? e.message : 'Falha ao restaurar versão.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
