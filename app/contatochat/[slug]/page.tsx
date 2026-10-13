import ContatoChatUnavailable from '@/components/contatochat/ContatoChatUnavailable';
import ContatoChatView from '@/components/contatochat/ContatoChatView';
import { buildContatoChatMetadata } from '@/lib/contatochat/contatoChatMetadata';
import { getContatoChatData } from '@/lib/contatochat/getContatoChatData';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await getContatoChatData({ slug });
  if (!data.available) {
    return buildContatoChatMetadata({ available: false });
  }
  return buildContatoChatMetadata({ displayName: data.displayName });
}

export default async function ContatoChatSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getContatoChatData({ slug });

  if (!data.available) {
    return <ContatoChatUnavailable />;
  }

  return <ContatoChatView data={data} />;
}
