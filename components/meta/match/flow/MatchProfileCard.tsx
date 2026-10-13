'use client';

import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import type { MatchViewerCard } from '@/lib/match/matchProfile';

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0A1F44]/45">{label}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-full bg-[#E8F8EE] px-3 py-1.5 text-sm font-medium text-[#0A1F44]"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MatchProfileCard({
  card,
  showConnectionPreview = false,
}: {
  card: MatchViewerCard;
  showConnectionPreview?: boolean;
}) {
  const photo = card.primaryPhoto;

  return (
    <article className="overflow-hidden rounded-3xl border border-[#E7ECF3] bg-white shadow-[0_18px_40px_-28px_rgba(10,31,68,0.45)]">
      <div className="relative aspect-[4/5] max-h-[420px] bg-[#F4F6F8]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center text-5xl font-extrabold text-[#0A1F44]/25">
            {card.displayName.slice(0, 1).toUpperCase() || 'M'}
          </div>
        )}
      </div>
      <div className="px-4 py-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0A1F44]">
          {card.displayName || 'Seu nome'}
          {card.age != null ? <span className="font-semibold text-[#0A1F44]/70">, {card.age}</span> : null}
        </h2>
        {card.cityLine ? <p className="mt-1 text-sm text-[#0A1F44]/60">{card.cityLine}</p> : null}
        {card.achievements.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {card.achievements.map((item) => (
              <li key={item.recordId}>
                <MatchAchievementBadge
                  achievementId={item.achievementId}
                  size={40}
                  surface="light"
                  verified={item.verified}
                  decorative
                />
              </li>
            ))}
          </ul>
        ) : null}
        {card.goals.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {card.goals.map((item) => (
              <li key={item.recordId}>
                <MatchAchievementBadge
                  achievementId={item.goalId}
                  size={40}
                  variant="outline"
                  surface="light"
                  decorative
                />
              </li>
            ))}
          </ul>
        ) : null}
        {card.bio ? <p className="mt-3 text-[15px] leading-relaxed text-[#0A1F44]/80">{card.bio}</p> : null}
        <ChipRow label="Interesses" items={card.interests} />
        <ChipRow label="Quer viver" items={card.activities} />
        <ChipRow label="Conexão" items={card.connectionGoals} />
        {card.availabilityLine ? (
          <p className="mt-4 text-sm text-[#0A1F44]/70">
            <span className="font-semibold text-[#0A1F44]">Tempo livre. </span>
            {card.availabilityLine}
          </p>
        ) : null}
        {card.highlights.length ? (
          <ul className="mt-4 space-y-2">
            {card.highlights.map((highlight) => (
              <li key={highlight} className="rounded-2xl bg-[#F4F6F8] px-3 py-2 text-sm text-[#0A1F44]">
                {highlight}
              </li>
            ))}
          </ul>
        ) : null}
        {showConnectionPreview && card.connectionPreview.length ? (
          <div className="mt-5 rounded-2xl bg-[#0A1F44] px-4 py-3 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4CCB7A]">
              Vocês poderão se conectar por...
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {card.connectionPreview.map((item) => (
                <li key={item} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
