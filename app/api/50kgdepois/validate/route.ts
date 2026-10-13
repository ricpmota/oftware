import { NextRequest, NextResponse } from 'next/server';
import { requireCinquentaKgDepoisAuth } from '@/lib/50kgdepois/apiAuth.server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCinquentaKgDepoisAuth(request);
    if (auth instanceof NextResponse) return auth;

    return NextResponse.json({ valid: true, email: auth.email });
  } catch (error) {
    console.error('[API 50kgdepois/validate] GET:', error);
    return NextResponse.json({ error: 'Erro ao validar sessão.' }, { status: 500 });
  }
}
