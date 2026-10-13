import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  HYDRATION_CHECKIN_SEND_HHMM,
  HYDRATION_CHECKIN_TIMEZONE,
} from '@/lib/nutri/hidratacao/hydrationCheckInAutomation';
import { runHydrationCheckInAutomationJob } from '@/lib/nutri/hidratacao/hydrationCheckInAutomation.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function handle(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    const result = await runHydrationCheckInAutomationJob(getFirestoreAdmin());
    return NextResponse.json({
      ok: true,
      timezone: HYDRATION_CHECKIN_TIMEZONE,
      sendHhmmFallback: HYDRATION_CHECKIN_SEND_HHMM,
      ...result,
    });
  } catch (error) {
    console.error('[cron/hidratacao-checkin]', error instanceof Error ? error.message : 'erro');
    return NextResponse.json(
      {
        ok: false,
        error: 'Erro no cron de check-in de hidratação.',
      },
      { status: 500 }
    );
  }
}

/** Vercel Cron usa GET, no mesmo padrão dos demais jobs. */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
