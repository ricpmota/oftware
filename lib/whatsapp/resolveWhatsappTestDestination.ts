/**
 * Destino da tela TESTE DE ENVIO WHATSAPP.
 *
 * Fonte da verdade: o servidor resolve com telefone + DDI.
 * Nunca usa telefoneE164 nem phoneIsResolved vindos do browser.
 */
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';

export type WhatsappTestPhoneInput = {
  telefone?: string | null;
  telefoneDdi?: string | null;
  telefonePais?: string | null;
  /** Legado: callers que ainda enviam só `phone` (BR-only). */
  phone?: string | null;
};

export function resolveWhatsappTestDestination(input: WhatsappTestPhoneInput): string {
  const telefone = (input.telefone ?? input.phone ?? '').trim();
  return resolveInternationalPhone({
    telefone,
    telefoneDdi: input.telefoneDdi,
  });
}
