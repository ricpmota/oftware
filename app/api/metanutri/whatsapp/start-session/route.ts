import { NextRequest } from 'next/server';
import { requireNutricionistaWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { handleProfessionalWhatsappStartSession } from '@/lib/server/whatsappProfessionalHandlers.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** POST /api/metanutri/whatsapp/start-session */
export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;
  return handleProfessionalWhatsappStartSession(auth.owner, 'metanutri/whatsapp');
}
