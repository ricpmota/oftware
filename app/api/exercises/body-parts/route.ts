import { NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/exercises/body-parts
 * Retorna lista de partes do corpo (bodyPart) disponíveis na ExerciseDB.
 */
export async function GET() {
  const base = process.env.EXERCISEDB_BASE_URL || 'https://exercisedb.p.rapidapi.com';
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com';

  try {
    if (!key) {
      console.warn('[ExerciseDB] 503 body-parts: RAPIDAPI_KEY não disponível no runtime.');
      return NextResponse.json(
        {
          error: 'RAPIDAPI_KEY não configurada.',
          hint: 'Local: use .env.local. Vercel: confira os nomes exatos (RAPIDAPI_KEY, etc.), o ambiente (Production) e faça REDEPLOY após adicionar variáveis.',
        },
        { status: 503, headers: noStore }
      );
    }

    const res = await fetch(`${base}/exercises/bodyPartList`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host,
      },
      next: { revalidate: 86400 },
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
    const message = e instanceof Error ? e.message : 'Erro ao buscar body parts';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
