import { NextRequest, NextResponse } from 'next/server';
import {
  CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION,
  CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import {
  contratoEasySignConfigDiagnostics,
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import {
  buildPacienteSelfGateDiagnostics,
  requirePacienteSelf,
} from '@/lib/server/requirePacienteSelfGate';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  disponibilizarContratoParaAssinaturaPaciente,
  loadContratoDocumentoForEasySignPoc,
} from '@/lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server';

export const runtime = 'nodejs';

const ROUTE_CONTEXT = 'meta/contrato-tratamento/ensure-sign-link';

const CONTRATO_STATUS_VISIVEIS_PACIENTE = ['aguardando_paciente', 'assinado_completo'];

type Body = {
  pacienteId?: string;
  documentoId?: string;
};

function docCreatedAtMs(data: Record<string, unknown>): number {
  const createdAt = data.createdAt;
  if (
    createdAt &&
    typeof createdAt === 'object' &&
    'toMillis' in createdAt &&
    typeof (createdAt as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (createdAt as { toMillis: () => number }).toMillis();
  }
  if (createdAt instanceof Date) return createdAt.getTime();
  return 0;
}

async function findActiveContratoDocumentoIdAdmin(pacienteId: string): Promise<string | null> {
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
        CONTRATO_STATUS_VISIVEIS_PACIENTE.includes(String(d.data.statusAssinatura || ''))
    );

  if (!eligible.length) return null;

  eligible.sort((a, b) => docCreatedAtMs(b.data) - docCreatedAtMs(a.data));
  return eligible[0]!.id;
}

async function resolveDocumentoIdForPaciente(
  pacienteId: string,
  documentoId: string
): Promise<string> {
  try {
    await loadContratoDocumentoForEasySignPoc(pacienteId, documentoId);
    return documentoId;
  } catch {
    const resolved = await findActiveContratoDocumentoIdAdmin(pacienteId);
    if (!resolved) {
      throw new Error('Documento do contrato não encontrado para este paciente.');
    }
    return resolved;
  }
}

function httpStatusForEnsureSignLinkError(message: string): number {
  const m = message.toLowerCase();
  if (m.includes('não encontrado') || m.includes('nao encontrado')) return 404;
  if (m.includes('sem e-mail') || m.includes('sem email')) return 400;
  if (m.includes('sem nome cadastrado')) return 400;
  if (m.includes('aguardando assinatura do paciente')) return 400;
  if (m.includes('pdf assinado pelo médico não encontrado')) return 400;
  if (m.includes('receber o tratamento') || m.includes('opcao') || m.includes('opção')) return 400;
  if (m.includes('token easysign') || m.includes('credenciais bry easysign')) return 502;
  if (m.includes('não foi possível obter token easysign')) return 502;
  return 500;
}

function reasonForEnsureSignLinkError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('token easysign') || m.includes('obter token easysign')) return 'easysign_auth_failed';
  if (m.includes('falha ao criar envelope easysign')) return 'easysign_envelope_failed';
  if (m.includes('documento do contrato não encontrado')) return 'contrato_not_found';
  if (m.includes('sem e-mail') || m.includes('sem email')) return 'paciente_sem_email';
  if (m.includes('pdf assinado pelo médico não encontrado')) return 'contrato_sem_pdf_medico';
  if (m.includes('receber o tratamento') || m.includes('selecione como')) return 'contrato_sem_opcao_entrega';
  if (m.includes('telefone do paciente em formato inválido') || m.includes('e164')) {
    return 'signer_phone_invalid';
  }
  return 'internal_error';
}

/** Sub-motivo do 503 (somente log; corpo da resposta mantém reason histórico). */
function serviceUnavailableLogReason(): string {
  if (process.env.ENABLE_CONTRATO_EASYSIGN_POC === 'false') return 'feature_disabled';
  return 'easysign_not_configured';
}

