import { NextRequest, NextResponse } from 'next/server';
import { isMetaAdminGeralEmail } from '@/lib/meta/anamneseInteligenteGate';
import {
  getContratoPadraoMedicoPacienteConfig,
  saveContratoPadraoMedicoPacienteEditors,
  verifyAuthToken,
} from '@/lib/contratos/contratoPadraoService.server';
import type { ContratoPadraoEditor } from '@/lib/contratos/contratoPadraoTypes';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

async function requireMetaAdminGeral(request: NextRequest) {
  const auth = await verifyAuthToken(getBearerToken(request));
  if (!auth.ok) {
    return { ok: false as const, res: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  }
  if (!isMetaAdminGeralEmail(auth.email)) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: 'Acesso negado. Apenas MetaAdminGeral.' }, { status: 403 }),
    };
  }
  return { ok: true as const, auth };
}

function parseEditors(raw: unknown): ContratoPadraoEditor[] | null {
  if (!Array.isArray(raw)) return null;
  const editors: ContratoPadraoEditor[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const uid = typeof o.uid === 'string' ? o.uid.trim() : '';
    const email = typeof o.email === 'string' ? o.email.trim() : '';
    if (!uid || !email) continue;
    editors.push({
      uid,
      email,
      displayName: typeof o.displayName === 'string' ? o.displayName.trim() : email,
    });
  }
  return editors;
}

export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;

  try {
    const config = await getContratoPadraoMedicoPacienteConfig();
    return NextResponse.json({
      editors: config.editors,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
      templateLength: config.template.length,
    });
  } catch (e) {
    console.error('[metaadmingeral/contratos/medico-paciente GET]', e);
    return NextResponse.json({ error: 'Falha ao carregar configuração.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;

  try {
    const body = (await request.json()) as { editors?: unknown };
    const editors = parseEditors(body.editors);
    if (!editors) {
      return NextResponse.json({ error: 'Lista de editores inválida.' }, { status: 400 });
    }

    const saved = await saveContratoPadraoMedicoPacienteEditors(editors);
    return NextResponse.json({
      ok: true,
      editors: saved.editors,
      updatedAt: saved.updatedAt,
    });
  } catch (e) {
    console.error('[metaadmingeral/contratos/medico-paciente PUT]', e);
    return NextResponse.json({ error: 'Falha ao salvar editores.' }, { status: 500 });
  }
}
