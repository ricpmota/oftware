'use client';

import {
  combinedPredictedPercent,
  percentOfPredicted,
  ringFillPercent,
  scrollToCardapioResumoTotalDia,
} from '@/lib/nutri/mealMacroRing';

const SIZE = 60;
const CAL_R = 25;
const PROT_R = 16.5;
const CAL_STROKE = 5;
const PROT_STROKE = 4.5;

function circleLen(radius: number): number {
  return 2 * Math.PI * radius;
}

export type MealMacroRingProps = {
  caloriasAtual: number;
  caloriasPrevisto: number;
  proteinaAtual: number;
  proteinaPrevisto: number;
};

export default function MealMacroRing({
  caloriasAtual,
  caloriasPrevisto,
  proteinaAtual,
  proteinaPrevisto,
}: MealMacroRingProps) {
  const caloriasPct = percentOfPredicted(caloriasAtual, caloriasPrevisto);
  const proteinasPct = percentOfPredicted(proteinaAtual, proteinaPrevisto);
  const totalPct = combinedPredictedPercent(caloriasPct, proteinasPct);
  const calLen = circleLen(CAL_R);
  const protLen = circleLen(PROT_R);
  const calFill = ringFillPercent(caloriasPct);
  const protFill = ringFillPercent(proteinasPct);
  const label = `Calorias: ${caloriasPct}% do previsto. Proteínas: ${proteinasPct}% do previsto. Total ${totalPct}% do previsto. Ver resumo total do dia.`;

  return (
    <button
      type="button"
      onClick={scrollToCardapioResumoTotalDia}
      aria-label={label}
      title={label}
      className="relative flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10"
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={CAL_R}
          fill="none"
          stroke="#FED7AA"
          strokeWidth={CAL_STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={CAL_R}
          fill="none"
          stroke="#F97316"
          strokeWidth={CAL_STROKE}
          strokeLinecap="round"
          strokeDasharray={calLen}
          strokeDashoffset={calLen * (1 - calFill / 100)}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={PROT_R}
          fill="none"
          stroke="#BAE6FD"
          strokeWidth={PROT_STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={PROT_R}
          fill="none"
          stroke="#0EA5E9"
          strokeWidth={PROT_STROKE}
          strokeLinecap="round"
          strokeDasharray={protLen}
          strokeDashoffset={protLen * (1 - protFill / 100)}
        />
      </svg>
    </button>
  );
}
