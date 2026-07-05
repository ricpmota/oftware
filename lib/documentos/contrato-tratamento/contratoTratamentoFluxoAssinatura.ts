import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';

export type ContratoTratamentoFluxoAssinatura = 'paciente_primeiro' | 'medico_primeiro';

export function contratoFluxoPacientePrimeiro(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return true;
  if (documento.fluxoAssinatura === 'paciente_primeiro') return true;
  if (documento.fluxoAssinatura === 'medico_primeiro') return false;
  // Legado: médico assinou antes do paciente
  if (documento.pdfAssinadoMedicoUrl?.trim() && !documento.solicitadoPacienteEm) return false;
  return true;
}

export function contratoTemAssinaturaMedica(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return false;
  return Boolean(
    documento.pdfAssinadoMedicoUrl?.trim() ||
      documento.pdfUrl?.trim() ||
      documento.medicoAssinadoEm
  );
}

export function contratoPacienteJaAssinou(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return false;
  if (documento.statusAssinatura === 'aguardando_medico') return true;
  if (documento.statusAssinatura === 'assinado_completo') return true;
  return Boolean(
    documento.pacienteAssinadoEm || documento.pacienteSignStatus === 'assinado'
  );
}

/** Corrige status desatualizado quando o paciente já assinou mas o Firestore ainda está pendente. */
export function normalizarStatusAssinaturaPaciente(
  statusAssinatura: ContratoTratamentoDocumentoRecord['statusAssinatura'],
  documento: ContratoTratamentoDocumentoRecord
): ContratoTratamentoDocumentoRecord['statusAssinatura'] {
  if (statusAssinatura === 'assinado_completo' || statusAssinatura === 'aguardando_medico') {
    return statusAssinatura;
  }
  if (statusAssinatura !== 'aguardando_paciente') return statusAssinatura;
  if (!contratoPacienteJaAssinou(documento)) return statusAssinatura;

  if (!contratoFluxoPacientePrimeiro(documento) && contratoTemAssinaturaMedica(documento)) {
    return 'assinado_completo';
  }
  return 'aguardando_medico';
}
