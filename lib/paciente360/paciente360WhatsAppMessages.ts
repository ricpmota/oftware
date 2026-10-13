import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360Summary } from '@/types/paciente360';
import {
  primeiroNomeLead,
  renderWhatsAppLeadPresetBody,
  suggestWhatsAppLeadPresetDefaultKey,
  WHATSAPP_LEAD_PRESET_DEFAULTS,
} from '@/lib/paciente360/whatsappLeadPresetDefaults';
import {
  buildWhatsappUrl,
  type InternationalPhoneFields,
} from '@/lib/phone/buildWhatsappUrl';

/**
 * Prefixador BR-only (legado CRM / tel:). Não é fonte de wa.me internacional.
 * Links de WhatsApp devem usar `buildWhatsappUrl` / `buildPatientWhatsappUrl`.
 */
export function cleanPhoneBr(telefone?: string | null): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function primeiroNome(lead: LeadMedico, summary?: Paciente360Summary): string {
  return primeiroNomeLead(lead.name || summary?.nome);
}

export type BuildPaciente360WhatsAppMessageOptions = {
  /** Nome público da organização do médico (nunca “Oftware”). */
  organizationName?: string | null;
};

/**
 * Mensagem contextual legada (um único texto). Preferir o seletor de presets no CRM.
 * Usa o nome da organização, não Oftware.
 */
export function buildPaciente360WhatsAppMessage(
  summary: Paciente360Summary | undefined,
  lead: LeadMedico,
  options?: BuildPaciente360WhatsAppMessageOptions
): string {
  const key = suggestWhatsAppLeadPresetDefaultKey({
    proximaAcaoTipo: summary?.proximaAcao?.tipo,
    statusComposto: summary?.statusComposto,
    proximaAcaoLabel: summary?.proximaAcao?.label,
    leadStatus: lead.status,
  });
  const seed = WHATSAPP_LEAD_PRESET_DEFAULTS.find((d) => d.defaultKey === key)!;
  return renderWhatsAppLeadPresetBody(seed.body, {
    nome: primeiroNome(lead, summary),
    organizacao: options?.organizationName,
    referral: lead.referral,
  });
}

export function buildPaciente360WhatsAppUrl(
  telefone: string | undefined | null,
  message: string,
  ident?: InternationalPhoneFields | null
): string | null {
  if (ident?.telefone || ident?.telefoneDdi || ident?.telefoneE164) {
    return buildWhatsappUrl(
      {
        telefone: ident.telefone ?? telefone,
        telefoneDdi: ident.telefoneDdi,
        telefoneE164: ident.telefoneE164,
      },
      message
    );
  }
  return buildWhatsappUrl({ telefone }, message);
}
