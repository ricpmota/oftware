import { DISPAROS_SESSION_ID } from '@/lib/disparos/constants';
import type {
  AudienceChoice,
  CampaignIgnoreReason,
  CampaignTotals,
  DisparoCampaign,
  DisparoCampaignItem,
  DisparosWhatsappView,
  ImportedContact,
  NewDisparoDraft,
  PhoneChoice,
} from '@/lib/disparos/types';

export function renderDisparoMessage(template: string, primeiroNome: string): string {
  return template.replaceAll('{nome}', primeiroNome);
}

export function estimateDurationMinutes(recipients: number, intervalMinutes: number): number {
  if (recipients <= 1) return 0;
  return (recipients - 1) * intervalMinutes;
}

export function formatEstimatedDuration(recipients: number, intervalMinutes: number): string {
  const total = estimateDurationMinutes(recipients, intervalMinutes);
  if (total <= 0) return 'menos de 1 minuto';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `aproximadamente ${minutes}min`;
  if (minutes === 0) return `aproximadamente ${hours}h`;
  return `aproximadamente ${hours}h ${minutes}min`;
}

function resolveStoredPhone(
  phone: ImportedContact['telefone1'] | null,
): { phone: string | null; reason: CampaignIgnoreReason | null } {
  if (!phone || phone.issue === 'empty') return { phone: null, reason: 'sem_telefone' };
  if (phone.issue === 'falta_ddd') return { phone: null, reason: 'falta_ddd' };
  if (phone.issue === 'invalido' || !phone.normalized) return { phone: null, reason: 'invalido' };
  return { phone: phone.normalized, reason: null };
}

export function resolveCampaignPhone(
  contact: ImportedContact,
  choice: PhoneChoice,
): { phone: string | null; reason: CampaignIgnoreReason | null } {
  if (contact.optOut || contact.status === 'opt_out') return { phone: null, reason: 'opt_out' };
  const first = resolveStoredPhone(contact.telefone1);
  const second = contact.telefone2 ? resolveStoredPhone(contact.telefone2) : { phone: null, reason: 'sem_telefone' as const };
  if (choice === 'telefone1') return first;
  if (choice === 'telefone2') return second;
  if (first.phone) return first;
  return second;
}

function ignoreReasonForStatus(contact: ImportedContact): CampaignIgnoreReason {
  if (contact.optOut || contact.status === 'opt_out') return 'opt_out';
  if (contact.status === 'duplicado') return 'duplicado';
  if (contact.status === 'falta_ddd') return 'falta_ddd';
  if (contact.status === 'invalido') return 'invalido';
  return 'sem_telefone';
}

export function selectCampaignContacts(
  contacts: ImportedContact[],
  audience: AudienceChoice,
  selectedIds: ReadonlySet<string>,
): ImportedContact[] {
  if (audience === 'validos') return contacts.filter((contact) => contact.status === 'valido');
  return contacts.filter((contact) => selectedIds.has(contact.id));
}

export function totalsFromItems(items: DisparoCampaignItem[]): CampaignTotals {
  const totals: CampaignTotals = {
    total: items.length,
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    ignored: 0,
    revisao: 0,
  };
  for (const item of items) {
    if (item.status === 'pending') totals.pending += 1;
    else if (item.status === 'processing') totals.processing += 1;
    else if (item.status === 'sent') totals.sent += 1;
    else if (item.status === 'failed') totals.failed += 1;
    else if (item.status === 'needs_review') totals.revisao += 1;
    else totals.ignored += 1;
  }
  return totals;
}

export function processedCount(totals: CampaignTotals): number {
  return totals.sent + totals.failed + totals.ignored;
}

export function progressPercent(totals: CampaignTotals): number {
  if (totals.total === 0) return 0;
  return (processedCount(totals) / totals.total) * 100;
}

