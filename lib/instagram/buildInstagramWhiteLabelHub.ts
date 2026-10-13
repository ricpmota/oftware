import type { MedicoInstagramBio } from '@/types/medicoInstagramBio';
import {
  INSTAGRAM_FOUNDER,
  INSTAGRAM_PLATFORM_HREFS,
  INSTAGRAM_PROFILES,
  INSTAGRAM_WHITELABEL_PARTNER_COPY,
  type InstagramFounderItem,
  type InstagramProfileItem,
} from '@/components/instagram/instagramHubData';
import {
  applyInstagramBioNomeTemplate,
  INSTAGRAM_BIO_DEFAULT_EMAGRECIMENTO_URL,
  INSTAGRAM_BIO_TEXT_DEFAULTS,
  medicoTratamentoShort,
  resolveInstagramBioEmagrecimentoHref,
} from '@/lib/instagram/instagramBioConfig';
import type { InstagramHubMedicoPublic, InstagramHubPageConfig } from '@/lib/instagram/instagramWhiteLabelTypes';
import { getMedicoWhatsAppUrl } from '@/lib/instagram/medicoWhatsAppUrl';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { phoneFieldsFromProfessional } from '@/lib/whatsapp/resolveProfessionalPhone';
import type { InternationalPhoneFields } from '@/lib/phone/buildWhatsappUrl';

const RICARDO_MOTA_EMAIL = 'ricpmota.med@gmail.com';
const OFTWARE_LOGO = '/oftware2.png';

export const INSTAGRAM_WHITE_LABEL_COPY = {
  headline: INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
  subtitle: INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
  profilePrompt: INSTAGRAM_BIO_TEXT_DEFAULTS.profilePrompt,
} as const;

function resolveWhatsAppPhone(medico: InstagramHubMedicoPublic): InternationalPhoneFields | null {
  const fromBio = medico.instagramBio?.whatsapp?.trim();
  if (fromBio) {
    return { telefoneE164: fromBio };
  }
  if (!medico.telefone?.trim()) return null;
  return phoneFieldsFromProfessional(medico);
}

function resolveLogo(medico: InstagramHubMedicoPublic): {
  src: string;
  variant: 'oftware' | 'avatar' | 'custom';
} {
  const bioLogo = medico.instagramBio?.logoUrl?.trim();
  if (bioLogo) return { src: bioLogo, variant: 'custom' };

  if (medico.fotoPerfilUrl?.trim()) {
    return { src: medico.fotoPerfilUrl.trim(), variant: 'avatar' };
  }

  const wl = medico.whiteLabel;
  const wlLogo =
    wl?.drPageLogoUrl?.trim() ||
    wl?.publicPageLogoUrl?.trim() ||
    wl?.ogImageUrl?.trim();
  if (wlLogo) return { src: wlLogo, variant: 'custom' };

  return { src: OFTWARE_LOGO, variant: 'oftware' };
}

function buildMedicoProfileItem(toFounderWhatsApp: boolean): InstagramProfileItem {
  const founderMedico = INSTAGRAM_PROFILES.find((profile) => profile.id === 'medico');
  return {
    kind: 'profile',
    id: 'medico',
    title: 'Sou Médico',
    iconKey: 'stethoscope',
    ctaLabel: toFounderWhatsApp ? 'Falar no WhatsApp' : 'Ver Clínica Digital',
    href: toFounderWhatsApp
      ? getInstagramFounderWhatsAppUrl('medico')
      : INSTAGRAM_PLATFORM_HREFS.medico,
    accent: 'green',
    modalIntro:
      founderMedico?.modalIntro ||
      'Tenha sua própria plataforma para acompanhar pacientes e construir um programa de acompanhamento contínuo.',
    benefits: founderMedico?.benefits || [
      'Sua própria plataforma com sua marca',
      'Acompanhamento contínuo dos pacientes',
      'Prescrições, exames e evolução em um só lugar',
      'Menos dependência de consultas isoladas',
    ],
  };
}

function buildEmagrecerProfileItem(emagrecerHref: string): InstagramProfileItem {
  return {
    kind: 'profile',
    id: 'emagrecer',
    title: 'Quero Emagrecer',
    iconKey: 'heart',
    ctaLabel: INSTAGRAM_BIO_TEXT_DEFAULTS.emagrecerCtaLabel,
    href: emagrecerHref,
    accent: 'emerald',
    benefits: [
      'Programa de emagrecimento com acompanhamento',
      'Equipe médica e multidisciplinar',
      'Resultados sustentáveis a longo prazo',
    ],
  };
}

