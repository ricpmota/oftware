'use client';

type Props = {
  score: number;
};

export function CheckInSemanalNutriScoreCard({ score }: Props) {
  const tone =
    score >= 80
      ? 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-950'
      : score >= 60
        ? 'from-amber-50 to-yellow-50 border-amber-200 text-amber-950'
        : 'from-rose-50 to-red-50 border-rose-200 text-rose-950';

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 sm:p-5 ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Score da semana</p>
      <div className="flex items-end gap-2 mt-1">
        <p className="text-4xl font-bold tabular-nums leading-none">{score}</p>
        <p className="text-lg font-semibold opacity-60 pb-1">/100</p>
      </div>
      <p className="text-sm mt-2 opacity-90">Adesão nutricional desta semana.</p>
    </div>
  );
}
