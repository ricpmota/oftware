import type { Metadata } from 'next';
import { buildContatoChatMetadata } from '@/lib/contatochat/contatoChatMetadata';

export const metadata: Metadata = buildContatoChatMetadata();

export default function ContatoChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
