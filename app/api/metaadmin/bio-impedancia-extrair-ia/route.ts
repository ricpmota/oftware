import { NextRequest, NextResponse } from 'next/server';
import { extrairBioImpedanciaComGemini } from '@/services/bioImpedanciaGeminiService';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST multipart/form-data: campo "file" (PDF ou imagem).
 * Retorna JSON para preenchimento do formulário de bioimpedância (sem persistir).
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: 'Envie o arquivo no campo "file".' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await extrairBioImpedanciaComGemini({ buffer, mimeType });

    return NextResponse.json({
      ok: true,
      data: {
        dataRegistro: data.dataRegistro,
        peso: data.peso,
        composicaoCorporal: data.composicaoCorporal,
        analiseMusculoGordura: data.analiseMusculoGordura,
        analiseObesidade: data.analiseObesidade,
        massaMagraSegmentar: data.massaMagraSegmentar,
        gorduraSegmentar: data.gorduraSegmentar,
        avisos: data.avisos,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao processar arquivo.';
    console.error('[bio-impedancia-extrair-ia]', e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
