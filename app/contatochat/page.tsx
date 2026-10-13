import ContatoChatUnavailable from '@/components/contatochat/ContatoChatUnavailable';
import ContatoChatView from '@/components/contatochat/ContatoChatView';
import { buildContatoChatMetadata } from '@/lib/contatochat/contatoChatMetadata';
import { getContatoChatData } from '@/lib/contatochat/getContatoChatData';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; medico?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const data = await getContatoChatData({
    medicoId: params.m || params.medico,
    slug: params.slug,
  });
  if (!data.available) {
    return buildContatoChatMetadata({ available: false });
  }
  return buildContatoChatMetadata({ displayName: data.displayName });
}

export default async function ContatoChatPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; medico?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const data = await getContatoChatData({
    medicoId: params.m || params.medico,
    slug: params.slug,
  });

  if (!data.available) {
    return <ContatoChatUnavailable />;
  }

  return <ContatoChatView data={data} />;
}
