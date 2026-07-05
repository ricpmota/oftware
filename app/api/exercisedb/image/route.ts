import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/exercisedb/image?exerciseId=...&resolution=...
 * Proxy para buscar GIFs de exercícios da ExerciseDB.
 * A API não retorna gifUrl diretamente, mas fornece via endpoint /image
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
        },
        { status: 503, headers: noStore }
      );
    }

    const { searchParams } = request.nextUrl;
    const exerciseId = searchParams.get('exerciseId');
    const resolution = searchParams.get('resolution') || '1080';

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Parâmetro "exerciseId" é obrigatório' },
        { status: 400 }
      );
    }

    // Validar resolution
    const validResolutions = ['180', '360', '720', '1080'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: 'Resolution inválido. Use: 180, 360, 720 ou 1080' },
        { status: 400 }
      );
    }

    const res = await fetch(`${base}/image?exerciseId=${exerciseId}&resolution=${resolution}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host,
      },
      next: { revalidate: 86400 }, // Cache por 24h
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ExerciseDB ${res.status}: Erro ao buscar imagem` },
        { status: 502 }
      );
    }

    // Retornar a imagem diretamente
    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=86400', // Cache por 24h
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao buscar imagem';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
