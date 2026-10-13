import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { authorizeHydrationCheckInLinkActor } from '@/lib/nutri/hidratacao/hydrationCheckInAuth.server';
import { parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import {
  buildHydrationCheckInSettingsPreview,
  loadHydrationCheckInReminderSettingsAdmin,
  saveHydrationCheckInReminderSettingsAdmin,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings.server';

export const runtime = 'nodejs';

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

function serializeSettings(
  settings: Awaited<ReturnType<typeof loadHydrationCheckInReminderSettingsAdmin>>,
  preview: Awaited<ReturnType<typeof buildHydrationCheckInSettingsPreview>>
) {
  return {
    ok: true as const,
    enabled: settings.enabled,
    time: settings.time,
    timezone: settings.timezone,
    configured: settings.configured,
    updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
    allowedDates: preview.allowedDates,
    pendingCount: preview.pendingCount,
    alreadySentThisCycle: preview.alreadySentThisCycle,
    nextSend: preview.nextSend,
  };
}

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() || '';
    const auth = await authorizeHydrationCheckInLinkActor(request, patientId);
    if (auth instanceof NextResponse) return noStore(auth);

    const db = getFirestoreAdmin();
    const settings = await loadHydrationCheckInReminderSettingsAdmin(db, patientId);
    const preview = await buildHydrationCheckInSettingsPreview(db, patientId, settings);
    return noStore(NextResponse.json(serializeSettings(settings, preview)));
  } catch (error) {
    console.error('[api/hidratacao/automation-settings GET]', error);
    return noStore(
      NextResponse.json({ error: 'Não foi possível carregar a configuração.' }, { status: 500 })
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      patientId?: unknown;
      enabled?: unknown;
      time?: unknown;
    } | null;
    const patientId = typeof body?.patientId === 'string' ? body.patientId.trim() : '';
    const auth = await authorizeHydrationCheckInLinkActor(request, patientId);
    if (auth instanceof NextResponse) return noStore(auth);

    if (typeof body?.enabled !== 'boolean') {
      return noStore(NextResponse.json({ error: 'Informe se o lembrete está ativo.' }, { status: 400 }));
    }
    const time = parseHorarioBrasil(typeof body?.time === 'string' ? body.time : '');
    if (!time) {
      return noStore(NextResponse.json({ error: 'Horário inválido. Use HH:mm.' }, { status: 400 }));
    }

    const db = getFirestoreAdmin();
    const settings = await saveHydrationCheckInReminderSettingsAdmin(db, {
      patientId,
      enabled: body.enabled,
      time,
      updatedByUserId: auth.uid,
      updatedByType: auth.createdByType === 'nutritionist' ? 'nutritionist' : 'doctor',
    });
    const preview = await buildHydrationCheckInSettingsPreview(db, patientId, settings);
    return noStore(NextResponse.json(serializeSettings(settings, preview)));
  } catch (error) {
    console.error('[api/hidratacao/automation-settings POST]', error);
    return noStore(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Não foi possível salvar a configuração.' },
        { status: 500 }
      )
    );
  }
}
