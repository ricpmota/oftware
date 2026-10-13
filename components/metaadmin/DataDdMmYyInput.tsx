'use client';

import { formatDdMmYy } from '@/lib/lembrete/lembreteRecorrencia';

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  isDark?: boolean;
  className?: string;
  ariaLabel?: string;
};

export default function DataDdMmYyInput({
  value,
  onChange,
  isDark,
  className = '',
  ariaLabel = 'Data',
}: Props) {
  const display = value ? formatDdMmYy(value) : '';

  return (
    <div
      className={`relative w-[8.25rem] shrink-0 overflow-hidden ${
        className ||
        `h-10 rounded-xl border ${
          isDark
            ? 'border-white/15 bg-[#0A1F44] text-[#E8EDED]'
            : 'border-gray-200 bg-white text-gray-900'
        }`
      }`}
    >
      <span
        className={`pointer-events-none flex h-full min-h-[2.5rem] items-center justify-center px-2 text-sm font-medium tabular-nums tracking-wide ${
          display ? '' : isDark ? 'text-[#E8EDED]/35' : 'text-gray-400'
        }`}
      >
        {display || 'DD/MM/AA'}
      </span>
      <input
        type="date"
        value={value || ''}
        aria-label={ariaLabel}
        onChange={(e) => {
          const ymd = e.target.value;
          if (ymd) onChange(ymd);
        }}
        className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
          fontSize: '16px',
        }}
      />
    </div>
  );
}
