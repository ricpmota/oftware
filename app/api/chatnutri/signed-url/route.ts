/**
 * GET /api/chatnutri/signed-url?patientId=...&gcsPath=...
 * Retorna uma nova signed URL para exibir imagem (quando a anterior expirou).
 * Valida que o gcsPath pertence ao patientId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPatientStatusTratamento } from '@/services/chatNutriServerService';
import { getSignedUrlForGcsPath } from '@/services/chatNutriStorageService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const gcsPath = searchParams.get('gcsPath');

    if (!patientId || !gcsPath) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'patientId e gcsPath obrigatórios.' } },
        { status: 400 }
      );
    }

    // Valida que o gcsPath pertence ao patientId (formato: chatnutri/{patientId}/...)
    const expectedPrefix = `chatnutri/${patientId}/`;
    if (!gcsPath.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Acesso negado ao recurso.' } },
        { status: 403 }
      );
    }

    const statusTratamento = await getPatientStatusTratamento(patientId);
    if (statusTratamento !== 'em_tratamento') {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_IN_TREATMENT', message: 'Disponível apenas para pacientes em Tratamento.' } },
        { status: 403 }
      );
    }

    const signedUrl = await getSignedUrlForGcsPath(gcsPath);
    return NextResponse.json({ ok: true, signedUrl });
  } catch (error) {
    console.error('[chatnutri/signed-url] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar URL.' } },
      { status: 500 }
    );
  }
}
