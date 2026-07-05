import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import {
  contratoFluxoPacientePrimeiro,
  contratoPacienteJaAssinou,
  contratoTemAssinaturaMedica,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';

/** Paciente ainda precisa assinar o contrato (bloqueia portal /meta). */
export function contratoPacienteAssinaturaPendente(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return false;
  if (contratoPacienteJaAssinou(documento)) return false;
  if (documento.statusAssinatura !== 'aguardando_paciente') return false;

  // Fluxo legado: exige PDF do médico antes de liberar portal
  if (!contratoFluxoPacientePrimeiro(documento) && !contratoTemAssinaturaMedica(documento)) {
    return false;
  }

  return true;
}

/** PDF assinado pelo médico disponível. */
export function contratoTemPdfAssinadoMedico(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  return contratoTemAssinaturaMedica(documento);
}

/**
 * Contrato legado que pode receber link EasySign manual (médico assinou primeiro).
 */
export function contratoElegivelDisponibilizarPaciente(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return false;
  if (documento.statusAssinatura !== 'aguardando_paciente') return false;
  if (contratoFluxoPacientePrimeiro(documento)) return false;
  if (!contratoTemPdfAssinadoMedico(documento)) return false;
  if (documento.pdfFinalAssinadoUrl?.trim()) return false;
  return true;
}

/** Aguardando paciente com link já gerado (portal ativo). */
export function contratoPacienteLinkJaGerado(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return false;
  return Boolean(documento.pacienteSignLinkUrl?.trim());
}

/** Médico precisa assinar após o paciente (fluxo paciente primeiro). */
export function contratoMedicoAssinaturaPendente(
  documento: ContratoTratamentoDocumentoRecord | null | undefined
): boolean {
  if (!documento) return false;
  return documento.statusAssinatura === 'aguardando_medico';
}
