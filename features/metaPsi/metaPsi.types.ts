/**
 * Tipos da feature MetaPsi — identidade do Psiquiatra.
 * Etapa 1: documento profissional.
 * Etapa 2: vínculo profissional Médico ↔ Psiquiatra (sem pacientes).
 */

import {
  PSIQUIATRA_STATUS,
  SOLICITACAO_VINCULO_PSIQUIATRA_STATUS,
} from './metaPsi.constants';

export type PsiquiatraStatus = (typeof PSIQUIATRA_STATUS)[keyof typeof PSIQUIATRA_STATUS];

export type SolicitacaoVinculoPsiquiatraStatus =
  (typeof SOLICITACAO_VINCULO_PSIQUIATRA_STATUS)[keyof typeof SOLICITACAO_VINCULO_PSIQUIATRA_STATUS];

/**
 * Documento do psiquiatra na collection `psiquiatras/{authUid}`.
 */
export interface PsiquiatraDoc {
  id: string;
  userId: string;
  email: string;
  nome: string;
  /** Número do CRM (apenas dígitos). */
  registroNumero: string;
  /** UF do CRM (ex.: SP). */
  crmUf: string;
  /** RQE opcional. */
  rqe: string;
  especialidade: string;
  telefone: string;
  /** DDI sem '+'. Ausente = legado Brasil. */
  telefoneDdi?: string;
  /** ISO-3166 alpha-2 (ex.: "BR", "US", "PT"). */
  telefonePais?: string;
  cidades: {
    estado: string;
    cidade: string;
  }[];
  isVerificado: boolean;
  status: PsiquiatraStatus;
  /**
   * IDs canônicos de médicos vinculados (doc id / userId conforme resolução no aceite).
   * Não concede acesso a pacientes — isso é etapa 3.
   */
  medicoVinculadoIds: string[];
  dataCadastro: Date;
  docVerificacaoCnhUrl?: string;
  docVerificacaoSelfieUrl?: string;
  docVerificacaoRegistroUrl?: string;
  cep?: string;
  nomeLocal?: string;
  endereco?: string;
  numero?: string;
  pontoReferencia?: string;
  googleMapsUrl?: string;
  instagramUsuario?: string;
  genero?: 'M' | 'F' | '';
  fotoPerfilUrl?: string | null;
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
}

/**
 * Solicitação de vínculo profissional em `solicitacoes_vinculo_psiquiatra_medico`.
 */
export interface SolicitacaoVinculoPsiquiatraMedicoDoc {
  id: string;
  medicoId: string;
  psiquiatraId: string;
  solicitadoPor: 'medico' | 'psiquiatra';
  status: SolicitacaoVinculoPsiquiatraStatus;
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  psiquiatraNome?: string;
  psiquiatraEmail?: string;
  medicoNome?: string;
}

/**
 * Solicitação de compartilhamento de paciente em `solicitacoes_psiquiatra`.
 */
export interface SolicitacaoPsiquiatraDoc {
  id: string;
  pacienteId: string;
  psiquiatraId: string;
  medicoId: string;
  status: SolicitacaoVinculoPsiquiatraStatus;
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  pacienteNome?: string;
  medicoNome?: string;
  psiquiatraNome?: string;
  psiquiatraEmail?: string;
}

/**
 * ACL paciente ↔ psiquiatra em `paciente_psiquiatra/{pacienteId}_{psiquiatraId}`.
 * Fonte de verdade da autorização (não o mirror no paciente).
 */
export interface PacientePsiquiatraDoc {
  id: string;
  pacienteId: string;
  psiquiatraId: string;
  medicoId: string;
  status: 'ativo' | 'inativo' | 'removido';
  dataCompartilhamento: Date;
  removidoEm?: Date;
  motivoRemocao?: string;
}
