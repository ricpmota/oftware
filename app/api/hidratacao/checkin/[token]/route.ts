import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  loadHydrationPatientFirstName,
  markHydrationCheckInCompleted,
  markHydrationCheckInOpened,
  resolveHydrationCheckInLink,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink.server';
import {
  HYDRATION_CHECKIN_EXPIRED_COPY,
  HYDRATION_CHECKIN_UNAVAILABLE_COPY,
} from '@/lib/nutri/hidratacao/hydrationCheckInCopy';
import { hydrationCheckInQuickAmounts } from '@/lib/nutri/hidratacao/hydrationCheckInAmounts';
import {
  formatHydrationHistoryDate,
  formatHydrationWeekday,
  parseHydrationDailyTotalInput,
} from '@/lib/nutri/hidratacao/hydrationMath';
import {
  loadHydrationPlanGoalMl,
  loadHydrationRecordAdmin,
  persistHydrationAdmin,
} from '@/lib/nutri/hidratacao/hydrationPersist.server';
import { isHydrationCheckInDateAllowed } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import {
  hydrationCheckInClientKey,
  hydrationCheckInRateLimited,
} from '@/lib/nutri/hidratacao/hydrationCheckInRateLimit';
import { getMedicoWhiteLabelByPacienteId } from '@/lib/server/medicoWhiteLabelLookup.server';

export const runtime = 'nodejs';