function resolveCopy(medico: InstagramHubMedicoPublic) {
  const bio = medico.instagramBio;
  return {
    headline: bio?.headline?.trim() || INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
    subtitle: bio?.subtitle?.trim() || INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
    profilePrompt: INSTAGRAM_BIO_TEXT_DEFAULTS.profilePrompt,
  };
}

function resolveEmagrecerHref(medico: InstagramHubMedicoPublic): string {
  const fromBio = resolveInstagramBioEmagrecimentoHref(medico.instagramBio);
  if (fromBio) return fromBio;
  return INSTAGRAM_BIO_DEFAULT_EMAGRECIMENTO_URL;
}

function partnerProfileFromHub(
  id: 'nutricionista' | 'personal',
  toFounderWhatsApp: boolean,
): InstagramProfileItem {
  const item = INSTAGRAM_PROFILES.find((profile) => profile.id === id);
  if (!item) {
    throw new Error(`Perfil Instagram ausente: ${id}`);
  }
  if (toFounderWhatsApp) {
    return {
      ...item,
      ctaLabel: 'Falar no WhatsApp',
      href: getInstagramFounderWhatsAppUrl(id),
    };
  }
  const legacy = INSTAGRAM_WHITELABEL_PARTNER_COPY[id];
  return {
    ...item,
    ctaLabel: legacy.ctaLabel,
    href: INSTAGRAM_PLATFORM_HREFS[id],
    modalIntro: legacy.modalIntro,
    benefits: legacy.benefits,
  };
}

export function buildInstagramWhiteLabelHub(medico: InstagramHubMedicoPublic): InstagramHubPageConfig {
  const tratamento = medicoTratamentoShort(medico.genero);
  const whatsappPhone = resolveWhatsAppPhone(medico);
  const copy = resolveCopy(medico);
  const isRicardo = medico.email === RICARDO_MOTA_EMAIL;

  const emagrecerHref = resolveEmagrecerHref(medico);
  const logo = resolveLogo(medico);

  const profiles: InstagramProfileItem[] = [];

  if (isRicardo) {
    profiles.push(buildMedicoProfileItem(true));
  }

  profiles.push(buildEmagrecerProfileItem(emagrecerHref));
  profiles.push(partnerProfileFromHub('nutricionista', isRicardo));
  profiles.push(partnerProfileFromHub('personal', isRicardo));

  const contactLabelTemplate =
    medico.instagramBio?.contactButtonLabel?.trim() ||
    INSTAGRAM_BIO_TEXT_DEFAULTS.contactButtonLabel;
  const contactModalTemplate =
    medico.instagramBio?.contactModalText?.trim() ||
    INSTAGRAM_BIO_TEXT_DEFAULTS.contactModalText;

  const contactTitle = applyInstagramBioNomeTemplate(contactLabelTemplate, medico.nome, medico.genero);
  const contactModalText = applyInstagramBioNomeTemplate(
    contactModalTemplate,
    medico.nome,
    medico.genero,
  );

  const whatsappGeral = getMedicoWhatsAppUrl(
    whatsappPhone,
    `Olá, ${tratamento} ${medico.nome}! Vim pelo Instagram e gostaria de conversar.`,
  );

  let founder: InstagramFounderItem | null = null;
  if (isRicardo) {
    founder = { ...INSTAGRAM_FOUNDER };
  } else if (whatsappGeral) {
    founder = {
      kind: 'founder',
      id: 'fundador',
      title: contactTitle,
      description: `Converse diretamente com ${tratamento} ${medico.nome} pelo WhatsApp.`,
      modalTitle: contactTitle,
      modalText: contactModalText,
      ctaLabel: 'Falar no WhatsApp',
      href: whatsappGeral,
      openWhatsAppDirectly: true,
      benefits: [
        'Atendimento direto pelo WhatsApp',
        'Tire dúvidas sobre o acompanhamento',
        'Conheça o programa de emagrecimento',
      ],
    };
  }

  return {
    copy,
    profiles,
    founder,
    logoSrc: logo.src,
    logoVariant: logo.variant,
    logoAlt: medico.nome,
    footerText: `${tratamento} ${medico.nome} · Oftware`,
  };
}

export type { MedicoInstagramBio };
