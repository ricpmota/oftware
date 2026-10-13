import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { serializeHydrationWriteResult } from '@/lib/nutri/hidratacao/hydrationCodec';
import { persistHydrationAdmin } from '@/lib/nutri/hidratacao/hydrationPersist.server';
import { HYDRATION_MAX_ADD_ML } from '@/lib/nutri/hidratacao/hydrationTypes';
import { parseHydrationDailyTotalInput, parseHydrationMlInput } from '@/lib/nutri/hidratacao/hydrationMath';

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * POST /api/meta/hidratacao
 * Portal do paciente. Identidade vem só do ID token — body NÃO carrega patientId.
 * Body: { date: YYYY-MM-DD, addMl?: number, consumedMl?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Faça login para registrar sua hidratação.' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAuthAdmin().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Faça login para registrar sua hidratação.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      date?: unknown;
      addMl?: unknown;
      consumedMl?: unknown;
      patientId?: unknown;
    } | null;

    const date = typeof body?.date === 'string' ? body.date.trim() : '';
    if (!date) {
      return NextResponse.json({ error: 'Informe a data do registro.' }, { status: 400 });
    }

    const hasAdd = body?.addMl != null;
    const hasSet = body?.consumedMl != null;
    if (hasAdd === hasSet) {
      return NextResponse.json({ error: 'Envie addMl ou consumedMl.' }, { status: 400 });
    }

    let intent: { kind: 'add'; addMl: number } | { kind: 'set'; consumedMl: number };
    if (hasAdd) {
      const parsed = parseHydrationMlInput(String(Math.round(Number(body?.addMl))));
      if (!parsed.ok) {
        return NextResponse.json({ error: 'Quantidade inválida.' }, { status: 400 });
      }
      if (parsed.ml > HYDRATION_MAX_ADD_ML) {
        return NextResponse.json({ error: 'Quantidade inválida.' }, { status: 400 });
      }
      intent = { kind: 'add', addMl: parsed.ml };
    } else {
      const parsed = parseHydrationDailyTotalInput(String(Math.round(Number(body?.consumedMl))));
      if (!parsed.ok) {
        return NextResponse.json({ error: 'Consumo inválido.' }, { status: 400 });
      }
      intent = { kind: 'set', consumedMl: parsed.ml };
    }

    const result = await persistHydrationAdmin({
      db: getFirestoreAdmin(),
      actor: { kind: 'patient_portal', authUid: uid },
      date,
      intent,
    });

    const db = getFirestoreAdmin();
    void import('@/lib/nutri/hidratacao/hydrationAdherence.server')
      .then((mod) => mod.reevaluateHydrationAdherenceForPatient(db, result.record.patientId))
      .catch((error) => {
        console.error('[api/meta/hidratacao] adesao', error instanceof Error ? error.message : 'erro');
      });

    return NextResponse.json(serializeHydrationWriteResult(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível salvar o registro.';
    const status =
      /não autenticado|faça login/i.test(message)
        ? 401
        : /não encontrado|própria conta/i.test(message)
          ? 403
          : /inválid|meta diária|ultrapassa|dia atual/i.test(message)
            ? 400
            : 500;
    if (status === 500) console.error('[api/meta/hidratacao]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
