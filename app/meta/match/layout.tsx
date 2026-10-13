import { MatchPresencePing } from '@/components/meta/match/MatchPresencePing';
import { MatchSocialNav } from '@/components/meta/match/MatchSocialNav';

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-[#06142e]">
      <MatchPresencePing />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      <MatchSocialNav />
    </div>
  );
}
