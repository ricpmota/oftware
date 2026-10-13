'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
import { toneVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';

export type DigitalMeasurePickerProps = {
  value: string;
  onChange: (value: string) => void;
  unit: 'kg' | 'cm';
  step: number;
  decimals: number;
  min?: number;
  label?: string;
  /** Último valor registrado — usado para exibir a variação em tempo real. */
  referenceValue?: number | null;
  /** Impede alterar o valor (conclusão já registrada). */
  readOnly?: boolean;
};

const HOLD_DELAY_MS = 380;
const HOLD_INTERVAL_MS = 70;
const HOLD_INTERVAL_FAST_MS = 35;
const HOLD_ACCELERATE_AFTER_MS = 900;

function parseMeasureValue(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function formatMeasureValue(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',');
}

function roundToDecimals(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function roundToStep(n: number, step: number, decimals: number): number {
  return roundToDecimals(Math.round(n / step) * step, decimals);
}

function formatDelta(delta: number, decimals: number, unit: string): string {
  const sinal = delta > 0 ? '+' : '';
  return `${sinal}${formatMeasureValue(delta, decimals)} ${unit}`;
}

function isAllowedManualDraft(raw: string, decimals: number): boolean {
  const normalized = raw.replace(',', '.');
  if (normalized === '' || normalized === '.') return true;
  const pattern =
    decimals <= 0
      ? /^\d{0,4}$/
      : new RegExp(`^\\d{0,4}(\\.\\d{0,${decimals}})?$`);
  return pattern.test(normalized);
}

const VARIATION_TONE_CLASS: Record<ReturnType<typeof toneVariacaoMedida>, string> = {
  positivo: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  atencao: 'text-amber-600 bg-amber-50 border-amber-200',
  neutro: 'text-slate-600 bg-slate-50 border-slate-200',
};

const BUTTON_BASE =
  'flex h-14 w-full max-w-[220px] items-center justify-center rounded-2xl border-2 transition-all touch-manipulation select-none';

function buttonClass(pressed: boolean, disabled = false): string {
  if (disabled) {
    return `${BUTTON_BASE} border-slate-200 bg-white text-slate-400 opacity-40 cursor-not-allowed`;
  }
  if (pressed) {
    return `${BUTTON_BASE} border-emerald-500 bg-emerald-50 text-emerald-700 scale-[0.98] shadow-sm ring-2 ring-emerald-500/25`;
  }
  return `${BUTTON_BASE} border-slate-200 bg-white text-slate-600 active:scale-[0.98]`;
}

export function DigitalMeasurePicker({
  value,
  onChange,
  unit,
  step,
  decimals,
  min = step,
  label,
  referenceValue,
  readOnly = false,
}: DigitalMeasurePickerProps) {
  const [pressedDirection, setPressedDirection] = useState<1 | -1 | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState(false);

  const valueRef = useRef(value);
  valueRef.current = value;

  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdAccelerateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDirectionRef = useRef<1 | -1 | null>(null);

  const numValue = parseMeasureValue(value);
  const emptyDisplay = '—';
  const displayValue = numValue != null ? formatMeasureValue(numValue, decimals) : emptyDisplay;

  const defaultStart = unit === 'kg' ? 70 : 80;

  const canDecrease =
    numValue != null && roundToStep(numValue - step, step, decimals) > 0;

  const stopHold = useCallback(() => {
    if (holdDelayRef.current != null) {
      clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    if (holdIntervalRef.current != null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (holdAccelerateRef.current != null) {
      clearTimeout(holdAccelerateRef.current);
      holdAccelerateRef.current = null;
    }
    activeDirectionRef.current = null;
    setPressedDirection(null);
  }, []);

  const adjust = useCallback(
    (direction: 1 | -1): boolean => {
      const current = parseMeasureValue(valueRef.current);

      if (current == null) {
        if (direction > 0) {
          const next = formatMeasureValue(
            roundToStep(defaultStart, step, decimals),
            decimals
          );
          valueRef.current = next;
          onChange(next);
          return true;
        }
        return false;
      }

      const nextNum = roundToStep(current + direction * step, step, decimals);
      if (nextNum <= 0) return false;

      const next = formatMeasureValue(nextNum, decimals);
      valueRef.current = next;
      onChange(next);
      return true;
    },
    [decimals, defaultStart, onChange, step]
  );

  const startHold = useCallback(
    (direction: 1 | -1) => {
      if (direction < 0) {
        const current = parseMeasureValue(valueRef.current);
        if (current != null && roundToStep(current - step, step, decimals) <= 0) {
          return;
        }
      }

      stopHold();
      activeDirectionRef.current = direction;
      setPressedDirection(direction);

      const tick = () => {
        const dir = activeDirectionRef.current;
        if (dir == null) return;
        const ok = adjust(dir);
        if (!ok && dir < 0) stopHold();
      };

      tick();

      holdDelayRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(tick, HOLD_INTERVAL_MS);
        holdAccelerateRef.current = setTimeout(() => {
          if (holdIntervalRef.current != null) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = setInterval(tick, HOLD_INTERVAL_FAST_MS);
          }
        }, HOLD_ACCELERATE_AFTER_MS);
      }, HOLD_DELAY_MS);
    },
    [adjust, decimals, step, stopHold]
  );

  useEffect(() => () => stopHold(), [stopHold]);

  useEffect(() => {
    if (!isEditing) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isEditing]);

  const beginEdit = () => {
    if (readOnly) return;
    stopHold();
    setDraft(numValue != null ? formatMeasureValue(numValue, decimals) : '');
    setEditError(false);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft('');
    setEditError(false);
  };

  const commitEdit = () => {
    const parsed = parseMeasureValue(draft);
    if (parsed == null || parsed < min) {
      setEditError(true);
      inputRef.current?.focus();
      return;
    }

    const next = formatMeasureValue(roundToDecimals(parsed, decimals), decimals);
    valueRef.current = next;
    onChange(next);
    setIsEditing(false);
    setDraft('');
    setEditError(false);
  };

  const delta =
    referenceValue != null && numValue != null
      ? roundToDecimals(numValue - referenceValue, decimals)
      : null;

  const variationTone = toneVariacaoMedida(delta);
  const showVariation = delta != null;

  const bindHoldButton = (direction: 1 | -1, disabled = false) => ({
    type: 'button' as const,
    disabled,
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      startHold(direction);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      stopHold();
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      stopHold();
    },
    onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      stopHold();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="w-full">
      {label && (
        <p className="text-sm text-slate-500 mb-3 text-center">{label}</p>
      )}

      <div className="flex flex-col items-center gap-3 px-8">
        <button
          {...bindHoldButton(1, isEditing || readOnly)}
          className={buttonClass(pressedDirection === 1, isEditing || readOnly)}
          aria-label={`Aumentar ${unit}`}
        >
          <ChevronUp className="h-8 w-8 stroke-[2.5]" />
        </button>

        <div className="relative w-full max-w-[280px]">
          <div
            className={`rounded-2xl border-2 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-6 shadow-inner shadow-black/40 ${
              isEditing
                ? editError
                  ? 'border-rose-400 ring-2 ring-rose-400/30'
                  : 'border-emerald-500 ring-2 ring-emerald-500/25'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-baseline justify-center gap-3">
              {isEditing ? (
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  aria-label={`Editar valor em ${unit}`}
                  aria-invalid={editError}
                  value={draft}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!isAllowedManualDraft(next, decimals)) return;
                    setDraft(next);
                    setEditError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitEdit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  onBlur={(e) => {
                    const nextFocus = e.relatedTarget as HTMLElement | null;
                    if (nextFocus?.dataset?.measureEditAction) return;
                    commitEdit();
                  }}
                  className="w-[7.5ch] max-w-full bg-transparent text-center font-mono text-5xl sm:text-6xl font-bold tabular-nums tracking-wider text-emerald-400 caret-emerald-300 outline-none drop-shadow-[0_0_12px_rgba(52,211,153,0.35)] placeholder:text-emerald-400/30"
                  placeholder="0"
                />
              ) : (
                <span
                  className="font-mono text-5xl sm:text-6xl font-bold tabular-nums tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {displayValue}
                </span>
              )}
              <span className="text-lg sm:text-xl font-semibold text-emerald-500/90 pt-2">
                {unit}
              </span>
            </div>
          </div>

          {/* Ícone discreto ao lado direito do card (não invade o display) */}
          <div className="absolute left-full top-1/2 z-10 ml-1.5 flex -translate-y-1/2 flex-col items-center gap-1">
            {isEditing ? (
              <>
                <button
                  type="button"
                  data-measure-edit-action="confirm"
                  onClick={commitEdit}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-600/70 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  aria-label="Confirmar valor"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  data-measure-edit-action="cancel"
                  onClick={cancelEdit}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400/65 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Cancelar edição"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </>
            ) : readOnly ? null : (
              <button
                type="button"
                onClick={beginEdit}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400/50 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Editar valor em ${unit}`}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {editError && (
          <p className="text-xs text-rose-600" role="alert">
            Informe um valor válido (mín. {formatMeasureValue(min, decimals)} {unit}).
          </p>
        )}

        <button
          {...bindHoldButton(-1, readOnly || isEditing || (!canDecrease && numValue != null))}
          className={buttonClass(
            pressedDirection === -1,
            readOnly || isEditing || (!canDecrease && numValue != null)
          )}
          aria-label={`Diminuir ${unit}`}
        >
          <ChevronDown className="h-8 w-8 stroke-[2.5]" />
        </button>
      </div>

      {showVariation && (
        <div
          className={`mt-5 mx-auto max-w-[280px] rounded-xl border px-4 py-3 text-center ${VARIATION_TONE_CLASS[variationTone]}`}
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80 mb-0.5">
            {delta === 0 ? 'Evolução' : delta! < 0 ? 'Você reduziu' : 'Você aumentou'}
          </p>
          <p className="text-lg font-bold font-mono tabular-nums">
            {formatDelta(delta ?? 0, decimals, unit)}
          </p>
          {delta !== 0 && referenceValue != null && (
            <p className="mt-1 text-xs opacity-75">
              Em relação a {formatMeasureValue(referenceValue, decimals)} {unit}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
