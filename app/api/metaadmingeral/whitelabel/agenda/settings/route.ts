import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  ensureAgendaWhatsAppSettings,
  updateAgendaSettings,
} from '@/lib/whiteLabel/agendaSettingsService';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';

async function findDoctorIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getFirestoreAdmin();
  const exact = await db.collection('medicos').where('email', '==', normalized).limit(1).get();
  if (!exact.empty) return exact.docs[0].id;
  const all = await db.collection('medicos').select('email').get();
  const match = all.docs.find(
    (d) => String(d.data().email || '').trim().toLowerCase() === normalized
  );
  return match?.id || null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const settings = await ensureAgendaWhatsAppSettings();
    const senderEmail = settings.whatsappSenderDoctorEmail || settings.whatsappResponsavelEmail;
    const doctorId = await findDoctorIdByEmail(senderEmail);
    const connection = doctorId ? await getWhatsappConnectionByDoctor(doctorId) : null;

    return NextResponse.json({
      settings,
      whatsappSender: {
        email: senderEmail,
        doctorId,
        status: connection?.status || 'disconnected',
        phone: connection?.phone || null,
        profileName: connection?.profileName || null,
      },
    });
  } catch (error) {
    console.error('[API agenda/settings GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar configurações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const settings = await updateAgendaSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[API agenda/settings PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar configurações.' },
      { status: 400 }
    );
  }
}
