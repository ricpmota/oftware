import type { Metadata } from 'next';

export const CANAL_CHAT_LINK_TITLE = 'Canal Chat — salve o contato de notificações';
export const CANAL_CHAT_LINK_DESCRIPTION =
  'Canal Chat é o canal oficial de notificações, novidades e atualizações do seu acompanhamento. Salve o contato no celular.';

export function buildContatoChatMetadata(opts?: {
  displayName?: string | null;
  available?: boolean;
}): Metadata {
  const available = opts?.available !== false;
  const displayName = opts?.displayName?.trim();
  const title = !available
    ? 'Canal Chat — contato indisponível'
    : displayName
      ? `Canal Chat · ${displayName}`
      : CANAL_CHAT_LINK_TITLE;
  const description = !available
    ? 'Não encontramos um Canal Chat configurado para este profissional.'
    : CANAL_CHAT_LINK_DESCRIPTION;

  return {
    title,
    description,
    applicationName: 'Canal Chat',
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: 'Canal Chat',
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
