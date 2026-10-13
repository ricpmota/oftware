import type { Firestore } from 'firebase-admin/firestore';
import {
  CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION,
  CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { contratoPacienteAssinaturaPendente } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPacienteDisponibilidade';
import type {
  ContratoTratamentoDocumentoRecord,
  ContratoTratamentoFluxoAssinatura,
  ContratoTratamentoPacienteSignStatus,
  ContratoTratamentoStatusAssinatura,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (
    typeof v === 'object' &&
    v !== null &&
    'toDate' in v &&
    typeof (v as { toDate: () => Date }).toDate === 'function'
  ) {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function docCreatedAtMs(data: Record<string, unknown>): number {
  return toDate(data.createdAt)?.getTime() ?? 0;
}

/**
 * Verifica (Admin) se o paciente tem contrato aguardando assinatura no portal /meta.
 * Usado pós-envio da aplicação para redirecionar o paciente a assinar.
 */
export async function pacienteTemContratoAssinaturaPendenteAdmin(
  db: Firestore,
  pacienteId: string
): Promise<boolean> {
  const pid = pacienteId.trim();
  if (!pid) return false;

  try {
    const snap = await db
      .collection('pacientes_completos')
      .doc(pid)
      .collection(CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION)
      .get();

    const eligible = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
      .filter((d) => d.data.tipoDocumento === CONTRATO_TRATAMENTO_TIPO_DOCUMENTO)
      .sort((a, b) => docCreatedAtMs(b.data) - docCreatedAtMs(a.data));

    const latest = eligible[0];
    if (!latest) return false;

    const data = latest.data;
    const record = {
      id: latest.id,
      tipoDocumento: CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
      statusAssinatura: String(data.statusAssinatura || '') as ContratoTratamentoStatusAssinatura,
      fluxoAssinatura: data.fluxoAssinatura as ContratoTratamentoFluxoAssinatura | undefined,
      pdfAssinadoMedicoUrl:
        typeof data.pdfAssinadoMedicoUrl === 'string' ? data.pdfAssinadoMedicoUrl : undefined,
      pdfUrl: typeof data.pdfUrl === 'string' ? data.pdfUrl : undefined,
      medicoAssinadoEm: toDate(data.medicoAssinadoEm),
      solicitadoPacienteEm: toDate(data.solicitadoPacienteEm) ?? null,
      pacienteAssinadoEm: toDate(data.pacienteAssinadoEm) ?? null,
      pacienteSignStatus: (data.pacienteSignStatus ?? null) as ContratoTratamentoPacienteSignStatus | null,
      medicoId: String(data.medicoId || ''),
      pacienteId: pid,
      hashDocumento: String(data.hashDocumento || ''),
      createdAt: toDate(data.createdAt) ?? new Date(0),
    } satisfies ContratoTratamentoDocumentoRecord;

    return contratoPacienteAssinaturaPendente(record);
  } catch (err) {
    console.error('[contrato] falha ao checar assinatura pendente na aplicação', {
      pacienteId: pid,
      err,
    });
    return false;
  }
}
