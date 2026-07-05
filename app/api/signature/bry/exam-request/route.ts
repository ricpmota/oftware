import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { BryPdfSignError } from '@/lib/signature/providers/bryCloudApi';
import { submitBryExamRequestSignature } from '@/lib/signature/bryPrescriptionSignatureService';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 12 * 1024 * 1024;

type Body = {
  patientId?: string;
  originalPdfBase64?: string;
};

export async function POST(request: NextRequest) {
  let requestId: string | undefined;

  try {
    const body = (await request.json()) as Body;
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
    if (!patientId) {
      return NextResponse.json({ ok: false, error: 'Informe patientId.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, patientId);
    if (!gate.ok) return gate.res;

    const b64 = typeof body.originalPdfBase64 === 'string' ? body.originalPdfBase64.trim() : '';
    if (!b64) {
      return NextResponse.json({ ok: false, error: 'Envie originalPdfBase64.' }, { status: 400 });
    }

    const originalPdfBuffer = Buffer.from(b64, 'base64');
    if (!originalPdfBuffer.length) {
      return NextResponse.json({ ok: false, error: 'PDF original inválido.' }, { status: 400 });
    }
    if (originalPdfBuffer.length > MAX_PDF_BYTES) {
      return NextResponse.json({ ok: false, error: 'PDF muito grande (máx. 12 MB).' }, { status: 400 });
    }

    const result = await submitBryExamRequestSignature({
      doctorId: gate.medicoDocId,
      patientId,
      originalPdfBuffer,
    });

    requestId = result.requestId;

    if (result.outcome === 'signed') {
      return NextResponse.json({
        ok: true,
        outcome: 'signed',
        requestId: result.requestId,
        status: result.status,
        signedPdfUrl: result.signedPdfUrl,
        originalHash: result.originalHash,
        signedHash: result.signedHash,
      });
    }

    return NextResponse.json({
      ok: true,
      outcome: 'pending',
      requestId: result.requestId,
      status: result.status,
      message: result.message,
      providerOperationId: result.providerOperationId,
    });
  } catch (error: unknown) {
    const logPayload: Record<string, unknown> = {
      requestId: requestId ?? null,
      errorName: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message : String(error),
    };
    if (error instanceof BryPdfSignError) {
      logPayload.bryHttpStatus = error.httpStatus;
      logPayload.bryResponseBody = error.sanitizedBody;
    }
    console.error('[signature/bry/exam-request]', logPayload);
    const message =
      error instanceof Error
        ? error.message
        : 'Erro ao enviar requisição de exames para assinatura BRy Cloud.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
