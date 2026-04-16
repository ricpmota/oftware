/**
 * Tipos TypeScript da feature Meta Personal
 * 
 * Define as interfaces para os documentos do Firestore relacionados
 * à funcionalidade de Personal Trainers.
 */

import { PERSONAL_STATUS, SOLICITACAO_STATUS } from './metaPersonal.constants';

export type PersonalStatus = typeof PERSONAL_STATUS[keyof typeof PERSONAL_STATUS];
export type SolicitacaoStatus = typeof SOLICITACAO_STATUS[keyof typeof SOLICITACAO_STATUS];

/**
 * Documento do Personal Trainer na collection 'personal_trainers'
 */
export interface PersonalTrainerDoc {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  registroNumero: string; // CREF ou registro profissional (apenas números)
  telefone: string; // Telefone para contato
  cidades: {
    estado: string;
    cidade: string;
  }[];
  isVerificado: boolean; // Verificação do Personal Trainer pelo admin
  status: PersonalStatus; // 'ativo' | 'inativo'
  medicoVinculadoIds: string[]; // IDs dos médicos vinculados
  dataCadastro: Date;
}

/**
 * Documento de solicitação de vínculo entre Personal Trainer e médico
 * na collection 'solicitacoes_vinculo_personal_medico'
 */
export interface SolicitacaoVinculoPersonalMedicoDoc {
  id: string;
  medicoId: string;
  personalTrainerId: string;
  solicitadoPor: 'medico' | 'personal_trainer'; // Quem iniciou a solicitação
  status: SolicitacaoStatus; // 'pendente' | 'aceita' | 'rejeitada' | 'cancelada'
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  // Campos extras para exibição
  personalTrainerNome?: string;
  personalTrainerEmail?: string;
  medicoNome?: string;
}

/**
 * Documento de solicitação de acesso do Personal Trainer a um paciente
 * na collection 'solicitacoes_personal_trainer'
 */
export interface SolicitacaoPersonalTrainerDoc {
  id: string;
  pacienteId: string;
  personalTrainerId: string;
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
  personalTrainerNome?: string;
}

/**
 * Documento de relacionamento entre paciente e Personal Trainer
 * na collection 'paciente_personal_trainer'
 */
export interface PacientePersonalTrainerDoc {
  id: string;
  pacienteId: string;
  personalTrainerId: string;
  medicoId: string; // Médico que compartilhou o paciente
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
  removidoEm?: Date;
  motivoRemocao?: string;
}
