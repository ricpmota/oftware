import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import {
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
  DEFAULT_PUBLIC_PAGE_LOGO_SRC,
} from '@/lib/whiteLabel/publicPagesTheme';
import {
  DEFAULT_WHITE_LABEL_PRIMARY_COLOR,
  resolveMedicoWhiteLabel,
} from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import {
  contatoChatContactName,
  contatoChatDisplayName,
  contatoChatSpokenName,
} from './contatoChatNames';
import {
  buildContatoChatWhatsAppUrl,
  contatoChatPhoneDigits,
  formatContatoChatPhoneDisplay,
} from './contatoChatPhone';
import { buildContatoChatVcardPath } from './contatoChatPublicPath';
import { CONTATO_CHAT_VCARD_NOTE } from './contatoChatVcard';
import { resolveContatoChatMedico } from './resolveContatoChatMedico';

const OFTWARE_WEBSITE = 'https://www.oftware.com.br';
const OFTWARE_NAME = 'Oftware';
const OFTWARE_LOGO = '/logo.png';

export type ContatoChatPublicData = {
  available: true;
  medicoId: string;
  slug: string;
  displayName: string;
  contactName: string;
  spokenName: string;
  photoUrl: string | null;
  organizationName: string;
  logoUrl: string;
  websiteUrl: string;
  phoneDigits: string;
  phoneDisplay: string;
  whatsappUrl: string;
  vcardUrl: string;
  note: string;
  accentColor: string;
  pageBg: string;
  pageText: string;
  crmEstado: string | null;
  crmNumero: string | null;
  isVerificado: boolean;
  faviconUrl: string | null;
  showPoweredByOftware: boolean;
};

export type ContatoChatLookupResult = ContatoChatPublicData | { available: false };

async function resolveOrganizationPresentation(organizationId: string | null): Promise<{
  name: string;
  logoUrl: string;
  websiteUrl: string;
}> {
  if (!organizationId) {
    return { name: OFTWARE_NAME, logoUrl: OFTWARE_LOGO, websiteUrl: OFTWARE_WEBSITE };
  }
  try {
    const branding = await getOrganizationBranding(organizationId as OrganizationId);
    return {
      name: branding.publicName?.trim() || OFTWARE_NAME,
      logoUrl: branding.publicPages?.dr?.logoUrl || branding.logoMainUrl || OFTWARE_LOGO,
      websiteUrl: branding.siteUrl?.trim() || OFTWARE_WEBSITE,
    };
  } catch {
    return { name: OFTWARE_NAME, logoUrl: OFTWARE_LOGO, websiteUrl: OFTWARE_WEBSITE };
  }
}

/**
 * Dados públicos de /contatochat.
 * O telefone vem só da conexão atual do Canal Chat — sem cópia no cadastro do médico.
 */
export async function getContatoChatData(opts: {
  medicoId?: string | null;
  slug?: string | null;
}): Promise<ContatoChatLookupResult> {
  try {
    if (!opts.medicoId?.trim() && !opts.slug?.trim()) {
      return { available: false };
    }

    const medico = await resolveContatoChatMedico(opts);
    if (!medico) return { available: false };

    const connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
    const phoneDigits = contatoChatPhoneDigits(connection?.phone || '');
    if (!phoneDigits) return { available: false };

    const org = await resolveOrganizationPresentation(medico.organizationId);
    const logoUrl = medico.logoUrl || org.logoUrl || DEFAULT_PUBLIC_PAGE_LOGO_SRC || OFTWARE_LOGO;
    const genero = medico.genero === 'F' || medico.genero === 'M' ? medico.genero : undefined;
    const whiteLabel = resolveMedicoWhiteLabel({
      nome: medico.nome,
      genero,
      fotoPerfilUrl: medico.fotoUrl,
      organizationId: medico.organizationId,
      whiteLabel: medico.whiteLabel,
    });
    const drPage = whiteLabel.publicPages.dr;

    return {
      available: true,
      medicoId: medico.id,
      slug: medico.slug,
      displayName: contatoChatDisplayName(medico.nome, medico.genero),
      contactName: contatoChatContactName(medico.nome, medico.genero),
      spokenName: contatoChatSpokenName(medico.nome, medico.genero),
      photoUrl: medico.fotoUrl || whiteLabel.profilePhotoUrl,
      organizationName: org.name,
      logoUrl: drPage.logoUrl || logoUrl,
      websiteUrl: org.websiteUrl,
      phoneDigits,
      phoneDisplay: formatContatoChatPhoneDisplay(phoneDigits),
      whatsappUrl: buildContatoChatWhatsAppUrl(phoneDigits),
      vcardUrl: buildContatoChatVcardPath({ medicoId: medico.id }),
      note: CONTATO_CHAT_VCARD_NOTE,
      accentColor: whiteLabel.primaryColor || DEFAULT_WHITE_LABEL_PRIMARY_COLOR,
      pageBg: drPage.backgroundColor || DEFAULT_DR_PAGE_BACKGROUND,
      pageText: drPage.textColor || DEFAULT_DR_PAGE_TEXT,
      crmEstado: medico.crmEstado,
      crmNumero: medico.crmNumero,
      isVerificado: medico.isVerificado,
      faviconUrl: whiteLabel.faviconUrl,
      showPoweredByOftware: whiteLabel.showPoweredByOftware,
    };
  } catch (error) {
    console.error(
      '[contatochat] Falha ao carregar contato público',
      error instanceof Error ? error.message : 'erro',
    );
    return { available: false };
  }
}