function publicErrorResponse(kind: 'expired' | 'unavailable') {
  const copy = kind === 'expired' ? HYDRATION_CHECKIN_EXPIRED_COPY : HYDRATION_CHECKIN_UNAVAILABLE_COPY;
  const res = NextResponse.json(
    { valid: false, error: kind, title: copy.title, message: copy.body },
    { status: kind === 'expired' ? 410 : 404 }
  );
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

function rateLimitOrNull(request: NextRequest, token: string) {
  const ip = hydrationCheckInClientKey(request);
  if (hydrationCheckInRateLimited(ip, token)) {
    return publicErrorResponse('unavailable');
  }
  return null;
}

async function publicDaysForLink(
  db: ReturnType<typeof getFirestoreAdmin>,
  patientId: string,
  allowedDates: string[],
  currentGoalMl: number
) {
  const days = [];
  for (const date of allowedDates) {
    const record = await loadHydrationRecordAdmin(db, patientId, date);
    const goalMl = record?.goalMl && record.goalMl > 0 ? record.goalMl : currentGoalMl;
    days.push({
      date,
      weekdayLabel: formatHydrationWeekday(date).toLocaleUpperCase('pt-BR'),
      historyLabel: formatHydrationHistoryDate(date),
      goalMl,
      consumedMl: record ? record.consumedMl : null,
      registered: record != null,
      percentage: record ? record.percentage : null,
      goalReached: record ? record.goalReached : false,
      suggestions: hydrationCheckInQuickAmounts(goalMl),
    });
  }
  return days;
}

/**
 * GET /api/hidratacao/checkin/[token]
 * Token é a credencial. Não exige login. Não devolve patientId nem dados clínicos.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    const limited = rateLimitOrNull(request, token);
    if (limited) return limited;
    const db = getFirestoreAdmin();
    const resolved = await resolveHydrationCheckInLink(db, token);
    if (!resolved.ok) return publicErrorResponse(resolved.error);

    const { link } = resolved;
    await markHydrationCheckInOpened(db, link.tokenHash, Boolean(link.openedAt));

    const currentGoalMl = await loadHydrationPlanGoalMl(db, link.patientId);
    const firstName = await loadHydrationPatientFirstName(db, link.patientId);
    const days = await publicDaysForLink(db, link.patientId, link.allowedDates, currentGoalMl);
    const allRegistered = days.length > 0 && days.every((d) => d.registered);
    const whiteLabel = await getMedicoWhiteLabelByPacienteId(link.patientId);

    const res = NextResponse.json({
      valid: true,
      firstName: firstName || null,
      currentGoalMl,
      allRegistered,
      days,
      ...(whiteLabel ? { whiteLabel } : {}),
    });
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'no-referrer');
    return res;
  } catch (error) {
    console.error('[api/hidratacao/checkin GET]', error);
    return publicErrorResponse('unavailable');
  }
}

/**
 * POST /api/hidratacao/checkin/[token]
 * Body: { records: [{ date, consumedMl }] }
 * Identidade e meta vêm só do token + plano no servidor.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    const limited = rateLimitOrNull(request, token);
    if (limited) return limited;
    const db = getFirestoreAdmin();
    const resolved = await resolveHydrationCheckInLink(db, token);
    if (!resolved.ok) return publicErrorResponse(resolved.error);

    const { link } = resolved;
    const body = (await request.json().catch(() => null)) as {
      records?: unknown;
      date?: unknown;
      consumedMl?: unknown;
      patientId?: unknown;
      goalMl?: unknown;
    } | null;

    if (!Array.isArray(body?.records) || body.records.length === 0) {
      return NextResponse.json({ error: 'Informe os registros de hidratação.' }, { status: 400 });
    }
    if (body.records.length > link.allowedDates.length) {
      return NextResponse.json({ error: 'Não foi possível salvar este registro.' }, { status: 400 });
    }

    const parsed: Array<{ date: string; consumedMl: number }> = [];
    const seen = new Set<string>();
    for (const raw of body.records) {
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: 'Não foi possível salvar este registro.' }, { status: 400 });
      }
      const row = raw as { date?: unknown; consumedMl?: unknown };
      const date = typeof row.date === 'string' ? row.date.trim() : '';
      if (!isHydrationCheckInDateAllowed(date, link.allowedDates) || seen.has(date)) {
        return NextResponse.json({ error: 'Não foi possível salvar este registro.' }, { status: 400 });
      }
      seen.add(date);
      const consumed = parseHydrationDailyTotalInput(String(Math.round(Number(row.consumedMl))));
      if (!consumed.ok) {
        return NextResponse.json({ error: 'Consumo inválido.' }, { status: 400 });
      }
      parsed.push({ date, consumedMl: consumed.ml });
    }

    const saved = [];
    for (const row of parsed) {
      const result = await persistHydrationAdmin({
        db,
        actor: {
          kind: 'whatsapp_checkin',
          patientId: link.patientId,
          allowedDates: link.allowedDates,
        },
        date: row.date,
        intent: { kind: 'set', consumedMl: row.consumedMl },
      });
      saved.push({
        date: result.record.date,
        weekdayLabel: formatHydrationWeekday(result.record.date),
        historyLabel: formatHydrationHistoryDate(result.record.date),
        goalMl: result.record.goalMl,
        consumedMl: result.record.consumedMl,
        percentage: result.record.percentage,
        goalReached: result.record.goalReached,
        registered: true,
      });
    }

    void import('@/lib/nutri/hidratacao/hydrationAdherence.server')
      .then((mod) => mod.reevaluateHydrationAdherenceForPatient(db, link.patientId))
      .catch((error) => {
        console.error('[api/hidratacao/checkin] adesao', error instanceof Error ? error.message : 'erro');
      });

    const currentGoalMl = await loadHydrationPlanGoalMl(db, link.patientId);
    const days = await publicDaysForLink(db, link.patientId, link.allowedDates, currentGoalMl);
    if (days.length > 0 && days.every((d) => d.registered) && !link.completedAt) {
      await markHydrationCheckInCompleted(db, link.tokenHash);
    }

    return NextResponse.json({
      ok: true,
      days,
      saved,
      allRegistered: days.length > 0 && days.every((d) => d.registered),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível salvar o registro.';
    const status = /autorizada|inválid|meta diária|ultrapassa/i.test(message) ? 400 : 500;
    if (status === 500) console.error('[api/hidratacao/checkin POST]', error);
    return NextResponse.json(
      { error: status === 400 ? 'Não foi possível salvar este registro.' : message },
      { status }
    );
  }
}
