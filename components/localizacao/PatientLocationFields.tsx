'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { getBrazilStates } from '@/lib/localizacao/brazilLocations';
import {
  applyStateChange,
  formatBrazilStateOption,
  interpretPatientLocation,
  locationSuggestions,
  patientLocationKeyAction,
  patientLocationMessage,
  patientLocationSignature,
  retainSelectionForQuery,
  type PatientLocationInput,
  type PatientLocationInterpretation,
  type PatientLocationValue,
} from '@/lib/localizacao/patientLocationField';

export type { PatientLocationInput, PatientLocationValue };

export type PatientLocationFieldsProps = {
  value?: PatientLocationInput | null;
  onChange: (value: PatientLocationValue | null) => void;
  /** Estado atual do campo, inclusive texto ainda não selecionado. Não grava Firestore. */
  onInterpretationChange?: (interpretation: PatientLocationInterpretation) => void;
  disabled?: boolean;
  required?: boolean;
  estadoLabel?: string;
  cidadeLabel?: string;
  id?: string;
  className?: string;
};

const FIELD =
  'w-full min-h-11 rounded-xl border border-[#0A1F44]/15 bg-white px-3 py-2.5 text-base text-[#0A1F44] outline-none placeholder:text-[#0A1F44]/40 focus:border-[#2F8FA3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/15 dark:bg-[#0A1F44]/40 dark:text-[#E8EDED] dark:placeholder:text-[#E8EDED]/40 dark:disabled:bg-white/5';

