import { NextRequest, NextResponse } from 'next/server';

import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';

import { validateSandboxDoctorForSigning } from '@/lib/signature/sandboxSignatureValidation';

import { DigitalSignatureService } from '@/lib/signature/digitalSignatureService';

import { simulateSandboxPdfSignature } from '@/lib/signature/sandboxSignatureService';

import { SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO } from '@/types/digitalSignature';



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

  const buf = Buffer.from(await res.arrayBuffer());

  if (!buf.length) {

    throw new Error('PDF assinado pelo paciente está vazio.');

  }

  if (buf.length > MAX_PDF_BYTES) {

    throw new Error('PDF muito grande (máx. 12 MB).');

  }

  return buf;

}



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



    const b64 = typeof body.originalPdfBase64 === 'string' ? body.originalPdfBase64.trim() : '';

    const pdfUrlInput =

      typeof body.originalPdfUrl === 'string' && body.originalPdfUrl.trim()

        ? body.originalPdfUrl.trim()

        : '';



    let originalPdfBuffer: Buffer | undefined;

    if (b64) {

      originalPdfBuffer = Buffer.from(b64, 'base64');

      if (!originalPdfBuffer.length) {

        return NextResponse.json({ ok: false, error: 'PDF original inválido.' }, { status: 400 });

      }

      if (originalPdfBuffer.length > MAX_PDF_BYTES) {

        return NextResponse.json({ ok: false, error: 'PDF muito grande (máx. 12 MB).' }, { status: 400 });

      }

    } else if (pdfUrlInput) {

      try {

        originalPdfBuffer = await fetchPdfBufferFromUrl(pdfUrlInput);

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



    const originalPdfUrl =

      pdfUrlInput || `sandbox://contrato_tratamento/${patientId}/${Date.now()}.pdf`;



    const result = await simulateSandboxPdfSignature({

      doctorId: gate.medicoDocId,

      patientId,

      documentType: SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO,

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

    console.error('[signature/sandbox/contrato-tratamento]', error);

    const message =

      error instanceof Error ? error.message : 'Erro ao assinar contrato de tratamento no sandbox.';

    return NextResponse.json({ ok: false, error: message }, { status: 500 });

  }

}

