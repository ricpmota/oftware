import { NextRequest, NextResponse } from 'next/server';
import { extrairExamesLaboratoriaisComGemini } from '@/services/exameLaboratorialGeminiService';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST multipart/form-data: campo "file" (PDF ou imagem).
 * Retorna JSON estruturado para preenchimento do modal (sem persistir).
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

    const data = await extrairExamesLaboratoriaisComGemini({ buffer, mimeType });

    return NextResponse.json({
      ok: true,
      data: {
        nomePacienteDocumento: data.nomePacienteDocumento,
        dataExame: data.dataExame,
        camposMapeados: data.camposMapeados,
        examesNaoMapeados: data.examesNaoMapeados,
        avisos: data.avisos,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao processar arquivo.';
    console.error('[exames-laboratoriais-extrair-ia]', e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
