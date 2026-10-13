import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store' };
const RESOLUTIONS = ['180', '360', '720', '1080'] as const;

/**
 * GET /api/exercisedb/image?exerciseId=...&resolution=...
 * Proxy para GIFs da ExerciseDB (RapidAPI).
 * Se a resolução pedida falhar, tenta resoluções menores automaticamente.
 */
export async function GET(request: NextRequest) {
  const base = process.env.EXERCISEDB_BASE_URL || 'https://exercisedb.p.rapidapi.com';
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com';

  try {
    if (!key) {
      return NextResponse.json(
        { error: 'RAPIDAPI_KEY não configurada.' },
        { status: 503, headers: noStore }
      );
    }

    const { searchParams } = request.nextUrl;
    const exerciseId = searchParams.get('exerciseId')?.trim();
    const requested = searchParams.get('resolution') || '360';

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Parâmetro "exerciseId" é obrigatório' },
        { status: 400 }
      );
    }

    if (!RESOLUTIONS.includes(requested as (typeof RESOLUTIONS)[number])) {
      return NextResponse.json(
        { error: 'Resolution inválido. Use: 180, 360, 720 ou 1080' },
        { status: 400 }
      );
    }

    // Tenta a pedida e depois as menores (mais leves / mais estáveis)
    const order = [
      requested,
      ...RESOLUTIONS.filter((r) => Number(r) < Number(requested)).reverse(),
      ...RESOLUTIONS.filter((r) => Number(r) > Number(requested)),
    ];
    const tried = new Set<string>();
    let lastStatus = 502;
    let lastText = '';

    for (const resolution of order) {
      if (tried.has(resolution)) continue;
      tried.add(resolution);

      const res = await fetch(
        `${base}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${resolution}`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': host,
          },
          // Não cachear erro no Data Cache do Next
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        lastStatus = res.status;
        lastText = await res.text().catch(() => '');
        continue;
      }

      const contentType = res.headers.get('content-type') || 'image/gif';
      const imageBuffer = await res.arrayBuffer();
      if (!imageBuffer.byteLength) {
        lastStatus = 502;
        lastText = 'empty body';
        continue;
      }

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType.includes('image') ? contentType : 'image/gif',
          'Cache-Control': 'public, max-age=86400',
          'X-Exercise-Resolution': resolution,
        },
      });
    }

    return NextResponse.json(
      {
        error: `ExerciseDB ${lastStatus}: Erro ao buscar imagem`,
        detail: lastText?.slice(0, 300) || undefined,
        exerciseId,
      },
      { status: 502, headers: noStore }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao buscar imagem';
    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
