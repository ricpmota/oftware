import { NextRequest, NextResponse } from 'next/server';
import { extrairExameImagemComGemini } from '@/services/exameImagemGeminiService';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST multipart/form-data:
 * - file: PDF ou imagem (JPEG, PNG, WEBP, GIF)
 * - pacienteId: ID do paciente (obrigatório — valida médico responsável)
 *
 * Requer Authorization: Bearer &lt;Firebase ID token&gt;.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const pacienteIdRaw = form.get('pacienteId');
    const pacienteId =
      typeof pacienteIdRaw === 'string'
        ? pacienteIdRaw.trim()
        : pacienteIdRaw != null
          ? String(pacienteIdRaw).trim()
          : '';

    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'Informe pacienteId no formulário.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(req, pacienteId);
    if (!gate.ok) return gate.res;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: 'Envie o arquivo no campo "file".' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const normalized = await extrairExameImagemComGemini({ buffer, mimeType });

    return NextResponse.json({
      ok: true,
      data: {
        nomePacienteDocumento: normalized.nomePacienteDocumento,
        dataExame: normalized.dataExame,
        tipoExame: normalized.tipoExame,
        resumoEquipamentoOuRegiao: normalized.resumoEquipamentoOuRegiao,
        avisos: normalized.avisos,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao processar arquivo.';
    console.error('[exames-imagem-extrair-ia]', e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
