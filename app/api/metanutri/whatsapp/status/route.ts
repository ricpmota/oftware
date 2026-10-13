import { NextRequest } from 'next/server';
import { requireNutricionistaWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { handleProfessionalWhatsappStatus } from '@/lib/server/whatsappProfessionalHandlers.server';

export const runtime = 'nodejs';

/** GET /api/metanutri/whatsapp/status */
export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;
  return handleProfessionalWhatsappStatus(auth.owner, 'metanutri/whatsapp');
}
