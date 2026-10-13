import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { formatInternationalPhoneDisplay } from '@/lib/phone/internationalPhoneValue';
import { normalizeMedicoInstagramUsuario } from '@/utils/instagramUsuario';

export function normalizeLeadWhiteLabelWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function normalizeLeadWhiteLabelEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function normalizeLeadWhiteLabelInstagram(input: string): string {
  const normalized = normalizeMedicoInstagramUsuario(input);
  return normalized ? `@${normalized}` : input.trim();
}

export function isValidLeadWhiteLabelEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatLeadWhiteLabelWhatsAppDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '');
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length <= 2) return local ? `(${local}` : '';
  if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
  if (local.length <= 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return `+${d.slice(0, 2)} (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

/**
 * Máscara BR de display para cadastro/legado sem DDI estruturado.
 * Lead com `whatsappDdi` deve usar `formatLeadWhiteLabelContactDisplay`.
 */
export function formatLeadWhiteLabelContactDisplay(lead: {
  whatsapp?: string | null;
  whatsappDdi?: string | null;
  whatsappPais?: string | null;
}): string {
  const whatsapp = lead.whatsapp || '';
  if (lead.whatsappDdi) {
    return formatInternationalPhoneDisplay({
      telefone: whatsapp,
      telefoneDdi: lead.whatsappDdi,
      telefonePais: lead.whatsappPais,
    });
  }
  return formatLeadWhiteLabelWhatsAppDisplay(whatsapp);
}

export function getLeadWhiteLabelWhatsAppUrl(
  whatsapp: string,
  whatsappDdi?: string | null,
): string | null {
  return buildWhatsappUrl({
    telefone: whatsapp,
    telefoneDdi: whatsappDdi || undefined,
  });
}

export function getLeadWhiteLabelInstagramUrl(instagram: string): string | null {
  const handle = normalizeMedicoInstagramUsuario(instagram);
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}
