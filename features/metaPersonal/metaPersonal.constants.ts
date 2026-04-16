/**
 * Constantes da feature Meta Personal
 * 
 * Define status, collections do Firestore e outras constantes relacionadas
 * à funcionalidade de Personal Trainers no sistema Oftware.
 */

// Status do Personal Trainer
export const PERSONAL_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
} as const;

export type PersonalStatus = typeof PERSONAL_STATUS[keyof typeof PERSONAL_STATUS];

// Status de solicitações (padrão usado em outras solicitações do sistema)
export const SOLICITACAO_STATUS = {
  PENDENTE: 'pendente',
  ACEITA: 'aceita',
  REJEITADA: 'rejeitada',
  CANCELADA: 'cancelada',
  AGUARDANDO_MEDICO: 'aguardando_medico', // Status especial: aguarda médico aceitar primeiro
} as const;

export type SolicitacaoStatus = typeof SOLICITACAO_STATUS[keyof typeof SOLICITACAO_STATUS];

// Collections do Firestore
export const COL_PERSONAL_TRAINERS = 'personal_trainers';
export const COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO = 'solicitacoes_vinculo_personal_medico';
export const COL_SOLICITACOES_PERSONAL_TRAINER = 'solicitacoes_personal_trainer';
export const COL_PACIENTE_PERSONAL_TRAINER = 'paciente_personal_trainer';
