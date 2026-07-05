import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { validateSandboxDoctorForSigning } from '@/lib/signature/sandboxSignatureValidation';
import { DigitalSignatureService } from '@/lib/signature/digitalSignatureService';
import { simulateSandboxPdfSignature } from '@/lib/signature/sandboxSignatureService';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 12 * 1024 * 1024;

type Body = {
  patientId?: string;
  originalPdfBase64?: string;
  originalPdfUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
    if (!patientId) {
      return NextResponse.json({ ok: false, error: 'Informe patientId.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, patientId);
    if (!gate.ok) return gate.res;

    const provider = await DigitalSignatureService.getDoctorSignatureProvider(gate.medicoDocId);
    const sandboxCheck = validateSandboxDoctorForSigning(provider);
    if (!sandboxCheck.ok) {
      return NextResponse.json({ ok: false, error: sandboxCheck.message }, { status: 403 });
    }

    let originalPdfBuffer: Buffer | undefined;
    const b64 = typeof body.originalPdfBase64 === 'string' ? body.originalPdfBase64.trim() : '';
    if (b64) {
      originalPdfBuffer = Buffer.from(b64, 'base64');
      if (!originalPdfBuffer.length) {
        return NextResponse.json({ ok: false, error: 'PDF original inválido.' }, { status: 400 });
      }
      if (originalPdfBuffer.length > MAX_PDF_BYTES) {
        return NextResponse.json({ ok: false, error: 'PDF muito grande (máx. 12 MB).' }, { status: 400 });
      }
    }

    const originalPdfUrl =
      typeof body.originalPdfUrl === 'string' && body.originalPdfUrl.trim()
        ? body.originalPdfUrl.trim()
        : `sandbox://prescription/${patientId}/${Date.now()}.pdf`;

    if (!originalPdfBuffer && !body.originalPdfUrl?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Envie originalPdfBase64 ou originalPdfUrl.' },
        { status: 400 }
      );
    }

    const result = await simulateSandboxPdfSignature({
      doctorId: gate.medicoDocId,
      patientId,
      documentType: 'prescription',
      originalPdfUrl,
      originalPdfBuffer,
    });

    return NextResponse.json({
      ok: true,
      requestId: result.requestId,
      status: result.status,
      signedPdfUrl: result.signedPdfUrl,
      originalHash: result.originalHash,
      signedHash: result.signedHash,
    });
  } catch (error: unknown) {
    console.error('[signature/sandbox/prescription]', error);
    const message = error instanceof Error ? error.message : 'Erro ao assinar PDF no sandbox.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
