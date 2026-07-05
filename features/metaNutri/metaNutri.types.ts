/**
 * Tipos TypeScript da feature Meta Nutri
 * 
 * Define as interfaces para os documentos do Firestore relacionados
 * à funcionalidade de nutricionistas.
 */

import { NUTRI_STATUS, SOLICITACAO_STATUS } from './metaNutri.constants';

export type NutriStatus = typeof NUTRI_STATUS[keyof typeof NUTRI_STATUS];
export type SolicitacaoStatus = typeof SOLICITACAO_STATUS[keyof typeof SOLICITACAO_STATUS];

/**
 * Documento do nutricionista na collection 'nutricionistas'
 */
export interface NutricionistaDoc {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  registroNumero: string; // CRN ou registro profissional (apenas números)
  telefone: string; // Telefone para contato
  cidades: {
    estado: string;
    cidade: string;
  }[];
  isVerificado: boolean; // Verificação do nutricionista pelo admin
  status: NutriStatus; // 'ativo' | 'inativo'
  medicoVinculadoIds: string[]; // IDs dos médicos vinculados
  dataCadastro: Date;
  /** URLs de documentos enviados no fluxo de verificação (Suporte). */
  docVerificacaoCnhUrl?: string;
  docVerificacaoSelfieUrl?: string;
  /** Foto do registro profissional (CRN). */
  docVerificacaoRegistroUrl?: string;
}

/**
 * Documento de solicitação de vínculo entre nutricionista e médico
 * na collection 'solicitacoes_vinculo_nutri_medico'
 */
export interface SolicitacaoVinculoNutriMedicoDoc {
  id: string;
  medicoId: string;
  nutricionistaId: string;
  solicitadoPor: 'medico' | 'nutricionista'; // Quem iniciou a solicitação
  status: SolicitacaoStatus; // 'pendente' | 'aceita' | 'rejeitada' | 'cancelada'
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  // Campos extras para exibição
  nutricionistaNome?: string;
  nutricionistaEmail?: string;
  medicoNome?: string;
}

/**
 * Documento de solicitação de acesso do nutricionista a um paciente
 * na collection 'solicitacoes_nutricionista'
 */
export interface SolicitacaoNutricionistaDoc {
  id: string;
  pacienteId: string;
  nutricionistaId: string;
  medicoId: string; // Médico que está compartilhando o paciente
  status: SolicitacaoStatus; // 'pendente' | 'aceita' | 'rejeitada' | 'cancelada'
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  // Campos extras (opcionais, podem estar presentes)
  pacienteNome?: string;
  medicoNome?: string;
  nutricionistaNome?: string;
}

/**
 * Documento de relacionamento entre paciente e nutricionista
 * na collection 'paciente_nutricionista'
 */
export interface PacienteNutricionistaDoc {
  id: string;
  pacienteId: string;
  nutricionistaId: string;
  medicoId: string; // Médico que compartilhou o paciente
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
  removidoEm?: Date;
  motivoRemocao?: string;
}
