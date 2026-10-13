import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { normalizeWhatsappPhone } from '@/services/whatsappProviderClient';

export function contatoChatPhoneDigits(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    return normalizeWhatsappPhone(value);
  } catch {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
  }
}

/** Ex.: 5583988192848 → +55 (83) 98819-2848 */
export function formatContatoChatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return d ? `+${d}` : '';
}

const DEFAULT_WHATSAPP_TEXT = 'Olá! Salvei este contato para receber minhas notificações.';

export function buildContatoChatWhatsAppUrl(
  digits: string,
  text: string = DEFAULT_WHATSAPP_TEXT,
): string {
  return buildWhatsappUrl({ telefoneE164: digits }, text) ?? '';
}
