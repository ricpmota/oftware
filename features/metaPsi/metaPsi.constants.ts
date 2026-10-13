/**
 * Constantes da feature MetaPsi (portal do Psiquiatra).
 *
 * Convenção de nomes nesta etapa:
 * - collection: `psiquiatras`
 * - domínio / role: `psiquiatra`
 * - UI wizard tipo: `psi`
 */

export const PSIQUIATRA_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
} as const;

export type PsiquiatraStatus = (typeof PSIQUIATRA_STATUS)[keyof typeof PSIQUIATRA_STATUS];

export const COL_PSIQUIATRAS = 'psiquiatras';

/** Vínculo profissional Médico ↔ Psiquiatra (sem compartilhamento de paciente). */
export const COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO = 'solicitacoes_vinculo_psiquiatra_medico';

/** Solicitação de compartilhamento de um paciente específico com Psiquiatra. */
export const COL_SOLICITACOES_PSIQUIATRA = 'solicitacoes_psiquiatra';

/** Fonte de verdade ACL Paciente ↔ Psiquiatra. Doc id: `{pacienteId}_{psiquiatraId}`. */
export const COL_PACIENTE_PSIQUIATRA = 'paciente_psiquiatra';

/**
 * Slot atômico: no máximo um Psiquiatra ativo por paciente.
 * Doc id = pacienteId. Usado em runTransaction no aceite/encerramento.
 * Não substitui paciente_psiquiatra (SoT de ACL); só serializa concorrência.
 */
export const COL_PACIENTE_PSIQUIATRA_SLOT = 'paciente_psiquiatra_slot';

/** Status alinhados a Nutri/Personal. */
export const SOLICITACAO_VINCULO_PSIQUIATRA_STATUS = {
  PENDENTE: 'pendente',
  ACEITA: 'aceita',
  REJEITADA: 'rejeitada',
  CANCELADA: 'cancelada',
  AGUARDANDO_MEDICO: 'aguardando_medico',
} as const;

export type SolicitacaoVinculoPsiquiatraStatus =
  (typeof SOLICITACAO_VINCULO_PSIQUIATRA_STATUS)[keyof typeof SOLICITACAO_VINCULO_PSIQUIATRA_STATUS];

/** Reexport de status para solicitações de paciente (mesmo enum). */
export const SOLICITACAO_PSIQUIATRA_STATUS = SOLICITACAO_VINCULO_PSIQUIATRA_STATUS;

/** Especialidade fixa do profissional neste portal. */
export const PSIQUIATRA_ESPECIALIDADE = 'Psiquiatria';

export const PSIQUIATRA_REGISTRO_LABEL = 'CRM';
