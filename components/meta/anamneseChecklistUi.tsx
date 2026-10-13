'use client';

import { Check } from 'lucide-react';

type Tone = 'light' | 'dark';

export function AnamneseCheckItem({
  label,
  checked,
  onChange,
  tone = 'light',
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  tone?: Tone;
}) {
  const dark = tone === 'dark';
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 transition-colors ${
        dark ? 'hover:bg-white/5' : 'hover:bg-emerald-50/80'
      }`}
    >
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border text-transparent transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 ${
          dark ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
      <span className={`text-sm leading-snug ${dark ? 'text-[#E8EDED]' : 'text-slate-700'}`}>{label}</span>
    </label>
  );
}

export function AnamneseCheckGroup({
  title,
  tone = 'light',
  children,
}: {
  title?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <section
      className={`rounded-2xl px-2.5 py-2.5 ${
        dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white ring-1 ring-emerald-100'
      }`}
    >
      {title ? (
        <h3 className="mb-1.5 flex items-center gap-2 px-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span className={`text-[13px] font-semibold tracking-tight ${dark ? 'text-[#4CCB7A]' : 'text-emerald-700'}`}>
            {title}
          </span>
        </h3>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
