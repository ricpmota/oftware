'use client';

import { MATCH_AGE_MAX, MATCH_AGE_MIN } from '@/lib/match/matchTaxonomy';

type MatchAgeRangeProps = {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
};

export function MatchAgeRange({ min, max, onChange }: MatchAgeRangeProps) {
  const span = MATCH_AGE_MAX - MATCH_AGE_MIN;
  const left = ((min - MATCH_AGE_MIN) / span) * 100;
  const width = ((max - min) / span) * 100;
  const maxLabel = max >= MATCH_AGE_MAX ? `${MATCH_AGE_MAX}+` : String(max);

  return (
    <div>
      <p className="text-center text-2xl font-extrabold tracking-tight text-[#0A1F44]">
        {min} — {maxLabel}
      </p>
      <div className="relative mt-6 h-10">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#E4E8F0]" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#4CCB7A]"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <input
          aria-label="Idade inicial"
          type="range"
          min={MATCH_AGE_MIN}
          max={MATCH_AGE_MAX}
          value={min}
          onChange={(event) => onChange(Math.min(Number(event.target.value), max), max)}
          className="match-age-range"
          style={{ zIndex: min > MATCH_AGE_MIN + span * 0.85 ? 5 : 3 }}
        />
        <input
          aria-label="Idade final"
          type="range"
          min={MATCH_AGE_MIN}
          max={MATCH_AGE_MAX}
          value={max}
          onChange={(event) => onChange(min, Math.max(Number(event.target.value), min))}
          className="match-age-range"
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs font-medium text-[#0A1F44]/45">
        <span>{MATCH_AGE_MIN}</span>
        <span>{MATCH_AGE_MAX}+</span>
      </div>
      <style>{`
        .match-age-range {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 40px;
          margin: 0;
          background: transparent;
          pointer-events: none;
          appearance: none;
          -webkit-appearance: none;
        }
        .match-age-range::-webkit-slider-runnable-track {
          height: 40px;
          background: transparent;
        }
        .match-age-range::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          -webkit-appearance: none;
          height: 28px;
          width: 28px;
          margin-top: 6px;
          border-radius: 999px;
          border: 2px solid #4CCB7A;
          background: #fff;
          box-shadow: 0 1px 4px rgba(10, 31, 68, 0.28);
        }
        .match-age-range::-moz-range-track {
          height: 40px;
          background: transparent;
          border: none;
        }
        .match-age-range::-moz-range-thumb {
          pointer-events: auto;
          height: 28px;
          width: 28px;
          border-radius: 999px;
          border: 2px solid #4CCB7A;
          background: #fff;
          box-shadow: 0 1px 4px rgba(10, 31, 68, 0.28);
        }
      `}</style>
    </div>
  );
}
