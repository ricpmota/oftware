import type { Metadata } from 'next';
import { MatchChatScreen } from '@/components/meta/match/messages/MatchChatScreen';

export const metadata: Metadata = {
  title: 'Conversa — Match Saudável',
};

export default async function MatchChatPage({ params }: { params: Promise<{ pairKey: string }> }) {
  const { pairKey } = await params;
  return <MatchChatScreen pairKey={pairKey} />;
}
