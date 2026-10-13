import type { Metadata } from 'next';
import { MatchMessagesScreen } from '@/components/meta/match/messages/MatchMessagesScreen';

export const metadata: Metadata = {
  title: 'Mensagens — Match Saudável',
};

export default function MatchMessagesPage() {
  return <MatchMessagesScreen />;
}
