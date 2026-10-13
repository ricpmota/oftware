import { NextRequest } from 'next/server';
import { requirePersonalTrainerWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { handleProfessionalWhatsappStartSession } from '@/lib/server/whatsappProfessionalHandlers.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** POST /api/metapersonal/whatsapp/start-session */
export async function POST(request: NextRequest) {
  const auth = await requirePersonalTrainerWhatsapp(request);
  if (!auth.ok) return auth.res;
  return handleProfessionalWhatsappStartSession(auth.owner, 'metapersonal/whatsapp');
}
