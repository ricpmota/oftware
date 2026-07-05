import { NextRequest, NextResponse } from 'next/server';
import { CONTRATO_TIRZEPATIDA_PLACEHOLDER_KEYS } from '@/lib/contratos/contratoTirzepatidaTemplate';
import {
  getContratoPadraoMedicoPacienteConfig,
  isContratoPadraoEditor,
  saveContratoPadraoMedicoPacienteTemplate,
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
    const config = await getContratoPadraoMedicoPacienteConfig();
    const canEdit = isContratoPadraoEditor(config, auth.uid, auth.email);
    return NextResponse.json({
      template: config.template,
      canEdit,
      placeholderKeys: CONTRATO_TIRZEPATIDA_PLACEHOLDER_KEYS,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
      currentVersionId: config.currentVersionId,
      currentVersionNumber: config.currentVersionNumber,
    });
  } catch (e) {
    console.error('[contrato-padrao GET]', e);
    return NextResponse.json({ error: 'Falha ao carregar contrato padrão.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuthToken(getBearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const config = await getContratoPadraoMedicoPacienteConfig();
    if (!isContratoPadraoEditor(config, auth.uid, auth.email)) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar o contrato padrão.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { template?: string };
    if (typeof body.template !== 'string') {
      return NextResponse.json({ error: 'Informe o texto do contrato.' }, { status: 400 });
    }

    const saved = await saveContratoPadraoMedicoPacienteTemplate({
      template: body.template,
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
    console.error('[contrato-padrao PUT]', e);
    const message = e instanceof Error ? e.message : 'Falha ao salvar contrato padrão.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