export function createDisparoCampaign(input: {
  contacts: ImportedContact[];
  selectedIds: ReadonlySet<string>;
  draft: NewDisparoDraft;
  importId: string;
  connection: DisparosWhatsappView;
  now?: Date;
}): DisparoCampaign {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `dsp-${now.getTime()}`;
  const source = selectCampaignContacts(input.contacts, input.draft.audience, input.selectedIds);
  const usedPhones = new Set<string>();

  const items: DisparoCampaignItem[] = source.map((contact, index) => {
    const base = {
      id: `${id}-i${index + 1}`,
      contactId: contact.id,
      nome: contact.nome,
      primeiroNome: contact.primeiroNome,
      updatedAt: null,
      remetenteLabel: null,
    };
    if (input.draft.audience === 'selecionados' && contact.status !== 'valido') {
      return {
        ...base,
        telefone: null,
        status: 'ignored' as const,
        ignoreReason: ignoreReasonForStatus(contact),
      };
    }
    const resolved = resolveCampaignPhone(contact, input.draft.phoneChoice);
    if (!resolved.phone) {
      return {
        ...base,
        telefone: null,
        status: 'ignored' as const,
        ignoreReason: resolved.reason ?? 'sem_telefone',
      };
    }
    if (usedPhones.has(resolved.phone)) {
      return {
        ...base,
        telefone: resolved.phone,
        status: 'ignored' as const,
        ignoreReason: 'duplicado' as const,
      };
    }
    usedPhones.add(resolved.phone);
    return {
      ...base,
      telefone: resolved.phone,
      status: 'pending' as const,
      ignoreReason: null,
    };
  });

  const totals = totalsFromItems(items);
  return {
    id,
    importId: input.importId,
    name: input.draft.name?.trim() || `Disparo ${now.toLocaleString('pt-BR')}`,
    createdAt,
    status: 'preparando',
    messageTemplate: input.draft.messageTemplate.trim(),
    intervalMinutes: input.draft.intervalMinutes,
    phoneChoice: input.draft.phoneChoice,
    audience: input.draft.audience,
    totals,
    remetente: {
      sessionId: DISPAROS_SESSION_ID,
      phone: input.connection.phone,
      profileName: input.connection.profileName,
      connectionStatus: input.connection.status,
    },
    items,
    nextRunAt: null,
    pauseReason: null,
    intervaloMs: input.draft.intervalMinutes * 60_000,
  };
}

export type PlannedDisparoItem = {
  contactId: string;
  nome: string;
  primeiroNome: string;
  telefone: string | null;
  mensagemFinal: string;
  status: 'pending' | 'ignored';
  ignoreReason: CampaignIgnoreReason | null;
};

/** Um contato da base vira um item de snapshot. `usedPhones` deduplica dentro da campanha. */
export function planDisparoContact(
  contact: ImportedContact,
  draft: Pick<NewDisparoDraft, 'audience' | 'phoneChoice' | 'messageTemplate'>,
  usedPhones: Set<string>,
): PlannedDisparoItem {
  const mensagemFinal = renderDisparoMessage(draft.messageTemplate, contact.primeiroNome);
  const base = {
    contactId: contact.id,
    nome: contact.nome,
    primeiroNome: contact.primeiroNome,
    mensagemFinal,
  };
  if (draft.audience === 'selecionados' && contact.status !== 'valido') {
    return { ...base, telefone: null, status: 'ignored', ignoreReason: ignoreReasonForStatus(contact) };
  }
  const resolved = resolveCampaignPhone(contact, draft.phoneChoice);
  if (!resolved.phone) {
    return { ...base, telefone: null, status: 'ignored', ignoreReason: resolved.reason ?? 'sem_telefone' };
  }
  if (usedPhones.has(resolved.phone)) {
    return { ...base, telefone: resolved.phone, status: 'ignored', ignoreReason: 'duplicado' };
  }
  usedPhones.add(resolved.phone);
  return { ...base, telefone: resolved.phone, status: 'pending', ignoreReason: null };
}
export function pauseDisparoCampaign(campaign: DisparoCampaign): DisparoCampaign {
  if (campaign.status !== 'preparando' && campaign.status !== 'em_andamento') return campaign;
  return { ...campaign, status: 'pausada' };
}

/**
 * Retoma somente o estado da campanha.
 * Não marca item pendente como enviado e não reabre item já concluído.
 */
export function resumeDisparoCampaign(campaign: DisparoCampaign): DisparoCampaign {
  if (campaign.status !== 'pausada') return campaign;
  return { ...campaign, status: 'em_andamento', items: campaign.items.map((item) => ({ ...item })) };
}
