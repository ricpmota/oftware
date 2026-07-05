import type { MedicoInstagramBio } from '@/types/medicoInstagramBio';
import {
  INSTAGRAM_FOUNDER,
  INSTAGRAM_PROFILES,
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

const RICARDO_MOTA_EMAIL = 'ricpmota.med@gmail.com';
const OFTWARE_LOGO = '/oftware2.png';

export const INSTAGRAM_WHITE_LABEL_COPY = {
  headline: INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
  subtitle: INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
  profilePrompt: INSTAGRAM_BIO_TEXT_DEFAULTS.profilePrompt,
} as const;

function resolveWhatsAppPhone(medico: InstagramHubMedicoPublic): string | null {
  const fromBio = medico.instagramBio?.whatsapp?.trim();
  if (fromBio) return fromBio;
  return medico.telefone?.trim() || null;
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

function buildMedicoProfileItem(): InstagramProfileItem {
  return {
    kind: 'profile',
    id: 'medico',
    title: 'Sou Médico',
    iconKey: 'stethoscope',
    ctaLabel: 'Ver Clínica Digital',
    href: 'https://www.oftware.com.br',
    accent: 'green',
    modalIntro:
      'Transforme consultas em acompanhamento contínuo e construa uma clínica digital moderna.',
    benefits: [
      'Crie sua clínica digital',
      'Acompanhe pacientes além da consulta',
      'Menos dependência de plantões',
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

function partnerProfileFromHub(id: 'nutricionista' | 'personal'): InstagramProfileItem {
  const item = INSTAGRAM_PROFILES.find((profile) => profile.id === id);
  if (!item) {
    throw new Error(`Perfil Instagram ausente: ${id}`);
  }
  return { ...item };
}

export function buildInstagramWhiteLabelHub(medico: InstagramHubMedicoPublic): InstagramHubPageConfig {
  const tratamento = medicoTratamentoShort(medico.genero);
  const whatsappPhone = resolveWhatsAppPhone(medico);
  const copy = resolveCopy(medico);

  const emagrecerHref = resolveEmagrecerHref(medico);
  const logo = resolveLogo(medico);

  const profiles: InstagramProfileItem[] = [];

  if (medico.email === RICARDO_MOTA_EMAIL) {
    profiles.push(buildMedicoProfileItem());
  }

  profiles.push(buildEmagrecerProfileItem(emagrecerHref));
  profiles.push(partnerProfileFromHub('nutricionista'));
  profiles.push(partnerProfileFromHub('personal'));

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
  if (medico.email === RICARDO_MOTA_EMAIL) {
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
