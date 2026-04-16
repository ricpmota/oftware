/**
 * Constantes da feature Meta Nutri
 * 
 * Define status, collections do Firestore e outras constantes relacionadas
 * à funcionalidade de nutricionistas no sistema Oftware.
 */

// Status do nutricionista
export const NUTRI_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
} as const;

export type NutriStatus = typeof NUTRI_STATUS[keyof typeof NUTRI_STATUS];

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
export const COL_NUTRICIONISTAS = 'nutricionistas';
export const COL_SOLICITACOES_VINCULO_NUTRI_MEDICO = 'solicitacoes_vinculo_nutri_medico';
export const COL_SOLICITACOES_NUTRICIONISTA = 'solicitacoes_nutricionista';
export const COL_PACIENTE_NUTRICIONISTA = 'paciente_nutricionista';
