'use client';

import type { ReactNode } from 'react';

type MatchChoiceProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
};

export function MatchChoice({ label, selected, onClick, emoji }: MatchChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-left text-sm font-medium transition-colors ${
        selected
          ? 'border-[#4CCB7A] bg-[#E8F8EE] text-[#0A1F44]'
          : 'border-[#E4E8F0] bg-white text-[#0A1F44] hover:border-[#4CCB7A]/50'
      }`}
    >
      {emoji ? <span className="mr-1.5" aria-hidden="true">{emoji}</span> : null}
      {label}
    </button>
  );
}

export function MatchChoiceWrap({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function MatchOptionCard({
  title,
  text,
  selected,
  onClick,
}: {
  title: string;
  text?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
        selected ? 'border-[#4CCB7A] bg-[#E8F8EE]' : 'border-[#E4E8F0] bg-white'
      }`}
    >
      <span className="block text-[15px] font-semibold text-[#0A1F44]">{title}</span>
      {text ? <span className="mt-1 block text-sm leading-snug text-[#0A1F44]/65">{text}</span> : null}
    </button>
  );
}

export function MatchSwitch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E4E8F0] bg-white px-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-[#0A1F44]">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-[#0A1F44]/55">{hint}</p> : null}
      </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative h-8 w-14 shrink-0 overflow-hidden rounded-full p-1 transition-colors ${
            checked ? 'bg-[#4CCB7A]' : 'bg-[#D5DCE6]'
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
    </div>
  );
}
