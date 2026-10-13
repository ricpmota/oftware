import { NextRequest } from 'next/server';
import { requirePersonalTrainerWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { handleProfessionalWhatsappStatus } from '@/lib/server/whatsappProfessionalHandlers.server';

export const runtime = 'nodejs';

/** GET /api/metapersonal/whatsapp/status */
export async function GET(request: NextRequest) {
  const auth = await requirePersonalTrainerWhatsapp(request);
  if (!auth.ok) return auth.res;
  return handleProfessionalWhatsappStatus(auth.owner, 'metapersonal/whatsapp');
}
