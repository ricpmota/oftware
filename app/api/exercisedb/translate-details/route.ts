import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store' };

async function translateEnToPt(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  // MyMemory free endpoint (sem chave para uso leve)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 450))}&langpair=en|pt-BR`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return trimmed;
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number | string;
  };
  const translated = data.responseData?.translatedText?.trim();
  if (!translated || String(data.responseStatus) === '403') return trimmed;
  // MyMemory devolve o original quando falha / quota
  if (translated.toUpperCase() === trimmed.toUpperCase()) return trimmed;
  return translated;
}

/**
 * POST /api/exercisedb/translate-details
 * Traduz descrição e instruções do exercício (EN → PT-BR).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      description?: string;
      instructions?: string[];
    };
    const description = typeof body.description === 'string' ? body.description : '';
    const instructions = Array.isArray(body.instructions)
      ? body.instructions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];

    const [descriptionPt, ...instructionsPt] = await Promise.all([
      description ? translateEnToPt(description) : Promise.resolve(''),
      ...instructions.map((step) => translateEnToPt(step)),
    ]);

    return NextResponse.json(
      {
        descriptionPt: descriptionPt || null,
        instructionsPt,
      },
      { headers: noStore }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao traduzir';
    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
