import { NextRequest, NextResponse } from 'next/server';
import {
  buildPacienteSelfGateDiagnostics,
  requirePacienteSelf,
} from '@/lib/server/requirePacienteSelfGate';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import {
  isContratoOpcaoEntregaMaterial,
  type ContratoOpcaoEntregaMaterial,
} from '@/lib/contratos/contratoOpcaoEntregaMaterial';
import { salvarContratoOpcaoEntregaMaterialAdmin } from '@/lib/documentos/contrato-tratamento/contratoTratamentoOpcaoEntrega.server';

export const runtime = 'nodejs';

const ROUTE_CONTEXT = 'meta/contrato-tratamento/opcao-entrega';

type Body = {
  pacienteId?: string;
  documentoId?: string;
  opcaoEntregaMaterial?: ContratoOpcaoEntregaMaterial;
};

export async function POST(request: NextRequest) {
  let pacienteId = '';
  let documentoId = '';

  try {
    const body = (await request.json()) as Body;
    pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : '';
    const opcao = body.opcaoEntregaMaterial;

    if (!pacienteId || !documentoId || !isContratoOpcaoEntregaMaterial(opcao)) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId, documentoId e uma opção válida.' },
        { status: 400 }
      );
    }

    const gate = await requirePacienteSelf(request, pacienteId, {
      enablePacienteIdFallback: true,
      routeContext: ROUTE_CONTEXT,
    });

    if (!gate.ok) {
      console.warn('[contrato.opcaoEntrega] forbidden', buildPacienteSelfGateDiagnostics({
        request,
        pacienteId,
        documentoId,
        routeContext: ROUTE_CONTEXT,
        reason: gate.reason,
        userUid: gate.userUid,
        gate: gate.gate,
      }));
      return gate.res;
    }

    const result = await salvarContratoOpcaoEntregaMaterialAdmin({
      pacienteId: gate.pacienteId,
      documentoId,
      opcaoEntregaMaterial: opcao,
    });

    return NextResponse.json({
      ok: true,
      opcaoEntregaMaterial: result.opcaoEntregaMaterial,
      pdfParaAssinaturaPacienteUrl: result.pdfParaAssinaturaPacienteUrl,
      ...(gate.resolvedPacienteId ? { resolvedPacienteId: gate.resolvedPacienteId } : {}),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível salvar sua escolha.';
    console.error('[contrato.opcaoEntrega] error', {
      routeContext: ROUTE_CONTEXT,
      hasAuthorizationHeader: Boolean(getBearerToken(request)),
      pacienteId: pacienteId || undefined,
      documentoId: documentoId || undefined,
      message,
    });
    const status = message.includes('não encontrado') ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
