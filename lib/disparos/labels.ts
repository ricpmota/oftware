import type {
  CampaignIgnoreReason,
  CampaignItemStatus,
  CampaignStatus,
  DisparosWhatsappStatus,
  ImportedContactStatus,
  PhoneChoice,
} from '@/lib/disparos/types';

export function contactStatusLabel(status: ImportedContactStatus): string {
  if (status === 'valido') return 'Válido';
  if (status === 'falta_ddd') return 'Falta DDD';
  if (status === 'invalido') return 'Telefone inválido';
  if (status === 'duplicado') return 'Duplicado';
  if (status === 'opt_out') return 'Opt-out';
  return 'Sem telefone';
}

export function whatsappStatusLabel(status: DisparosWhatsappStatus): string {
  if (status === 'connected') return 'Conectado';
  if (status === 'connecting') return 'Iniciando';
  if (status === 'qr_pending') return 'Aguardando QR';
  if (status === 'unavailable') return 'Sessão indisponível';
  if (status === 'error') return 'Erro';
  return 'Desconectado';
}

export function campaignStatusLabel(status: CampaignStatus): string {
  if (status === 'preparando') return 'Preparando';
  if (status === 'agendada') return 'Agendada';
  if (status === 'em_andamento') return 'Em andamento';
  if (status === 'pausada') return 'Pausada';
  if (status === 'concluida') return 'Concluída';
  if (status === 'cancelada') return 'Cancelada';
  return 'Erro';
}

export function itemStatusLabel(status: CampaignItemStatus): string {
  if (status === 'pending') return 'Pendente';
  if (status === 'processing') return 'Processando';
  if (status === 'sent') return 'Enviado';
  if (status === 'failed') return 'Falhou';
  if (status === 'needs_review') return 'Revisão';
  return 'Ignorado';
}

export function phoneChoiceLabel(choice: PhoneChoice): string {
  if (choice === 'telefone1') return 'Telefone 1';
  if (choice === 'telefone2') return 'Telefone 2';
  return 'Telefone 1 e, se estiver ausente, Telefone 2';
}

export function ignoreReasonLabel(reason: CampaignIgnoreReason | null): string {
  if (reason === 'opt_out') return 'Opt-out';
  if (reason === 'sem_telefone') return 'Sem o telefone escolhido';
  if (reason === 'invalido') return 'Telefone inválido';
  if (reason === 'falta_ddd') return 'Falta DDD';
  if (reason === 'duplicado') return 'Duplicado';
  return '';
}
