import type { Metadata } from 'next';

const SITE_ORIGIN = 'https://www.oftware.com.br';

export const CINQUENTA_KG_DEPOIS_BOOK_TITLE = '50 KG DEPOIS';

export const CINQUENTA_KG_DEPOIS_BOOK_DESCRIPTION =
  'Uma história real. Uma transformação possível. De 153 kg para 103 kg — a verdadeira história de disciplina, ciência e transformação de vida.';

/** Imagem OG gerada em 1200×630 (app/50kgdepois/opengraph-image.tsx). */
export const CINQUENTA_KG_DEPOIS_OG_IMAGE_URL = `${SITE_ORIGIN}/50kgdepois/opengraph-image`;

export function buildCinquentaKgDepoisMetadata(path = '/50kgdepois'): Metadata {
  const pageUrl = `${SITE_ORIGIN}${path}`;

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: {
      default: `${CINQUENTA_KG_DEPOIS_BOOK_TITLE} — Entrevista biográfica`,
      template: `%s · ${CINQUENTA_KG_DEPOIS_BOOK_TITLE}`,
    },
    description: CINQUENTA_KG_DEPOIS_BOOK_DESCRIPTION,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: CINQUENTA_KG_DEPOIS_BOOK_TITLE,
      description: CINQUENTA_KG_DEPOIS_BOOK_DESCRIPTION,
      url: pageUrl,
      siteName: 'Oftware',
      locale: 'pt_BR',
      type: 'website',
      images: [
        {
          url: CINQUENTA_KG_DEPOIS_OG_IMAGE_URL,
          secureUrl: CINQUENTA_KG_DEPOIS_OG_IMAGE_URL,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: '50 KG DEPOIS — De 153 kg para 103 kg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: CINQUENTA_KG_DEPOIS_BOOK_TITLE,
      description: CINQUENTA_KG_DEPOIS_BOOK_DESCRIPTION,
      images: [CINQUENTA_KG_DEPOIS_OG_IMAGE_URL],
    },
  };
}
