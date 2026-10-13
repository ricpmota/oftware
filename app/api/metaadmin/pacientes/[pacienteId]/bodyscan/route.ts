import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { serializeBodyScanDoc, sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';

/**
 * GET /api/metaadmin/pacientes/[pacienteId]/bodyscan
 * Authorization: Bearer idToken — usuário autenticado (médico/admin).
 * Acesso alinhado ao padrão atual do prontuário (auth + paciente existente).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  try {
    const { pacienteId: rawId } = await params;
    const pacienteId = String(rawId || '').trim();
    if (!pacienteId) {
      return NextResponse.json({ error: 'pacienteId inválido' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : String(request.nextUrl.searchParams.get('idToken') || '').trim();
    if (!idToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await getAuthAdmin().verifyIdToken(idToken);

    const db = getFirestoreAdmin();
    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const snap = await pacienteSnap.ref.collection(BODYSCAN_SUBCOLLECTION).get();
    const scans = sortBodyScansByWeekAsc(
      snap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    return NextResponse.json({ scans });
  } catch (error) {
    console.error('[BodyScan] metaadmin GET', error);
    return NextResponse.json({ error: 'Erro ao carregar BodyScan' }, { status: 500 });
  }
}
