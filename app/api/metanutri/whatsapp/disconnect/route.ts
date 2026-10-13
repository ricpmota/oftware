import { NextRequest } from 'next/server';
import { requireNutricionistaWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { handleProfessionalWhatsappDisconnect } from '@/lib/server/whatsappProfessionalHandlers.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** POST /api/metanutri/whatsapp/disconnect */
export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;
  return handleProfessionalWhatsappDisconnect(auth.owner, 'metanutri/whatsapp');
}
