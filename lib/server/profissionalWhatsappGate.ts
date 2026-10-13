import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import {
  resolveWhatsappOwnerForProfessional,
  type WhatsappOwnerResolution,
  type WhatsappProfessionalRole,
} from '@/lib/server/whatsappProfessionalOwner.server';

async function requireProfessionalWhatsapp(
  request: NextRequest,
  role: WhatsappProfessionalRole,
): Promise<{ ok: true; owner: WhatsappOwnerResolution } | { ok: false; res: NextResponse }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 }),
    };
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Token inválido ou expirado.' }, { status: 401 }),
    };
  }

  const owner = await resolveWhatsappOwnerForProfessional(uid, role);
  if (!owner) {
    const label = role === 'nutricionista' ? 'nutricionistas' : 'personais trainers';
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, error: `Apenas ${label} cadastrados podem usar este recurso.` },
        { status: 403 },
      ),
    };
  }

  return { ok: true, owner };
}

export async function requireNutricionistaWhatsapp(request: NextRequest) {
  return requireProfessionalWhatsapp(request, 'nutricionista');
}

export async function requirePersonalTrainerWhatsapp(request: NextRequest) {
  return requireProfessionalWhatsapp(request, 'personal_trainer');
}
