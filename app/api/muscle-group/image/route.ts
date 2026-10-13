import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/muscle-group/image?muscles=chest,triceps&color=4CCB7A&transparent=true&size=medium
 * Proxy para imagens do Muscle Group Image Generator (RapidAPI).
 * Credenciais: X_MUSCLE_GROUP_HOST / X_MUSCLE_GROUP_KEY
 */
export async function GET(request: NextRequest) {
  const host =
    process.env.X_MUSCLE_GROUP_HOST || 'muscle-group-image-generator.p.rapidapi.com';
  const key = process.env.X_MUSCLE_GROUP_KEY;

  try {
    if (!key) {
      return NextResponse.json(
        {
          error: 'X_MUSCLE_GROUP_KEY não configurada.',
          hint: 'Local: use .env.local. Vercel: confira X_MUSCLE_GROUP_HOST / X_MUSCLE_GROUP_KEY e faça REDEPLOY.',
        },
        { status: 503, headers: noStore }
      );
    }

    const { searchParams } = request.nextUrl;
    const muscles = searchParams.get('muscles')?.trim();
    if (!muscles) {
      return NextResponse.json(
        { error: 'Parâmetro "muscles" é obrigatório (ex.: chest,triceps).' },
        { status: 400, headers: noStore }
      );
    }

    const size = searchParams.get('size') || 'medium';
    const color = (searchParams.get('color') || '4CCB7A').replace(/^#/, '');
    const backgroundColor = (searchParams.get('backgroundColor') || '0A1F44').replace(/^#/, '');
    const transparentRaw = searchParams.get('transparent');
    const transparent =
      transparentRaw === null || transparentRaw === '' || transparentRaw === 'true' || transparentRaw === '1';

    const upstream = new URL(`https://${host}/v2/images/single`);
    upstream.searchParams.set('muscles', muscles);
    upstream.searchParams.set('size', size);
    upstream.searchParams.set('color', color);
    if (transparent) {
      upstream.searchParams.set('transparent', 'true');
    } else {
      upstream.searchParams.set('backgroundColor', backgroundColor);
    }

    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host,
        Accept: 'image/*',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        {
          error: `Muscle Group Image ${res.status}: erro ao buscar imagem`,
          detail: detail?.slice(0, 400) || undefined,
          muscles,
        },
        { status: 502, headers: noStore }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const imageBuffer = await res.arrayBuffer();
    if (!imageBuffer.byteLength) {
      return NextResponse.json(
        { error: 'Resposta vazia da API de músculo', muscles },
        { status: 502, headers: noStore }
      );
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType.includes('image') ? contentType : 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'X-Muscle-Groups': muscles,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao buscar imagem de músculos';
    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
