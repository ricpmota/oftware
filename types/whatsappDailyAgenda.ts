import type { AutoAplicacaoPainelItemStatus } from '@/types/whatsappAutoAplicacao';

/** Tipos de automação exibidos na agenda ao vivo do Log. */
export type WhatsappDailyAgendaKind =
  | 'aplicacao_dia'
  | 'aplicacao_d1'
  | 'aplicacao_atrasada'
  | 'injetavel_dia'
  | 'injetavel_d1'
  | 'aniversario'
  | 'conclusao'
  | 'calendario_lembrete';

export type WhatsappDailyAgendaItemStatus = AutoAplicacaoPainelItemStatus | 'processing';

export interface WhatsappDailyAgendaItem {
  id: string;
  kind: WhatsappDailyAgendaKind;
  automationId: string;
  automationLabel: string;
  pacienteId: string;
  pacienteNome: string;
  telefone?: string;
  /** Dia civil da aplicação/marco (para D-1 = dia da aplicação; para envio = scheduledDateKey). */
  dateKey: string;
  scheduledDateKey: string;
  horarioConfigurado: string;
  status: WhatsappDailyAgendaItemStatus;
  semana?: number;
  dose?: number;
  enviadoEm?: Date;
  motivo?: string;
}

export interface WhatsappDailyAgendaItemDto {
  id: string;
  kind: WhatsappDailyAgendaKind;
  automationId: string;
  automationLabel: string;
  pacienteId: string;
  pacienteNome: string;
  telefone?: string;
  dateKey: string;
  scheduledDateKey: string;
  horarioConfigurado: string;
  status: WhatsappDailyAgendaItemStatus;
  semana?: number;
  dose?: number;
  enviadoEm?: string;
  motivo?: string;
}

export interface WhatsappDailyAgendaDto {
  dateKey: string;
  brasilDateKey: string;
  brasilHhmm: string;
  whatsappConnected: boolean;
  /** Flag efetiva da aplicação do dia (legado / flap). */
  autoAplicacaoEnabled: boolean;
  /** Automações WhatsApp ativas do médico (fila + aplicação do dia). */
  activatedKinds: WhatsappDailyAgendaKind[];
  items: WhatsappDailyAgendaItemDto[];
}

export function toWhatsappDailyAgendaItemDto(
  item: WhatsappDailyAgendaItem,
): WhatsappDailyAgendaItemDto {
  return {
    id: item.id,
    kind: item.kind,
    automationId: item.automationId,
    automationLabel: item.automationLabel,
    pacienteId: item.pacienteId,
    pacienteNome: item.pacienteNome,
    telefone: item.telefone,
    dateKey: item.dateKey,
    scheduledDateKey: item.scheduledDateKey,
    horarioConfigurado: item.horarioConfigurado,
    status: item.status,
    semana: item.semana,
    dose: item.dose,
    enviadoEm: item.enviadoEm?.toISOString(),
    motivo: item.motivo,
  };
}

export function whatsappDailyAgendaKindLabel(kind: WhatsappDailyAgendaKind): string {
  switch (kind) {
    case 'aplicacao_dia':
      return 'Aplicação (dia)';
    case 'aplicacao_d1':
      return 'D-1';
    case 'aplicacao_atrasada':
      return 'Atrasada';
    case 'injetavel_dia':
      return 'Injetável (dia)';
    case 'injetavel_d1':
      return 'Injetável D-1';
    case 'aniversario':
      return 'Aniversário';
    case 'conclusao':
      return 'Conclusão';
    case 'calendario_lembrete':
      return 'Lembretes';
    default:
      return kind;
  }
}
