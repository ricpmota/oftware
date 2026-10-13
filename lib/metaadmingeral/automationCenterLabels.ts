import type {
  AutomationCategory,
  AutomationChannel,
  AutomationStatus,
  AutomationTemplateStatus,
} from '@/types/automationCenter';

const CHANNEL_LABELS: Record<AutomationChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  push: 'Push',
  sms: 'SMS',
  voice_ai: 'Voz IA',
};

const CATEGORY_LABELS: Record<AutomationCategory, string> = {
  jornada: 'Jornada',
  financeiro: 'Financeiro',
  onboarding: 'Onboarding',
  marketing: 'Marketing',
  relacionamento: 'Relacionamento',
  sistema: 'Sistema',
  exames: 'Exames',
  prescricao: 'Prescrição',
};

const STATUS_LABELS: Record<AutomationStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  inactive: 'Inativo',
  planned: 'Planejado',
};

const TEMPLATE_STATUS_LABELS: Record<AutomationTemplateStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  inactive: 'Inativo',
  planned: 'Planejado',
};

export function channelLabel(channel: AutomationChannel): string {
  return CHANNEL_LABELS[channel];
}

export function categoryLabel(category: AutomationCategory): string {
  return CATEGORY_LABELS[category];
}

export function statusLabel(status: AutomationStatus): string {
  return STATUS_LABELS[status];
}

export function templateStatusLabel(status: AutomationTemplateStatus): string {
  return TEMPLATE_STATUS_LABELS[status];
}

export function statusTone(status: AutomationStatus): 'success' | 'warn' | 'neutral' | 'muted' {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
    case 'planned':
      return 'warn';
    case 'inactive':
      return 'muted';
    default:
      return 'neutral';
  }
}

export function templateStatusTone(
  status: AutomationTemplateStatus,
): 'success' | 'warn' | 'neutral' | 'muted' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
    case 'planned':
      return 'warn';
    case 'inactive':
      return 'muted';
    default:
      return 'neutral';
  }
}

export function formatAutomationTimeWindow(start?: string, end?: string): string {
  if (!start && !end) return '—';
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? '—';
}

export function formatAutomationBoolean(value: boolean): string {
  return value ? 'Sim' : 'Não';
}
