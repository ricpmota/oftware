import type { LeadReferralSnapshot, LeadReferralType } from '@/types/leadMedico';
import type {
  WhatsAppLeadPreset,
  WhatsAppLeadPresetDefaultKey,
  WhatsAppLeadPresetDefaultSeed,
} from '@/types/whatsappLeadPreset';

/** Presets padrão da plataforma (marca = organização do médico, não Oftware). */
export const WHATSAPP_LEAD_PRESET_DEFAULTS: WhatsAppLeadPresetDefaultSeed[] = [
  {
    defaultKey: 'bem_vindo',
    title: 'Bem-vindo',
    body: 'Olá, {nome}. Tudo bem? Vi que vc se cadastrou no sistema para acompanhamento médico em emagrecimento{indicacao}. Posso te ajudar?',
    order: 0,
  },
  {
    defaultKey: 'continuidade',
    title: 'Continuidade do acompanhamento',
    body: 'Olá, {nome}. Tudo bem? Vamos dar continuidade ao seu acompanhamento pela {organizacao}?',
    order: 1,
  },
  {
    defaultKey: 'pagamento',
    title: 'Pendência de pagamento',
    body: 'Olá, {nome}. Tudo bem? Estou passando para te lembrar sobre a pendência do seu acompanhamento. Podemos regularizar para manter seu tratamento em dia?',
    order: 2,
  },
  {
    defaultKey: 'aplicacao',
    title: 'Revisar aplicação',
    body: 'Olá, {nome}. Tudo bem? Vi aqui que precisamos revisar sua aplicação/seguimento. Pode me atualizar como você está?',
    order: 3,
  },
  {
    defaultKey: 'evolucao',
    title: 'Acompanhar evolução',
    body: 'Olá, {nome}. Tudo bem? Estou acompanhando sua evolução por aqui. Como você está se sentindo nessa semana?',
    order: 4,
  },
];

export const WHATSAPP_LEAD_PRESET_PLACEHOLDERS = [
  { token: '{nome}', label: 'Primeiro nome do lead' },
  { token: '{organizacao}', label: 'Nome da organização' },
  {
    token: '{indicacao}',
    label: 'Trecho “ por indicação de Fulano” (vazio se Direto / sem origem)',
  },
] as const;

/** Origens em que não se menciona indicação (contato direto do médico). */
const REFERRAL_TYPES_SEM_INDICACAO: ReadonlySet<LeadReferralType> = new Set([
  'medico',
  'dr_link',
  'desconhecido',
]);

/**
 * Trecho opcional: ` por indicação de Fulano`.
 * Vazio quando a origem é Direto (médico) ou não há nome de quem indicou.
 */
export function formatIndicacaoPhrase(
  referral?: Pick<LeadReferralSnapshot, 'type' | 'sourceName'> | null
): string {
  if (!referral) return '';
  if (REFERRAL_TYPES_SEM_INDICACAO.has(referral.type)) return '';
  const name = referral.sourceName?.trim();
  if (!name) return '';
  return ` por indicação de ${name}`;
}

export function virtualDefaultPresetId(defaultKey: WhatsAppLeadPresetDefaultKey): string {
  return `default:${defaultKey}`;
}

export function isVirtualDefaultPresetId(id: string): boolean {
  return id.startsWith('default:');
}

export function parseVirtualDefaultKey(id: string): WhatsAppLeadPresetDefaultKey | null {
  if (!isVirtualDefaultPresetId(id)) return null;
  const key = id.slice('default:'.length) as WhatsAppLeadPresetDefaultKey;
  return WHATSAPP_LEAD_PRESET_DEFAULTS.some((d) => d.defaultKey === key) ? key : null;
}

export function buildVirtualDefaultPresets(medicoId: string): WhatsAppLeadPreset[] {
  return WHATSAPP_LEAD_PRESET_DEFAULTS.map((seed) => ({
    id: virtualDefaultPresetId(seed.defaultKey),
    medicoId,
    title: seed.title,
    body: seed.body,
    isDefault: true,
    defaultKey: seed.defaultKey,
    order: seed.order,
    archived: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
}

/**
 * Une presets padrão (código) com overrides/customizações do médico no Firestore.
 * Overrides usam `defaultKey`; mensagens novas não têm `defaultKey`.
 */
export function mergeWhatsAppLeadPresets(
  medicoId: string,
  stored: WhatsAppLeadPreset[]
): WhatsAppLeadPreset[] {
  const overrideByKey = new Map<WhatsAppLeadPresetDefaultKey, WhatsAppLeadPreset>();
  const customs: WhatsAppLeadPreset[] = [];

  for (const item of stored) {
    if (item.archived) continue;
    if (item.defaultKey) {
      overrideByKey.set(item.defaultKey, { ...item, isDefault: true });
    } else {
      customs.push({ ...item, isDefault: false });
    }
  }

  const defaults = WHATSAPP_LEAD_PRESET_DEFAULTS.map((seed) => {
    const override = overrideByKey.get(seed.defaultKey);
    if (override) {
      return {
        ...override,
        isDefault: true,
        defaultKey: seed.defaultKey,
        order: override.order ?? seed.order,
      };
    }
    return {
      id: virtualDefaultPresetId(seed.defaultKey),
      medicoId,
      title: seed.title,
      body: seed.body,
      isDefault: true,
      defaultKey: seed.defaultKey,
      order: seed.order,
      archived: false,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } satisfies WhatsAppLeadPreset;
  });

  customs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pt-BR'));

  return [...defaults, ...customs];
}

export function primeiroNomeLead(rawName?: string | null): string {
  const first = (rawName || '').trim().split(/\s+/)[0];
  return first || 'tudo bem';
}

export type RenderWhatsAppLeadPresetVars = {
  nome?: string | null;
  organizacao?: string | null;
  /** Snapshot de origem do lead; controla `{indicacao}` */
  referral?: Pick<LeadReferralSnapshot, 'type' | 'sourceName'> | null;
  /** Override explícito do trecho de indicação (já formatado ou vazio) */
  indicacao?: string | null;
};

export function renderWhatsAppLeadPresetBody(
  body: string,
  vars: RenderWhatsAppLeadPresetVars
): string {
  const nome = primeiroNomeLead(vars.nome);
  const organizacao = (vars.organizacao || '').trim() || 'nossa clínica';
  const indicacao =
    vars.indicacao !== undefined && vars.indicacao !== null
      ? vars.indicacao
      : formatIndicacaoPhrase(vars.referral);
  return body
    .replaceAll('{nome}', nome)
    .replaceAll('{organizacao}', organizacao)
    .replaceAll('{indicacao}', indicacao);
}

/** Sugere o preset padrão mais adequado ao contexto do lead (só para destaque visual). */
export function suggestWhatsAppLeadPresetDefaultKey(ctx: {
  proximaAcaoTipo?: string | null;
  statusComposto?: string | null;
  proximaAcaoLabel?: string | null;
  leadStatus?: string | null;
}): WhatsAppLeadPresetDefaultKey {
  if (ctx.proximaAcaoTipo === 'cobrar_pagamento') return 'pagamento';
  if (ctx.proximaAcaoTipo === 'avaliar_aplicacao') return 'aplicacao';
  if (
    ctx.statusComposto === 'pendente' ||
    ctx.statusComposto === 'aguardando_marco_zero' ||
    ctx.proximaAcaoLabel === 'Iniciar acompanhamento' ||
    ctx.leadStatus === 'nao_qualificado' ||
    ctx.leadStatus === 'enviado_contato'
  ) {
    return 'bem_vindo';
  }
  return 'evolucao';
}
