import type { Metadata } from 'next';
import { MatchProfileIcon } from '@/components/meta/match/icons/MatchProfileIcon';
import {
  MATCH_PROFILE_ICON_CATEGORIES,
  MATCH_PROFILE_ICONS,
  type MatchProfileIconId,
} from '@/components/meta/match/icons/matchProfileIcons';

export const metadata: Metadata = {
  title: 'Calibração de ícones — Match Saudável',
  robots: { index: false, follow: false },
};

const IDS = Object.keys(MATCH_PROFILE_ICONS) as MatchProfileIconId[];

export default function MatchIconCalibrationPage() {
  return (
    <main className="min-h-dvh bg-[#F4F6F8] px-4 py-8 text-[#0A1F44]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A1F44]/45">
          Desenvolvimento
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Ícones do perfil</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0A1F44]/70">
          Uma única sprite em /match/profile-icons.png. Esta página não entra na navegação do paciente.
        </p>

        {MATCH_PROFILE_ICON_CATEGORIES.map((category) => {
          const icons = IDS.filter((id) => MATCH_PROFILE_ICONS[id].category === category.id);
          return (
            <section key={category.id} className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0A1F44]/50">
                {category.label}
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {icons.map((id) => {
                  const item = MATCH_PROFILE_ICONS[id];
                  return (
                    <li key={id} className="rounded-2xl border border-[#E4E8F0] bg-white p-3">
                      <div className="flex h-16 items-center justify-center rounded-xl bg-[#0A1F44]">
                        <MatchProfileIcon icon={id} size={40} />
                      </div>
                      <div className="mt-2 flex h-16 items-center justify-center rounded-xl bg-white">
                        <MatchProfileIcon icon={id} size={40} />
                      </div>
                      <p className="mt-2 text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-[#0A1F44]/50">{id}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
