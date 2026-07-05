export const OFTWARE_WHATSAPP_CTA_NUMBER = '5583988192848';

export const OFTWARE_WHATSAPP_CTA_MESSAGE =
  'Quero criar minha própria Plataforma de Acompanhamento em Emagrecimento.';

export function getOftwareWhatsAppCtaUrl(): string {
  return `https://wa.me/${OFTWARE_WHATSAPP_CTA_NUMBER}?text=${encodeURIComponent(OFTWARE_WHATSAPP_CTA_MESSAGE)}`;
}

export function openOftwareWhatsAppCta(): void {
  window.open(getOftwareWhatsAppCtaUrl(), '_blank', 'noopener,noreferrer');
}
