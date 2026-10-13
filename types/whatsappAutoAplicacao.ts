export type WhatsappAutoAplicacaoEnvioStatus = 'sent' | 'failed';

export interface WhatsappAutoAplicacaoEnvio {
  id: string;
  medicoId: string;
  pacienteId: string;
  data: string;
  semana: number;
  dose: number;
  status: WhatsappAutoAplicacaoEnvioStatus;
  sentAt: Date;
  errorMessage?: string;
}

export function buildWhatsappAutoAplicacaoEnvioId(
  medicoId: string,
  pacienteId: string,
  data: string,
  semana: number,
): string {
  return `${medicoId}_${pacienteId}_${data}_${semana}`;
}

export function buildWhatsappAutoAplicacaoEnvioKey(
  pacienteId: string,
  data: string,
  semana: number,
): string {
  return `${pacienteId}:${data}:${semana}`;
}

export type AutoAplicacaoPainelItemStatus = 'sent' | 'failed' | 'pending' | 'skipped';

export interface AutoAplicacaoPainelItem {
  pacienteId: string;
  pacienteNome: string;
  telefone?: string;
  aplicacaoData: string;
  semana: number;
  dose: number;
  horarioConfigurado: string;
  status: AutoAplicacaoPainelItemStatus;
  enviadoEm?: Date;
  motivo?: string;
}

export interface AutoAplicacaoPainelItemDto {
  pacienteId: string;
  pacienteNome: string;
  telefone?: string;
  aplicacaoData: string;
  semana: number;
  dose: number;
  horarioConfigurado: string;
  status: AutoAplicacaoPainelItemStatus;
  enviadoEm?: string;
  motivo?: string;
}

export interface AutoAplicacaoPainelDto {
  dateKey: string;
  brasilDateKey: string;
  brasilHhmm: string;
  horarioConfigurado: string;
  autoAplicacaoEnabled: boolean;
  whatsappConnected: boolean;
  aplicacoes: AutoAplicacaoPainelItemDto[];
}

export function toAutoAplicacaoPainelItemDto(item: AutoAplicacaoPainelItem): AutoAplicacaoPainelItemDto {
  return {
    pacienteId: item.pacienteId,
    pacienteNome: item.pacienteNome,
    telefone: item.telefone,
    aplicacaoData: item.aplicacaoData,
    semana: item.semana,
    dose: item.dose,
    horarioConfigurado: item.horarioConfigurado,
    status: item.status,
    enviadoEm: item.enviadoEm?.toISOString(),
    motivo: item.motivo,
  };
}
