import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  authorizeHydrationProfessionalActor,
  listHydrationAudiencePatientIds,
} from '@/lib/nutri/hidratacao/hydrationCheckInAuth.server';
import { listActiveHydrationAdherenceAlerts } from '@/lib/nutri/hidratacao/hydrationAdherenceAlerts.server';
import { hydrationAdherenceAlertCopy } from '@/lib/nutri/hidratacao/hydrationAdherence';

export const runtime = 'nodejs';

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeHydrationProfessionalActor(request);
    if (auth instanceof NextResponse) return noStore(auth);

    const db = getFirestoreAdmin();
    const patientIds = await listHydrationAudiencePatientIds(db, auth);
    const alerts = await listActiveHydrationAdherenceAlerts(db, patientIds);

    return noStore(
      NextResponse.json({
        ok: true,
        alerts: alerts.map((alert) => ({
          id: alert.id,
          patientId: alert.patientId,
          type: alert.type,
          status: alert.status,
          reasons: alert.reasons,
          createdAt: alert.createdAt.toISOString(),
          updatedAt: alert.updatedAt.toISOString(),
          copy: hydrationAdherenceAlertCopy(alert.type),
        })),
      })
    );
  } catch (error) {
    console.error('[api/hidratacao/adherence-alerts GET]', error);
    return noStore(
      NextResponse.json({ error: 'Não foi possível carregar os alertas de hidratação.' }, { status: 500 })
    );
  }
}