function logEnsureSignLinkServiceUnavailable(args: {
  pacienteId: string;
  documentoId: string;
}): void {
  console.warn('[contrato.ensureSignLink] service_unavailable', {
    reason: serviceUnavailableLogReason(),
    pacienteId: args.pacienteId || undefined,
    documentoId: args.documentoId || undefined,
    routeContext: ROUTE_CONTEXT,
  });
}

/**
 * Garante link EasySign para o paciente logado (fallback se a geração automática pós-assinatura médica falhou).
 */
export async function POST(request: NextRequest) {
  let pacienteId = '';
  let documentoId = '';

  if (!isContratoEasySignConfiguredServer()) {
    logEnsureSignLinkServiceUnavailable({ pacienteId, documentoId });
    console.warn('[contrato.ensureSignLink] not_configured', {
      routeContext: ROUTE_CONTEXT,
      hasAuthorizationHeader: Boolean(getBearerToken(request)),
      ...contratoEasySignConfigDiagnostics(),
    });
    return NextResponse.json(
      { ok: false, error: contratoEasySignNotConfiguredMessage(), reason: 'easysign_not_configured' },
      { status: 503 }
    );
  }

  let step = 'init';
  let effectivePacienteId = '';
  let effectiveDocumentoId = '';
  let pacienteIdResolved = false;

  try {
    step = 'parse_body';
    const body = (await request.json()) as Body;
    pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : '';

    if (!pacienteId || !documentoId) {
      console.warn('[contrato.ensureSignLink] bad_request', {
        routeContext: ROUTE_CONTEXT,
        hasAuthorizationHeader: Boolean(getBearerToken(request)),
        hasPacienteId: Boolean(pacienteId),
        hasDocumentoId: Boolean(documentoId),
      });
      return NextResponse.json(
        {
          ok: false,
          error: 'Informe pacienteId e documentoId.',
          reason: 'missing_body_fields',
        },
        { status: 400 }
      );
    }

    step = 'paciente_self_gate';
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
      console.warn('[contrato.ensureSignLink] forbidden', diagnostics);
      return gate.res;
    }

    effectivePacienteId = gate.pacienteId;
    pacienteIdResolved = Boolean(gate.resolvedPacienteId);

    step = 'resolve_documento';
    effectiveDocumentoId = await resolveDocumentoIdForPaciente(effectivePacienteId, documentoId);

    step = 'load_contrato';
    const doc = await loadContratoDocumentoForEasySignPoc(effectivePacienteId, effectiveDocumentoId);

    const medicoDocId = doc.medicoId?.trim();
    if (!medicoDocId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Contrato sem médico responsável registrado.',
          reason: 'contrato_sem_medico',
        },
        { status: 400 }
      );
    }

    step = 'disponibilizar_easysign';
    const result = await disponibilizarContratoParaAssinaturaPaciente({
      pacienteId: effectivePacienteId,
      documentoId: effectiveDocumentoId,
      medicoDocId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      ...(gate.resolvedPacienteId ? { resolvedPacienteId: gate.resolvedPacienteId } : {}),
      ...(effectiveDocumentoId !== documentoId ? { resolvedDocumentoId: effectiveDocumentoId } : {}),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível preparar sua assinatura.';
    const reason = reasonForEnsureSignLinkError(message);
    const status = httpStatusForEnsureSignLinkError(message);

    console.error('[contrato.ensureSignLink] error', {
      routeContext: ROUTE_CONTEXT,
      step,
      reason,
      hasAuthorizationHeader: Boolean(getBearerToken(request)),
      requestPacienteId: pacienteId || undefined,
      requestDocumentoId: documentoId || undefined,
      effectivePacienteId: effectivePacienteId || undefined,
      effectiveDocumentoId: effectiveDocumentoId || undefined,
      pacienteIdResolved,
      message,
    });

    return NextResponse.json({ ok: false, error: message, reason }, { status });
  }
}
