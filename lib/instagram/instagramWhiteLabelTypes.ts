import type { MedicoInstagramBio } from '@/types/medicoInstagramBio';
import type { InstagramFounderItem, InstagramProfileItem } from '@/components/instagram/instagramHubData';
import { INSTAGRAM_HUB_COPY } from '@/components/instagram/instagramHubData';

export type InstagramHubMedicoPublic = {
  id: string;
  nome: string;
  genero?: 'M' | 'F';
  email: string;
  telefone?: string | null;
  fotoPerfilUrl?: string | null;
  crm: { estado: string; numero: string };
  status?: 'ativo' | 'inativo';
  instagramBio?: MedicoInstagramBio | null;
  whiteLabel?: {
    drPageLogoUrl?: string | null;
    publicPageLogoUrl?: string | null;
    ogImageUrl?: string | null;
  };
};

export type InstagramHubPageConfig = {
  copy: typeof INSTAGRAM_HUB_COPY;
  profiles: InstagramProfileItem[];
  founder: InstagramFounderItem | null;
  trailingProfiles?: InstagramProfileItem[];
  logoSrc: string;
  logoVariant?: 'oftware' | 'avatar' | 'custom';
  logoAlt: string;
  footerText: string;
};
