'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import {
  getPhoneCountryOrDefault,
  searchPhoneCountries,
  type PhoneCountry,
} from '@/lib/phone/callingCountries';
import {
  formatNationalAsYouType,
  formatNationalPhone,
  isPossibleNationalPhone,
  nationalDigitsForCountry,
  toPersistedInternationalPhone,
  type InternationalPhoneFields,
  type PersistedInternationalPhone,
} from '@/lib/phone/internationalPhoneValue';

const FIELD_DEFAULT =
  'border border-gray-300 rounded-md bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
const FIELD_DARK =
  'border border-white/20 rounded-2xl bg-[#0d2a5a]/80 text-[#E8EDED] placeholder:text-[#E8EDED]/40';

export type InternationalPhoneInputProps = {
  value: InternationalPhoneFields;
  onChange?: (next: PersistedInternationalPhone) => void;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  className?: string;
  /** Quando true, mostra aviso se o número não é possível para o país. */
  showValidation?: boolean;
  /** `dark` = chat inicial do paciente (fundo navy). */
  variant?: 'default' | 'dark';
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

export function InternationalPhoneInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  id,
  className = '',
  showValidation = true,
  variant = 'default',
}: InternationalPhoneInputProps) {
  const country = getPhoneCountryOrDefault({
    telefonePais: value.telefonePais,
    telefoneDdi: value.telefoneDdi,
  });
  const nationalDigits = nationalDigitsForCountry(value.telefone, country.iso, country.ddi);
  const displayValue = formatNationalPhone(country.iso, nationalDigits);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(() => searchPhoneCountries(query), [query]);
  const locked = disabled || readOnly;
  const field = variant === 'dark' ? FIELD_DARK : FIELD_DEFAULT;
  const errorId = id ? `${id}-error` : 'international-phone-error';

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spaceBelow = vh - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(240, Math.max(140, openUp ? spaceAbove : spaceBelow));
      const width = Math.min(Math.max(rect.width, 240), vw - 16);
      let left = rect.left;
      if (left + width > vw - 8) left = Math.max(8, vw - 8 - width);
      if (left < 8) left = 8;
      const top = openUp ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4;
      setMenuPos({ top, left, width, maxHeight });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.('[data-international-phone-menu]')) return;
      setOpen(false);
      setQuery('');
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const emit = (nextCountry: PhoneCountry, nationalRaw: string) => {
    onChange?.(toPersistedInternationalPhone(nextCountry.iso, nationalRaw, nextCountry.ddi));
  };

  const invalid =
    showValidation && Boolean(nationalDigits) && !isPossibleNationalPhone(country.iso, nationalDigits);

  return (
    <div ref={rootRef} className={`relative min-w-0 w-full ${className}`}>
      <div className="flex min-w-0 gap-2">
        <button
          type="button"
          disabled={locked}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`País: ${country.name}, DDI +${country.ddi}`}
          onClick={() => {
            if (locked) return;
            setOpen((v) => !v);
          }}
          className={`flex h-11 min-h-11 shrink-0 touch-manipulation items-center gap-1 px-2.5 text-sm sm:gap-1.5 ${field} ${
            locked ? 'cursor-not-allowed opacity-70' : ''
          }`}
        >
          <span aria-hidden className="text-base leading-none">
            {country.flag}
          </span>
          <span className="font-medium tabular-nums">+{country.ddi}</span>
          {!locked ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        </button>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          readOnly={readOnly}
          value={displayValue}
          placeholder={country.iso === 'BR' ? '(83) 98819-2848' : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => {
            if (locked) return;
            const nextDisplay = formatNationalAsYouType(country.iso, event.target.value);
            emit(country, nextDisplay);
          }}
          className={`h-11 min-h-11 min-w-0 flex-1 touch-manipulation px-3 py-2 text-base sm:text-sm ${field} ${
            locked ? 'cursor-default opacity-70' : ''
          } ${invalid ? 'border-red-400 focus:border-red-500' : ''}`}
        />
      </div>

      {invalid ? (
        <p id={errorId} className="mt-1 text-xs text-red-500">
          Número incompleto ou inválido para {country.name}.
        </p>
      ) : null}

      {open && !locked && menuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-international-phone-menu
              role="presentation"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
                zIndex: 500,
              }}
              className={`flex flex-col overflow-hidden rounded-md border shadow-lg ${
                variant === 'dark'
                  ? 'border-white/20 bg-[#0A1F44] text-[#E8EDED]'
                  : 'border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'
              }`}
            >
              <div
                className={`flex items-center gap-2 border-b px-2 py-1.5 ${
                  variant === 'dark' ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar país ou DDI"
                  aria-label="Buscar país ou DDI"
                  className="w-full bg-transparent py-1 text-sm outline-none"
                />
              </div>
              <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                {countries.map((item) => {
                  const selected = item.iso === country.iso;
                  return (
                    <li key={item.iso}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          emit(item, nationalDigits);
                          setOpen(false);
                          setQuery('');
                        }}
                        className={`flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm touch-manipulation ${
                          selected
                            ? variant === 'dark'
                              ? 'bg-white/10 font-medium'
                              : 'bg-sky-50 font-medium dark:bg-sky-950/50'
                            : variant === 'dark'
                              ? 'hover:bg-white/5'
                              : 'hover:bg-sky-50 dark:hover:bg-sky-950/40'
                        }`}
                      >
                        <span aria-hidden className="w-6 text-base leading-none">
                          {item.flag}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="shrink-0 tabular-nums opacity-70">+{item.ddi}</span>
                      </button>
                    </li>
                  );
                })}
                {countries.length === 0 ? (
                  <li className="px-3 py-2 text-sm opacity-70">Nenhum país encontrado.</li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function InternationalPhoneDisplay({
  value,
  className = '',
}: {
  value: InternationalPhoneFields;
  className?: string;
}) {
  const country = getPhoneCountryOrDefault({
    telefonePais: value.telefonePais,
    telefoneDdi: value.telefoneDdi,
  });
  const national = nationalDigitsForCountry(value.telefone, country.iso, country.ddi);
  const formatted = formatNationalPhone(country.iso, national);

  return (
    <div
      className={`flex h-11 min-w-0 items-center gap-2 overflow-hidden px-3 py-2 text-gray-600 bg-gray-50 cursor-default ${FIELD_DEFAULT} dark:bg-gray-800/60 dark:text-gray-400 ${className}`}
    >
      <span aria-hidden className="text-base leading-none">
        {country.flag}
      </span>
      <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">+{country.ddi}</span>
      <span className="min-w-0 truncate">{formatted}</span>
    </div>
  );
}
