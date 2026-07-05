import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/exercisedb/search?name=...
 * Busca exercícios por nome na ExerciseDB.
 */
export async function GET(request: NextRequest) {
  const base = process.env.EXERCISEDB_BASE_URL || 'https://exercisedb.p.rapidapi.com';
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com';

  try {
    if (!key) {
      return NextResponse.json(
        {
          error: 'RAPIDAPI_KEY não configurada.',
          hint: 'Local: use .env.local. Vercel: confira os nomes exatos (RAPIDAPI_KEY, etc.), o ambiente (Production) e faça REDEPLOY após adicionar variáveis.',
        },
        { status: 503, headers: noStore }
      );
    }

    const { searchParams } = request.nextUrl;
    const name = searchParams.get('name');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isNaN(requestedLimit) ? 50 : Math.min(Math.max(requestedLimit, 1), 300);
    const offset = (page - 1) * limit;

    if (!name) {
      return NextResponse.json(
        { error: 'Parâmetro "name" é obrigatório' },
        { status: 400 }
      );
    }

    const res = await fetch(`${base}/exercises/name/${encodeURIComponent(name)}?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `ExerciseDB ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao buscar exercícios';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
