import { NextRequest, NextResponse } from 'next/server';
import {
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import {
  buildPacienteSelfGateDiagnostics,
  requirePacienteSelf,
} from '@/lib/server/requirePacienteSelfGate';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { syncContratoEasySignPatientSignature } from '@/lib/signature/bryEasySign/syncContratoEasySignPatientSignature.server';
import {
  loadContratoDocumentoForEasySignPoc,
} from '@/lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server';

export const runtime = 'nodejs';

const ROUTE_CONTEXT = 'meta/contrato-tratamento/sync-sign-status';

type Body = {
  pacienteId?: string;
  documentoId?: string;
};

async function resolveDocumentoIdForPaciente(
  pacienteId: string,
  documentoId: string
): Promise<string> {
  try {
    await loadContratoDocumentoForEasySignPoc(pacienteId, documentoId);
    return documentoId;
  } catch {
    const { getFirestoreAdmin } = await import('@/lib/server/firebaseAdminOftware');
    const {
      CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION,
      CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
    } = await import('@/lib/documentos/contrato-tratamento/contratoTratamentoConstants');

    const db = getFirestoreAdmin();
    const snap = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection(CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION)
      .get();

    const eligible = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
      .filter(
        (d) =>
          d.data.tipoDocumento === CONTRATO_TRATAMENTO_TIPO_DOCUMENTO &&
          ['aguardando_paciente', 'aguardando_medico', 'assinado_completo'].includes(String(d.data.statusAssinatura || ''))
      );

    if (!eligible.length) {
      throw new Error('Documento do contrato não encontrado para este paciente.');
    }

    eligible.sort((a, b) => {
      const aMs =
        a.data.createdAt &&
        typeof a.data.createdAt === 'object' &&
        'toMillis' in a.data.createdAt &&
        typeof (a.data.createdAt as { toMillis: () => number }).toMillis === 'function'
          ? (a.data.createdAt as { toMillis: () => number }).toMillis()
          : 0;
      const bMs =
        b.data.createdAt &&
        typeof b.data.createdAt === 'object' &&
        'toMillis' in b.data.createdAt &&
        typeof (b.data.createdAt as { toMillis: () => number }).toMillis === 'function'
          ? (b.data.createdAt as { toMillis: () => number }).toMillis()
          : 0;
      return bMs - aMs;
    });

    return eligible[0]!.id;
  }
}

/**
 * Sincroniza assinatura do paciente no EasySign → Firestore (e envia e-mail na primeira conclusão).
 */
export async function POST(request: NextRequest) {
  if (!isContratoEasySignConfiguredServer()) {
    return NextResponse.json(
      { ok: false, error: contratoEasySignNotConfiguredMessage(), reason: 'easysign_not_configured' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Body;
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : '';

    if (!pacienteId || !documentoId) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId e documentoId.', reason: 'missing_body_fields' },
        { status: 400 }
      );
    }

    const gate = await requirePacienteSelf(request, pacienteId, {
      enablePacienteIdFallback: true,
      routeContext: ROUTE_CONTEXT,
    });

    if (!gate.ok) {
      const diagnostics = buildPacienteSelfGateDiagnostics({
        request,
        pacienteId,
        documentoId,
        routeContext: ROUTE_CONTEXT,
        reason: gate.reason,
        userUid: gate.userUid,
        gate: gate.gate,
      });
      console.warn('[contrato.syncSignStatus] forbidden', diagnostics);
      return gate.res;
    }

    const effectivePacienteId = gate.pacienteId;
    const effectiveDocumentoId = await resolveDocumentoIdForPaciente(effectivePacienteId, documentoId);

    const result = await syncContratoEasySignPatientSignature({
      pacienteId: effectivePacienteId,
      documentoId: effectiveDocumentoId,
      sendEmail: true,
    });

    return NextResponse.json({
      ...result,
      ...(gate.resolvedPacienteId ? { resolvedPacienteId: gate.resolvedPacienteId } : {}),
      ...(effectiveDocumentoId !== documentoId ? { resolvedDocumentoId: effectiveDocumentoId } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar assinatura.';
    console.error('[contrato.syncSignStatus] error', {
      routeContext: ROUTE_CONTEXT,
      hasAuthorizationHeader: Boolean(getBearerToken(request)),
      message,
    });
    return NextResponse.json({ ok: false, error: message, reason: 'internal_error' }, { status: 500 });
  }
}
