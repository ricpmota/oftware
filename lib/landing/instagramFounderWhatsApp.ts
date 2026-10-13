import { OFTWARE_WHATSAPP_CTA_NUMBER } from '@/lib/landing/oftwareWhatsAppCta';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';

export type InstagramFounderContactProfile = 'medico' | 'nutricionista' | 'personal' | 'paciente';

export const INSTAGRAM_FOUNDER_CONTACT_OPTIONS: { id: InstagramFounderContactProfile; label: string }[] = [
  { id: 'medico', label: 'Médico' },
  { id: 'nutricionista', label: 'Nutricionista' },
  { id: 'personal', label: 'Personal' },
  { id: 'paciente', label: 'Paciente' },
];

const FOUNDER_WHATSAPP_MESSAGES: Record<InstagramFounderContactProfile, string> = {
  medico: 'Sou Médico, gostaria de saber mais sobre sua clínica virtual.',
  nutricionista: 'Sou Nutricionista, gostaria de saber mais sobre sua clínica virtual.',
  personal: 'Sou Personal, gostaria de saber mais sobre sua clínica virtual.',
  paciente:
    'Olá, Dr. Ricardo! Vim pelo Instagram. Sou paciente e gostaria de conversar sobre o acompanhamento para emagrecimento.',
};

export function getInstagramFounderWhatsAppUrl(profile: InstagramFounderContactProfile): string {
  const message = FOUNDER_WHATSAPP_MESSAGES[profile];
  return (
    buildWhatsappUrl({ telefoneE164: OFTWARE_WHATSAPP_CTA_NUMBER }, message) ??
    `https://wa.me/${OFTWARE_WHATSAPP_CTA_NUMBER}?text=${encodeURIComponent(message)}`
  );
}
