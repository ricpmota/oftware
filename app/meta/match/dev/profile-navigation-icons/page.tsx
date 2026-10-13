import type { Metadata } from 'next';
import { MatchProfileNavigationIcon } from '@/components/meta/match/profile/navigation/MatchProfileNavigationIcon';
import {
  MATCH_PROFILE_NAVIGATION_ICONS,
  MATCH_PROFILE_NAVIGATION_ORDER,
} from '@/components/meta/match/profile/navigation/matchProfileNavigationIcons';

export const metadata: Metadata = {
  title: 'Calibração da navegação — Match Saudável',
  robots: { index: false, follow: false },
};

export default function MatchProfileNavigationIconsPage() {
  return (
    <main className="min-h-dvh bg-[#F4F6F8] px-4 py-8 text-[#0A1F44]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A1F44]/45">Desenvolvimento</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Navegação do perfil</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0A1F44]/70">
          Sprite única em /icones-perfil.png. Esta página não entra na navegação do paciente.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {MATCH_PROFILE_NAVIGATION_ORDER.map((id) => {
            const item = MATCH_PROFILE_NAVIGATION_ICONS[id];
            return (
              <li key={id} className="rounded-2xl border border-[#E4E8F0] bg-white p-3">
                <div className="flex h-16 items-center justify-center rounded-xl bg-[#0A1F44]">
                  <MatchProfileNavigationIcon icon={id} size={40} />
                </div>
                <div className="mt-2 flex h-16 items-center justify-center rounded-xl bg-white">
                  <MatchProfileNavigationIcon icon={id} size={40} />
                </div>
                <p className="mt-2 text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-[#0A1F44]/50">{id}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
