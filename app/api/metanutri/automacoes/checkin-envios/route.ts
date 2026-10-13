import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID } from '@/lib/nutri/checkInSemanalNutriWhatsApp';
import { getAutomationDoctorSetting } from '@/services/automationDoctorSettingsService';
import { listQueueItemsByDoctor } from '@/services/whatsappAutomationQueueService';
import { pickNutriCheckInEnvioBadge } from '@/services/whatsappNutriCheckInQueue';

export const runtime = 'nodejs';

/**
 * GET /api/metanutri/automacoes/checkin-envios
 * Badges da fila do Check-in Semanal Nutri (não altera o status clínico do card).
 */
export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;

  try {
    const [setting, items] = await Promise.all([
      getAutomationDoctorSetting(auth.owner.uid, NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID),
      listQueueItemsByDoctor(auth.owner.uid),
    ]);

    return NextResponse.json({
      ok: true,
      autoEnabled: setting?.enabled === true,
      envios: pickNutriCheckInEnvioBadge(items),
    });
  } catch (error) {
    console.error('[metanutri/automacoes/checkin-envios GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar envios.',
      },
      { status: 500 }
    );
  }
}
