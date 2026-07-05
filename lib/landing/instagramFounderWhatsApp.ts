import { OFTWARE_WHATSAPP_CTA_NUMBER } from '@/lib/landing/oftwareWhatsAppCta';

export type InstagramFounderContactProfile = 'medico' | 'nutricionista' | 'personal' | 'paciente';

export const INSTAGRAM_FOUNDER_CONTACT_OPTIONS: { id: InstagramFounderContactProfile; label: string }[] = [
  { id: 'medico', label: 'Médico' },
  { id: 'nutricionista', label: 'Nutricionista' },
  { id: 'personal', label: 'Personal' },
  { id: 'paciente', label: 'Paciente' },
];

const FOUNDER_WHATSAPP_MESSAGES: Record<InstagramFounderContactProfile, string> = {
  medico:
    'Olá, Dr. Ricardo! Vim pelo Instagram. Sou médico e gostaria de conversar sobre a Clínica Digital da Oftware.',
  nutricionista:
    'Olá, Dr. Ricardo! Vim pelo Instagram. Sou nutricionista e gostaria de saber como me cadastrar no sistema.',
  personal:
    'Olá, Dr. Ricardo! Vim pelo Instagram. Sou personal trainer e gostaria de saber como me cadastrar no sistema.',
  paciente:
    'Olá, Dr. Ricardo! Vim pelo Instagram. Sou paciente e gostaria de conversar sobre o acompanhamento para emagrecimento.',
};

export function getInstagramFounderWhatsAppUrl(profile: InstagramFounderContactProfile): string {
  const message = FOUNDER_WHATSAPP_MESSAGES[profile];
  return `https://wa.me/${OFTWARE_WHATSAPP_CTA_NUMBER}?text=${encodeURIComponent(message)}`;
}
