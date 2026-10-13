'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  clampNumeroSemanasTratamento,
  limiteMinimoNumeroSemanasTratamento,
  MAX_SEMANAS_TRATAMENTO,
} from '@/utils/numeroSemanasTratamento';
import { pacienteComNumeroSemanasAtualizado } from '@/utils/esquemaDosesSemana';

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
  min: number;
  onClose: () => void;
  onSave: (n: number) => void;
};

function NumeroSemanasStepperModal({ open, current, min, onClose, onSave }: ModalProps) {
  const [draft, setDraft] = useState(current);
  const [pressedDirection, setPressedDirection] = useState<1 | -1 | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdAccelerateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDirectionRef = useRef<1 | -1 | null>(null);

  useEffect(() => {
    if (open) setDraft(clampNumeroSemanasTratamento(current, min));
  }, [open, current, min]);

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

  const adjust = useCallback(
    (direction: 1 | -1): boolean => {
      const next = draftRef.current + direction;
      if (next < min || next > MAX_SEMANAS_TRATAMENTO) return false;
      draftRef.current = next;
      setDraft(next);
      return true;
    },
    [min]
  );

  const startHold = useCallback(
    (direction: 1 | -1) => {
      const peek = draftRef.current + direction;
      if (peek < min || peek > MAX_SEMANAS_TRATAMENTO) return;

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
    [adjust, min, stopHold]
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

  const canDecrease = draft > min;
  const canIncrease = draft < MAX_SEMANAS_TRATAMENTO;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="numero-semanas-titulo"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-gray-700">
          <h3 id="numero-semanas-titulo" className="text-base font-semibold text-slate-900 dark:text-white">
            Número de semanas
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
              aria-label="Aumentar semanas"
            >
              <ChevronUp className="h-8 w-8 stroke-[2.5]" />
            </button>

            <div className="w-full max-w-[280px] rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-6 shadow-inner shadow-black/40">
              <div className="flex items-baseline justify-center gap-3">
                <span
                  className="font-mono text-5xl font-bold tabular-nums tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)] sm:text-6xl"
                  aria-live="polite"
                >
                  {draft}
                </span>
                <span className="pt-2 text-lg font-semibold text-emerald-500/90 sm:text-xl">sem</span>
              </div>
            </div>

            <button
              {...bindHold(-1, !canDecrease)}
              className={stepperBtnClass(pressedDirection === -1, !canDecrease)}
              aria-label="Diminuir semanas"
            >
              <ChevronDown className="h-8 w-8 stroke-[2.5]" />
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            {min > 1 && draft <= min
              ? min >= current
                ? 'Todas as semanas já têm registro. Só é possível ampliar o tratamento.'
                : `Não é possível diminuir abaixo da semana ${min} (último registro).`
              : 'Use as setas para definir a duração. A alteração só vale ao salvar.'}
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
  paciente: PacienteCompleto;
  setPaciente: (next: PacienteCompleto) => void;
  disabled?: boolean;
  /** Se informado, só atualiza este valor (ex.: formulário mobile) além do paciente. */
  onSaveExtra?: (n: number) => void;
};

export function NumeroSemanasTratamentoField({
  paciente,
  setPaciente,
  disabled = false,
  onSaveExtra,
}: FieldProps) {
  const [open, setOpen] = useState(false);
  const atual = paciente.planoTerapeutico?.numeroSemanasTratamento;
  const min = limiteMinimoNumeroSemanasTratamento(paciente);
  const current =
    typeof atual === 'number' && Number.isFinite(atual)
      ? clampNumeroSemanasTratamento(atual, min)
      : clampNumeroSemanasTratamento(18, min);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full min-h-[42px] border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-left text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Alterar número de semanas do tratamento"
      >
        {typeof atual === 'number' && Number.isFinite(atual) ? (
          <span className="font-medium">{atual} semanas</span>
        ) : (
          <span className="text-gray-400">Definir semanas</span>
        )}
      </button>
      <NumeroSemanasStepperModal
        open={open}
        current={current}
        min={min}
        onClose={() => setOpen(false)}
        onSave={(n) => {
          const next = pacienteComNumeroSemanasAtualizado(paciente, n);
          setPaciente(next);
          onSaveExtra?.(n);
          setOpen(false);
        }}
      />
    </>
  );
}
