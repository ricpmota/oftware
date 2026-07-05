import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { BryPdfSignError } from '@/lib/signature/providers/bryCloudApi';
import { submitBryContratoTratamentoSignature } from '@/lib/signature/bryContratoTratamentoSignatureService';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 12 * 1024 * 1024;

type Body = {
  patientId?: string;
  originalPdfBase64?: string;
  originalPdfUrl?: string;
};

async function fetchPdfBufferFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url.trim());
  if (!res.ok) {
    throw new Error(`Não foi possível baixar o PDF assinado pelo paciente (${res.status}).`);
  }
  const originalPdfBuffer = Buffer.from(await res.arrayBuffer());
  if (!originalPdfBuffer.length) {
    throw new Error('PDF assinado pelo paciente está vazio.');
  }
  if (originalPdfBuffer.length > MAX_PDF_BYTES) {
    throw new Error('PDF muito grande (máx. 12 MB).');
  }
  return originalPdfBuffer;
}

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
    const pdfUrl =
      typeof body.originalPdfUrl === 'string' && body.originalPdfUrl.trim()
        ? body.originalPdfUrl.trim()
        : '';

    let originalPdfBuffer: Buffer;
    if (b64) {
      originalPdfBuffer = Buffer.from(b64, 'base64');
      if (!originalPdfBuffer.length) {
        return NextResponse.json({ ok: false, error: 'PDF original inválido.' }, { status: 400 });
      }
      if (originalPdfBuffer.length > MAX_PDF_BYTES) {
        return NextResponse.json({ ok: false, error: 'PDF muito grande (máx. 12 MB).' }, { status: 400 });
      }
    } else if (pdfUrl) {
      try {
        originalPdfBuffer = await fetchPdfBufferFromUrl(pdfUrl);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Não foi possível baixar o PDF assinado pelo paciente.';
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { ok: false, error: 'Envie originalPdfBase64 ou originalPdfUrl.' },
        { status: 400 }
      );
    }

    const result = await submitBryContratoTratamentoSignature({
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
    console.error('[signature/bry/contrato-tratamento]', logPayload);
    const message =
      error instanceof Error
        ? error.message
        : 'Erro ao enviar contrato de tratamento para assinatura BRy Cloud.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
