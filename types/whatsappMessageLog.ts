export type WhatsappMessageLogType =
  | 'auto_aplicacao'
  | 'aplicacao_d1'
  | 'aplicacao_atrasada'
  | 'injetavel_dia'
  | 'injetavel_d1'
  | 'aniversario'
  | 'conclusao'
  | 'nutri_checkin'
  | 'calendario_lembrete'
  | 'compartilhamento_equipe'
  | 'prontuario_consulta_nutri'
  | 'prontuario_consulta_personal'
  | 'whitelabel_meeting'
  | 'financeiro_cobranca'
  | 'canal_chat_confirmacao'
  | 'cobranca_automatica'
  | 'boas_vindas_tratamento'
  | 'solicitacao_acompanhamento'
  | 'exames_laboratoriais'
  | 'exames_imagem'
  | 'bioimpedancia'
  | 'plano_terapeutico'
  | 'cardapio_nutri'
  | 'orientacoes_nutri'
  | 'treino_personal'
  | 'hidratacao_checkin'
  | 'cadastro_link'
  | 'test';

export type WhatsappMessageLogStatus = 'sent' | 'failed';

export interface WhatsappMessageLog {
  id: string;
  medicoId: string;
  type: WhatsappMessageLogType;
  status: WhatsappMessageLogStatus;
  sentAt: Date;
  phone?: string;
  messagePreview?: string;
  pacienteId?: string;
  pacienteNome?: string;
  aplicacaoData?: string;
  semana?: number;
  dose?: number;
  errorMessage?: string;
}

export interface WhatsappMessageLogDto {
  id: string;
  type: WhatsappMessageLogType;
  status: WhatsappMessageLogStatus;
  sentAt: string;
  phone?: string;
  messagePreview?: string;
  pacienteId?: string;
  pacienteNome?: string;
  aplicacaoData?: string;
  semana?: number;
  dose?: number;
  errorMessage?: string;
}

export function toWhatsappMessageLogDto(log: WhatsappMessageLog): WhatsappMessageLogDto {
  return {
    id: log.id,
    type: log.type,
    status: log.status,
    sentAt: log.sentAt.toISOString(),
    phone: log.phone,
    messagePreview: log.messagePreview,
    pacienteId: log.pacienteId,
    pacienteNome: log.pacienteNome,
    aplicacaoData: log.aplicacaoData,
    semana: log.semana,
    dose: log.dose,
    errorMessage: log.errorMessage,
  };
}
