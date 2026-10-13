import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';

export const OFTWARE_WHATSAPP_CTA_NUMBER = '5583988192848';

export const OFTWARE_WHATSAPP_CTA_MESSAGE =
  'Quero criar minha estrutura digital de acompanhamento em saúde na Oftware.';

export function getOftwareWhatsAppCtaUrl(): string {
  return (
    buildWhatsappUrl({ telefoneE164: OFTWARE_WHATSAPP_CTA_NUMBER }, OFTWARE_WHATSAPP_CTA_MESSAGE) ??
    `https://wa.me/${OFTWARE_WHATSAPP_CTA_NUMBER}?text=${encodeURIComponent(OFTWARE_WHATSAPP_CTA_MESSAGE)}`
  );
}

export function openOftwareWhatsAppCta(): void {
  window.open(getOftwareWhatsAppCtaUrl(), '_blank', 'noopener,noreferrer');
}
