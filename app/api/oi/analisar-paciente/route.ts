import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  executarAnalisePacienteOi,
  parseAnalisarPacienteBody,
} from '@/lib/oi/analisarPacienteHandler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = parseAnalisarPacienteBody(body);

    if ('error' in parsed) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, parsed.pacienteId);
    if (!gate.ok) {
      return gate.res;
    }

    const result = await executarAnalisePacienteOi(parsed.pacienteId, {
      fetchPacienteRaw: async (pacienteId) => {
        const snap = await getFirestoreAdmin()
          .collection('pacientes_completos')
          .doc(pacienteId)
          .get();
        if (!snap.exists) return null;
        return snap.data() as Record<string, unknown>;
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, analysis: result.analysis });
  } catch {
    console.error('[oi/analisar-paciente] Falha interna.');
    return NextResponse.json(
      { ok: false, error: 'Falha ao analisar paciente.' },
      { status: 500 }
    );
  }
}
