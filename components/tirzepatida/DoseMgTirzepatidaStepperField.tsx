'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  ajustarDoseMgTirzepatidaCustom,
  clampDoseMgTirzepatidaCustom,
  DOSE_INICIAL_PADRAO_MG,
  DOSE_MG_MAX_TIRZEPATIDA,
  DOSE_MG_MIN_TIRZEPATIDA,
  formatarDoseMgLabel,
  formatarDoseMgNumero,
  parseDoseMgInput,
} from '@/lib/tirzepatida/doseTitulacao';

const HOLD_DELAY_MS = 380;
const HOLD_INTERVAL_MS = 70;
const HOLD_INTERVAL_FAST_MS = 35;
const HOLD_ACCELERATE_AFTER_MS = 900;

const STEPPER_BTN =
  'flex h-14 w-full max-w-[220px] items-center justify-center rounded-2xl border-2 transition-all touch-manipulation select-none';

function stepperBtnClass(pressed: boolean, disabled: boolean): string {
  if (disabled) {
    return `${STEPPER_BTN} border-slate-200 bg-white text-slate-400 opacity-40 cursor-not-allowed`;
  }
  if (pressed) {
    return `${STEPPER_BTN} border-emerald-500 bg-emerald-50 text-emerald-700 scale-[0.98] shadow-sm ring-2 ring-emerald-500/25`;
  }
  return `${STEPPER_BTN} border-slate-200 bg-white text-slate-600 active:scale-[0.98]`;
}

type ModalProps = {
  open: boolean;
  current: number;
  onClose: () => void;
  onSave: (mg: number) => void;
};

function DoseMgTirzepatidaStepperModal({ open, current, onClose, onSave }: ModalProps) {
  const [draft, setDraft] = useState(current);
  const [pressedDirection, setPressedDirection] = useState<1 | -1 | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdAccelerateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDirectionRef = useRef<1 | -1 | null>(null);

  useEffect(() => {
    if (open) setDraft(clampDoseMgTirzepatidaCustom(current));
  }, [open, current]);

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

  useEffect(() => () => stopHold(), [stopHold]);

  const adjust = useCallback((direction: 1 | -1): boolean => {
    const next = ajustarDoseMgTirzepatidaCustom(draftRef.current, direction);
    if (Math.abs(next - draftRef.current) < 1e-6) return false;
    draftRef.current = next;
    setDraft(next);
    return true;
  }, []);

  const startHold = useCallback(
    (direction: 1 | -1) => {
      const peek = ajustarDoseMgTirzepatidaCustom(draftRef.current, direction);
      if (Math.abs(peek - draftRef.current) < 1e-6) return;

      stopHold();
      activeDirectionRef.current = direction;
      setPressedDirection(direction);

      const tick = () => {
        const dir = activeDirectionRef.current;
        if (dir == null) return;
        const ok = adjust(dir);
        if (!ok) stopHold();
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
    [adjust, stopHold]
  );

  const bindHold = (direction: 1 | -1, disabled: boolean) => ({
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

  if (!open || typeof document === 'undefined') return null;

  const canDecrease = draft > DOSE_MG_MIN_TIRZEPATIDA + 1e-6;
  const canIncrease = draft < DOSE_MG_MAX_TIRZEPATIDA - 1e-6;

  return createPortal(
    <div
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dose-mg-tirzepatida-titulo"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-gray-700">
          <h3 id="dose-mg-tirzepatida-titulo" className="text-base font-semibold text-slate-900 dark:text-white">
            Dose (mg)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-6">
          <div className="flex flex-col items-center gap-3">
            <button
              {...bindHold(1, !canIncrease)}
              className={stepperBtnClass(pressedDirection === 1, !canIncrease)}
              aria-label="Aumentar dose"
            >
              <ChevronUp className="h-8 w-8 stroke-[2.5]" />
            </button>

            <div className="w-full max-w-[280px] rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-6 shadow-inner shadow-black/40">
              <div className="flex items-baseline justify-center gap-3">
                <span
                  className="font-mono text-5xl font-bold tabular-nums tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)] sm:text-6xl"
                  aria-live="polite"
                >
                  {formatarDoseMgNumero(draft)}
                </span>
                <span className="pt-2 text-lg font-semibold text-emerald-500/90 sm:text-xl">mg</span>
              </div>
            </div>

            <button
              {...bindHold(-1, !canDecrease)}
              className={stepperBtnClass(pressedDirection === -1, !canDecrease)}
              aria-label="Diminuir dose"
            >
              <ChevronDown className="h-8 w-8 stroke-[2.5]" />
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Use as setas para ajustar de 1,25 em 1,25 mg. A alteração só vale ao salvar.
          </p>
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

type FieldProps = {
  value: number | string | null | undefined;
  onChange: (mg: number) => void;
  disabled?: boolean;
  variant?: 'field' | 'compact';
  placeholder?: string;
  ariaLabel?: string;
};

export function DoseMgTirzepatidaStepperField({
  value,
  onChange,
  disabled = false,
  variant = 'field',
  placeholder = 'Selecionar dose',
  ariaLabel = 'Alterar dose em miligramas',
}: FieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseDoseMgInput(value);
  const current = parsed != null ? clampDoseMgTirzepatidaCustom(parsed) : DOSE_INICIAL_PADRAO_MG;
  const hasValue = parsed != null;

  const triggerClass =
    variant === 'compact'
      ? 'w-full text-xs border border-gray-300 rounded px-1 py-1 text-center text-gray-900 bg-white hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed'
      : 'w-full min-h-[42px] border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-left text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={triggerClass}
        aria-label={ariaLabel}
      >
        {hasValue ? (
          <span className="font-medium">{formatarDoseMgLabel(current)}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>
      <DoseMgTirzepatidaStepperModal
        open={open}
        current={current}
        onClose={() => setOpen(false)}
        onSave={(mg) => {
          onChange(mg);
          setOpen(false);
        }}
      />
    </>
  );
}
