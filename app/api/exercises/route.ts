import { NextRequest, NextResponse } from 'next/server';

function getConfig() {
  return {
    base: process.env.EXERCISEDB_BASE_URL || 'https://exercisedb.p.rapidapi.com',
    key: process.env.RAPIDAPI_KEY,
    host: process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com',
  };
}

async function exercisedbFetch(path: string, params?: Record<string, string>) {
  const { base, key, host } = getConfig();
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': key || '',
      'X-RapidAPI-Host': host,
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ExerciseDB ${res.status}: ${text}`);
  }
  return res.json();
}

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/exercises
 * Query: limit, offset, bodyPart, target, equipment, name
 * Retorna lista de exercícios da ExerciseDB.
 */
export async function GET(request: NextRequest) {
  const { key } = getConfig();
  try {
    if (!key) {
      console.warn('[ExerciseDB] 503: RAPIDAPI_KEY não disponível no runtime. Verifique env vars no Vercel (Production) e redeploy.');
      return NextResponse.json(
        {
          error: 'RAPIDAPI_KEY não configurada.',
          hint: 'Local: use .env.local. Vercel: confira os nomes exatos (RAPIDAPI_KEY, etc.), o ambiente (Production) e faça REDEPLOY após adicionar variáveis.',
        },
        { status: 503, headers: noStore }
      );
    }

    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';
    const bodyPart = searchParams.get('bodyPart');
    const target = searchParams.get('target');
    const equipment = searchParams.get('equipment');
    const name = searchParams.get('name');

    let path: string;
    const params: Record<string, string> = { limit, offset };

    if (name) {
      path = `/exercises/name/${encodeURIComponent(name)}`;
      delete params.limit;
      delete params.offset;
    } else if (bodyPart) {
      path = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}`;
    } else if (target) {
      path = `/exercises/target/${encodeURIComponent(target)}`;
    } else if (equipment) {
      path = `/exercises/equipment/${encodeURIComponent(equipment)}`;
    } else {
      path = '/exercises';
    }

    const data = await exercisedbFetch(path, Object.keys(params).length ? params : undefined);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao buscar exercícios';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
