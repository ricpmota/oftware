import { NextResponse } from 'next/server';

// Bump this number quando quiser forçar todos os clientes (incl. mobile) a recarregar a home.
// O script no layout busca essa versão e, se diferente da salva, faz location.replace com cache bust.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOME_VERSION = 30;

export async function GET() {
  const res = NextResponse.json({ version: HOME_VERSION });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}
