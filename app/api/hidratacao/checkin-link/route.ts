import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { authorizeHydrationCheckInLinkActor } from '@/lib/nutri/hidratacao/hydrationCheckInAuth.server';
import {
  createHydrationCheckInLink,
  loadCurrentHydrationCheckInLink,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink.server';
import { notifyPacienteHydrationCheckInLink } from '@/lib/nutri/hidratacao/hydrationCheckInNotify.server';
import { hydrationCheckInDefaultAllowedDates } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { classifyHydrationCheckInFulfillment } from '@/lib/nutri/hidratacao/hydrationProfessional';
import { loadHydrationRecordAdmin, loadHydrationPlanGoalMl } from '@/lib/nutri/hidratacao/hydrationPersist.server';
import { upsertHydrationCheckInDelivery } from '@/lib/nutri/hidratacao/hydrationCheckInDelivery.server';

export const runtime = 'nodejs';

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

async function registeredDatesFor(
  patientId: string,
  allowedDates: string[]
): Promise<string[]> {
  const db = getFirestoreAdmin();
  const found: string[] = [];
  for (const date of allowedDates) {
    const record = await loadHydrationRecordAdmin(db, patientId, date);
    if (record) found.push(date);
  }
  return found;
}

/**
 * GET /api/hidratacao/checkin-link?patientId=
 * Status do link do período atual. Não devolve URL nem token.
 */
export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() || '';
    const auth = await authorizeHydrationCheckInLinkActor(request, patientId);
    if (auth instanceof NextResponse) return noStore(auth);

    const allowedDates = hydrationCheckInDefaultAllowedDates();
    const link = await loadCurrentHydrationCheckInLink(getFirestoreAdmin(), patientId);
    const registeredDates = await registeredDatesFor(patientId, link?.allowedDates ?? allowedDates);
    const fulfillment = classifyHydrationCheckInFulfillment({
      hasLink: Boolean(link),
      expiresAt: link?.expiresAt ?? null,
      status: link?.status ?? null,
      allowedDates: link?.allowedDates ?? allowedDates,
      registeredDates,
    });

    return noStore(
      NextResponse.json({
        ok: true,
        allowedDates: link?.allowedDates ?? allowedDates,
        hasLink: Boolean(link),
        fulfillment,
        lastOpenedAt: link?.lastOpenedAt ? link.lastOpenedAt.toISOString() : null,
        completedAt: link?.completedAt ? link.completedAt.toISOString() : null,
        expiresAt: link?.expiresAt ? link.expiresAt.toISOString() : null,
        registeredDates,
      })
    );
  } catch (error) {
    console.error('[api/hidratacao/checkin-link GET]', error);
    return noStore(
      NextResponse.json({ error: 'Não foi possível carregar o check-in.' }, { status: 500 })
    );
  }
}

/**
 * POST /api/hidratacao/checkin-link
 * Gera (ou reutiliza) link. Body: { patientId, deliver?: 'canal_chat' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      patientId?: unknown;
      deliver?: unknown;
    } | null;
    const patientId = typeof body?.patientId === 'string' ? body.patientId.trim() : '';
    const deliver = body?.deliver === 'canal_chat' ? 'canal_chat' : null;

    const auth = await authorizeHydrationCheckInLinkActor(request, patientId);
    if (auth instanceof NextResponse) return noStore(auth);

    const created = await createHydrationCheckInLink(getFirestoreAdmin(), {
      patientId,
      createdByType: auth.createdByType,
      createdByUserId: auth.uid,
    });

    let sent: { status: 'sent' | 'skipped'; reason?: string } | null = null;
    if (deliver === 'canal_chat') {
      const registeredDates = await registeredDatesFor(patientId, created.link.allowedDates);
      const pendingCount = created.link.allowedDates.filter((d) => !registeredDates.includes(d)).length;
      const goalMl = await loadHydrationPlanGoalMl(getFirestoreAdmin(), patientId);
      const result = await notifyPacienteHydrationCheckInLink({
        patientId,
        url: created.url,
        createdByType: auth.createdByType,
        createdByUserId: auth.uid,
        goalMl,
        pendingCount,
      });
      sent = result.status === 'sent' ? { status: 'sent' } : { status: 'skipped', reason: result.reason };
      if (result.status === 'sent') {
        await upsertHydrationCheckInDelivery(getFirestoreAdmin(), {
          patientId,
          allowedDates: created.link.allowedDates,
          allowedDatesKey: created.link.allowedDatesKey,
          source: 'manual',
          status: 'sent',
          linkId: created.link.id,
          markSent: true,
        });
      }
    }

    return noStore(
      NextResponse.json({
        ok: true,
        reused: created.reused,
        url: created.url,
        expiresAt: created.link.expiresAt.toISOString(),
        allowedDates: created.link.allowedDates,
        sent,
      })
    );
  } catch (error) {
    console.error('[api/hidratacao/checkin-link POST]', error);
    return noStore(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Não foi possível gerar o link.' },
        { status: 500 }
      )
    );
  }
}
