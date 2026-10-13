'use client';

import {
  TREINO_COLOR_KEYS,
  TREINO_COLOR_SWATCH,
  normalizeTreinoColorKey,
  type TreinoColorKey,
} from '@/lib/metapersonal/treinosPlannerTheme';

const LABELS: Record<TreinoColorKey, string> = {
  emerald: 'Verde',
  blue: 'Azul',
  violet: 'Violeta',
  amber: 'Âmbar',
  cyan: 'Ciano',
  rose: 'Rosa',
  indigo: 'Índigo',
  lime: 'Lima',
};

type Props = {
  value?: string | null;
  onChange: (key: TreinoColorKey) => void;
  disabled?: boolean;
  appearance?: 'light' | 'dark';
  size?: 'sm' | 'md';
};

export function TreinosColorSwatches({
  value,
  onChange,
  disabled = false,
  appearance = 'light',
  size = 'sm',
}: Props) {
  const selected = normalizeTreinoColorKey(value);
  const light = appearance === 'light';
  const dim = size === 'md' ? 'h-6 w-6' : 'h-4 w-4';

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Cor do treino">
      {TREINO_COLOR_KEYS.map((key) => {
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={LABELS[key]}
            disabled={disabled}
            title={LABELS[key]}
            onClick={(event) => {
              event.stopPropagation();
              if (disabled || active) return;
              onChange(key);
            }}
            className={`${dim} shrink-0 rounded-full ${TREINO_COLOR_SWATCH[key]} ${
              active
                ? light
                  ? 'ring-2 ring-offset-1 ring-gray-800'
                  : 'ring-2 ring-offset-1 ring-offset-transparent ring-white'
                : light
                  ? 'ring-1 ring-black/10 hover:ring-gray-400'
                  : 'ring-1 ring-white/25 hover:ring-white/60'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          />
        );
      })}
    </div>
  );
}
