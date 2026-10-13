import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

/** Rota provisória descontinuada — redireciona para /dr oficial. */
export default async function DrProvisorioRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  const path = Array.isArray(slug) && slug.length > 0 ? slug.map(encodeURIComponent).join('/') : '';
  redirect(path ? `/dr/${path}` : '/dr');
}
