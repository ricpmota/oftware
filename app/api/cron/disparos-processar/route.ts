import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { processDisparoTick } from '@/lib/server/disparosWorker.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Vários envios na mesma execução, com espera sorteada de 50 a 70 segundos entre os que deram certo. */
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }
  try {
    const result = await processDisparoTick();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[cron/disparos-processar]', error);
    return NextResponse.json(
      { ok: false, error: 'Não foi possível processar o disparo.' },
      { status: 500 },
    );
  }
}
