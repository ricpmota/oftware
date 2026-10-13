import type { InstagramFounderContactProfile } from '@/lib/landing/instagramFounderWhatsApp';
import type { WhiteLabelProfissao } from '@/lib/whiteLabel/profissao';

export type WhiteLabelLeadFlowMode = 'default' | 'instagram';

export function isInstagramFounderContactProfile(
  id: string
): id is InstagramFounderContactProfile {
  return id === 'medico' || id === 'nutricionista' || id === 'personal';
}

export function whiteLabelProfissaoToFounderContact(
  profissao: WhiteLabelProfissao
): InstagramFounderContactProfile {
  return profissao;
}

export function buildWhiteLabelInstagramQuestionnaireUrl(profissao: WhiteLabelProfissao): string {
  return `/whitelabel?origem=instagram&profissao=${profissao}`;
}
