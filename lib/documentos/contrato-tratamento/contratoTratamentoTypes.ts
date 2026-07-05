import type { ContratoOpcaoEntregaMaterial } from '@/lib/contratos/contratoOpcaoEntregaMaterial';
import type { ContratoTratamentoPocValidacao } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPocValidacao';
import { SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO } from '@/types/digitalSignature';

/** Status do ciclo de assinatura do contrato de tratamento. */
export type ContratoTratamentoStatusAssinatura =
  | 'rascunho'
  | 'assinado_medico'
  | 'aguardando_paciente'
  | 'aguardando_medico'
  | 'assinado_completo';

export const CONTRATO_TRATAMENTO_STATUS_LABELS: Record<ContratoTratamentoStatusAssinatura, string> = {
  rascunho: 'Rascunho',
  assinado_medico: 'Assinado pelo médico',
  aguardando_paciente: 'Aguardando assinatura do paciente',
  aguardando_medico: 'Aguardando assinatura do médico',
  assinado_completo: 'Assinatura completa',
};

export type ContratoTratamentoFluxoAssinatura = 'paciente_primeiro' | 'medico_primeiro';

export type ContratoTratamentoTipoDocumento = typeof SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO;

export type ContratoTratamentoPacienteSignStatus =
  | 'link_gerado'
  | 'assinado'
  | 'erro_gerar_link';

export type ContratoTratamentoDocumentoRecord = {
  id: string;
  tipoDocumento: ContratoTratamentoTipoDocumento;
  /** @deprecated Preferir pdfAssinadoMedicoUrl */
  pdfUrl?: string;
  pdfAssinadoMedicoUrl?: string;
  pdfFinalAssinadoUrl?: string;
  createdAt: Date;
  medicoAssinadoEm?: Date;
  medicoId: string;
  pacienteId: string;
  hashDocumento: string;
  statusAssinatura: ContratoTratamentoStatusAssinatura;
  /** ID da solicitação em digitalSignatureRequests (quando assinado digitalmente). */
  signatureRequestId?: string;
  /** Preparado para link de assinatura do paciente (etapa futura BRy). */
  pacienteSignLinkToken?: string;
  pacienteSignLinkUrl?: string | null;
  pacienteSignIframeUrl?: string | null;
  pacienteSignStatus?: ContratoTratamentoPacienteSignStatus | null;
  pacienteSignRequestedAt?: Date;
  pacienteSignErrorMessage?: string | null;
  pacienteSignErrorAt?: Date | null;
  pacienteAssinadoEm?: Date | null;
  /** POC EasySign — envelope BRy para assinatura do paciente. */
  easysignPoc?: boolean;
  bryEasySignEnvelopeId?: string;
  bryEasySignDocumentUuid?: string;
  /** POC — validação manual futura (Adobe / ITI). */
  pocValidacao?: ContratoTratamentoPocValidacao;
  /** Opção escolhida pelo paciente antes de assinar (material em casa vs clínica). */
  opcaoEntregaMaterial?: ContratoOpcaoEntregaMaterial | null;
  opcaoEntregaMaterialEm?: Date | null;
  /** PDF gerado com {{opcao1}}/{{opcao2}} antes da assinatura EasySign do paciente. */
  pdfParaAssinaturaPacienteUrl?: string | null;
  /** Fluxo atual: paciente escolhe/assina antes do médico (padrão) ou legado médico primeiro. */
  fluxoAssinatura?: ContratoTratamentoFluxoAssinatura;
  /** Quando o médico solicitou assinatura do paciente no portal. */
  solicitadoPacienteEm?: Date | null;
};

export type ContratoTratamentoPlaceholderMap = {
  nomeMedico: string;
  crmMedico: string;
  ufCrmMedico: string;
  enderecoMedico: string;
  cidadeMedico: string;
  estadoMedico: string;
  nomePaciente: string;
  cpfPaciente: string;
  rgPaciente: string;
  dataNascimentoPaciente: string;
  enderecoPaciente: string;
  cidadePaciente: string;
  estadoPaciente: string;
  cidadeForo: string;
  estadoForo: string;
  dataImpressao: string;
  dataAssinaturaMedico: string;
  dataAssinaturaPaciente: string;
  hashDocumento: string;
  assinaturaDigitalMedico: string;
  assinaturaDigitalPaciente: string;
  opcao1: string;
  opcao2: string;
};

export type ContratoTratamentoBuildContext = {
  medicoId: string;
  pacienteId: string;
  /** Quando informado, preenche data/assinatura do médico no template. */
  assinaturaMedicoEm?: Date;
  /** Quando informado, preenche data/assinatura do paciente no template. */
  assinaturaPacienteEm?: Date;
  /** Hash exibido no documento (pré ou pós-assinatura). */
  hashDocumento?: string;
  /** Texto do bloco de assinatura digital do médico no corpo do documento. */
  assinaturaDigitalMedico?: string;
  /** Texto do bloco de assinatura digital do paciente no corpo do documento. */
  assinaturaDigitalPaciente?: string;
  /** PDF para assinatura digital: reserva espaço visual sem textos "Pendente". */
  reservaAssinaturaDigitalNoPdf?: boolean;
  /** Marcação ( {{opcao1}} ) / ( {{opcao2}} ) no contrato. */
  opcaoEntregaMaterial?: ContratoOpcaoEntregaMaterial | null;
};