export function PatientLocationFields({
  value,
  onChange,
  onInterpretationChange,
  disabled = false,
  required = false,
  estadoLabel = 'Estado',
  cidadeLabel = 'Cidade',
  id,
  className,
}: PatientLocationFieldsProps) {
  const states = getBrazilStates();
  const autoId = useId();
  const stateId = id ? `${id}-estado` : `${autoId}-estado`;
  const cityId = id ? `${id}-cidade` : `${autoId}-cidade`;
  const listId = id ? `${id}-cidades` : `${autoId}-cidades`;
  const errorId = `${cityId}-erro`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onInterpretationChangeRef = useRef(onInterpretationChange);
  onInterpretationChangeRef.current = onInterpretationChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const handledIncoming = useRef<string | null>(null);

  const [estado, setEstado] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [selected, setSelected] = useState<PatientLocationValue | null>(null);
  const [notice, setNotice] = useState<'unresolved' | 'inconsistent' | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [cityBlurred, setCityBlurred] = useState(false);

  const incoming = patientLocationSignature(value);

  const report = (input?: PatientLocationInput | null) => {
    onInterpretationChangeRef.current?.(interpretPatientLocation(input));
  };

  useEffect(() => {
    if (handledIncoming.current === incoming) return;
    handledIncoming.current = incoming;
    const interpreted = interpretPatientLocation(valueRef.current);
    setOpen(false);
    setActiveIndex(0);
    report(valueRef.current);
    if (interpreted.status === 'valid') {
      setEstado(interpreted.value.estado);
      setCityQuery(interpreted.value.cidade);
      setSelected(interpreted.value);
      setNotice(null);
      if (patientLocationSignature(interpreted.value) !== incoming) {
        onChangeRef.current(interpreted.value);
      }
      return;
    }
    if (interpreted.status === 'state-only') {
      setEstado(interpreted.estado);
      setCityQuery('');
      setSelected(null);
      setNotice(null);
      return;
    }
    if (interpreted.status === 'unresolved') {
      setEstado(interpreted.estado);
      setCityQuery(interpreted.cidade);
      setSelected(null);
      setNotice(interpreted.cidade ? 'unresolved' : null);
      return;
    }
    if (interpreted.status === 'inconsistent') {
      setEstado(interpreted.estado);
      setCityQuery(interpreted.cidade);
      setSelected(null);
      setNotice('inconsistent');
      return;
    }
    setEstado('');
    setCityQuery('');
    setSelected(null);
    setNotice(null);
  }, [incoming]);

  const knownState = states.some((state) => state.sigla === estado);
  const suggestions = useMemo(
    () => (estado && knownState ? locationSuggestions(estado, cityQuery) : { items: [], truncated: false }),
    [estado, knownState, cityQuery]
  );
  const listOpen = open && !disabled && Boolean(cityQuery.trim()) && knownState;

  useEffect(() => {
    if (!listOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [listOpen]);

  useEffect(() => {
    if (!listOpen) return;
    const list = listRef.current;
    const option = document.getElementById(`${listId}-opt-${activeIndex}`);
    if (!list || !option) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.top < listRect.top) list.scrollTop -= listRect.top - optionRect.top;
    else if (optionRect.bottom > listRect.bottom) list.scrollTop += optionRect.bottom - listRect.bottom;
  }, [listOpen, activeIndex, listId]);

  const emit = (next: PatientLocationValue | null) => {
    handledIncoming.current = next ? patientLocationSignature(next) : '';
    onChangeRef.current(next);
  };

  const choose = (municipality: { nome: string; uf: string; codigoIbge: string }) => {
    const next: PatientLocationValue = {
      estado: municipality.uf,
      cidade: municipality.nome,
      codigoIbge: municipality.codigoIbge,
    };
    setEstado(next.estado);
    setCityQuery(next.cidade);
    setSelected(next);
    setNotice(null);
    setOpen(false);
    setCityBlurred(false);
    report(next);
    emit(next);
  };

  const message = patientLocationMessage({
    required,
    touched,
    cityBlurred,
    estado,
    cityQuery,
    selected,
    notice,
  });
  const showCheck = selected !== null && selected.estado === estado && cityQuery === selected.cidade;
  const activeOptionId = listOpen ? `${listId}-opt-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className={className ? `grid w-full gap-3 ${className}` : 'grid w-full gap-3'}>
      <div>
        <label htmlFor={stateId} className="mb-1.5 block text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">
          {estadoLabel}
        </label>
        <div className="relative">
          <select
            id={stateId}
            value={estado}
            disabled={disabled}
            required={required}
            aria-required={required || undefined}
            className={`${FIELD} appearance-none pr-10`}
            onChange={(event) => {
              const next = applyStateChange({ estado, cityQuery, selected }, event.target.value);
              setTouched(true);
              setEstado(next.estado);
              if (!next.clearedCity) return;
              setCityQuery('');
              setSelected(null);
              setNotice(null);
              setOpen(false);
              setActiveIndex(0);
              report(next.estado ? { estado: next.estado } : null);
              emit(null);
            }}
          >
            <option value="">Selecione</option>
            {estado && !knownState ? <option value={estado}>{estado} (não reconhecido)</option> : null}
            {states.map((state) => (
              <option key={state.sigla} value={state.sigla}>
                {formatBrazilStateOption(state)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A1F44]/50 dark:text-[#E8EDED]/50"
            aria-hidden
          />
        </div>
      </div>

      <div className="relative">
        <label htmlFor={cityId} className="mb-1.5 block text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">
          {cidadeLabel}
        </label>
        <div className="relative">
          <input
            id={cityId}
            role="combobox"
            type="text"
            value={cityQuery}
            disabled={disabled || !estado || !knownState}
            required={false}
            aria-required={required || undefined}
            aria-invalid={message ? true : undefined}
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            aria-describedby={message ? errorId : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={estado && knownState ? 'Digite sua cidade' : 'Selecione primeiro o estado'}
            className={`${FIELD} pr-10`}
            onFocus={() => setTouched(true)}
            onBlur={() => {
              setCityBlurred(true);
              setOpen(false);
            }}
            onChange={(event) => {
              const nextQuery = event.target.value;
              const nextSelected = retainSelectionForQuery(selected, nextQuery);
              setCityQuery(nextQuery);
              setSelected(nextSelected);
              setActiveIndex(0);
              setCityBlurred(false);
              setOpen(Boolean(nextQuery.trim()));
              if (nextSelected) {
                setNotice(null);
                report(nextSelected);
                return;
              }
              setNotice(null);
              report({ estado, cidade: nextQuery });
              emit(null);
            }}
            onKeyDown={(event) => {
              const action = patientLocationKeyAction({
                key: event.key,
                open: listOpen,
                activeIndex,
                suggestionCount: suggestions.items.length,
              });
              if (action.preventDefault) event.preventDefault();
              if (action.select) {
                const municipality = suggestions.items[action.activeIndex];
                if (municipality) choose(municipality);
                return;
              }
              setOpen(action.open);
              setActiveIndex(action.activeIndex);
            }}
          />
          {showCheck ? (
            <Check
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          ) : null}
        </div>

        {listOpen ? (
          <div
            id={suggestions.items.length > 0 ? undefined : listId}
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#0A1F44]/15 bg-white shadow-lg dark:border-white/15 dark:bg-[#0A1F44]"
          >
            {suggestions.items.length > 0 ? (
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={cidadeLabel}
                className="max-h-[min(16rem,40vh)] overflow-y-auto overscroll-contain"
              >
                {suggestions.items.map((municipality, index) => {
                  const active = index === activeIndex;
                  return (
                    <li
                      key={municipality.codigoIbge}
                      id={`${listId}-opt-${index}`}
                      role="option"
                      aria-selected={active}
                      className={`min-h-11 cursor-pointer px-3 py-2.5 text-base text-[#0A1F44] dark:text-[#E8EDED] ${
                        active ? 'bg-[#2F8FA3]/15 dark:bg-white/10' : ''
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        choose(municipality);
                      }}
                    >
                      {municipality.nome}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-3 py-2.5 text-sm text-[#0A1F44]/60 dark:text-[#E8EDED]/60">
                Nenhuma cidade encontrada. Escolha um município da lista.
              </p>
            )}
            {suggestions.truncated ? (
              <p className="border-t border-[#0A1F44]/10 px-3 py-2 text-xs text-[#0A1F44]/55 dark:border-white/10 dark:text-[#E8EDED]/55">
                Continue digitando para ver outras cidades.
              </p>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-300">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
