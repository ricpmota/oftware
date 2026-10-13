'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  clampRulerOffset,
  rulerOffsetForValue,
  rulerValueForOffset,
  snapRulerValue,
} from '@/lib/meta/rulerPickerMath';

const PX_PER_STEP = 12;

type Tick = {
  index: number;
  value: number;
  isMajor: boolean;
  isMid: boolean;
};

export type RulerPickerProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Unidade do valor. Hoje "kg"; o componente não converte outras unidades. */
  unit?: string;
  onChange: (value: number) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

function formatPt(value: number, digits: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function ariaForKg(value: number): string {
  const n = Math.round(value * 10) / 10;
  const shown = Number.isInteger(n) ? String(n) : formatPt(n, 1);
  return `Meta de perda de peso: ${shown} quilogramas`;
}

function tickMarks(value: number, step: number): { isMajor: boolean; isMid: boolean } {
  if (step >= 1) {
    const n = Math.round(value);
    return { isMajor: n % 10 === 0, isMid: n % 10 !== 0 && n % 5 === 0 };
  }
  const tenths = Math.round(value * 10);
  return { isMajor: tenths % 10 === 0, isMid: tenths % 10 !== 0 && tenths % 5 === 0 };
}

/** Só desenha os traços perto do valor atual — a faixa inteira (ex.: peso) não vira milhares de nós. */
function visibleTicks(min: number, max: number, step: number, center: number): Tick[] {
  if (!(step > 0) || !(max >= min)) {
    return [{ index: 0, value: min, isMajor: true, isMid: false }];
  }
  const count = Math.max(0, Math.round((max - min) / step));
  const centerIndex = Math.max(0, Math.min(count, Math.round((center - min) / step)));
  const start = Math.max(0, centerIndex - 80);
  const end = Math.min(count, centerIndex + 80);
  const ticks: Tick[] = [];
  for (let i = start; i <= end; i++) {
    const raw = Math.round((min + i * step) * 1000) / 1000;
    ticks.push({ index: i, value: raw, ...tickMarks(raw, step) });
  }
  return ticks;
}

function buzzIntegerCross(prev: number, next: number) {
  if (Math.floor(prev + 1e-6) === Math.floor(next + 1e-6)) return;
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav || typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(8);
  } catch {
    /* progressive enhancement */
  }
}

export default function RulerPicker({
  value,
  min,
  max,
  step = 0.1,
  unit = 'kg',
  onChange,
  ariaLabel,
  disabled = false,
}: RulerPickerProps) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const safeStep = step > 0 ? step : 0.1;
  const snappedValue = snapRulerValue(value, lo, hi, safeStep);

  const viewportRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(rulerOffsetForValue(snappedValue, lo, safeStep, PX_PER_STEP));
  const [offset, setOffset] = useState(offsetRef.current);
  const draggingRef = useRef(false);
  const trackingRef = useRef(false);
  const animatingRef = useRef(false);
  const rafRef = useRef(0);
  const lastEmittedRef = useRef(snappedValue);
  const onChangeRef = useRef(onChange);
  const lastXRef = useRef(0);
  const originXRef = useRef(0);
  const originYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);
  const propsRef = useRef({ lo, hi, safeStep });

  onChangeRef.current = onChange;
  propsRef.current = { lo, hi, safeStep };

  const cancelInertia = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    animatingRef.current = false;
  }, []);

  const commitOffset = useCallback((nextOffset: number, emit: boolean) => {
    const { lo: minNow, hi: maxNow, safeStep: stepNow } = propsRef.current;
    const clamped = clampRulerOffset(nextOffset, minNow, maxNow, stepNow, PX_PER_STEP);
    offsetRef.current = clamped;
    setOffset(clamped);
    if (!emit) return;
    const snapped = snapRulerValue(
      rulerValueForOffset(clamped, minNow, stepNow, PX_PER_STEP),
      minNow,
      maxNow,
      stepNow,
    );
    if (Math.abs(snapped - lastEmittedRef.current) < 1e-6) return;
    buzzIntegerCross(lastEmittedRef.current, snapped);
    lastEmittedRef.current = snapped;
    onChangeRef.current(snapped);
  }, []);

  const snapToRest = useCallback(() => {
    const { lo: minNow, hi: maxNow, safeStep: stepNow } = propsRef.current;
    const snapped = snapRulerValue(
      rulerValueForOffset(offsetRef.current, minNow, stepNow, PX_PER_STEP),
      minNow,
      maxNow,
      stepNow,
    );
    commitOffset(rulerOffsetForValue(snapped, minNow, stepNow, PX_PER_STEP), true);
  }, [commitOffset]);

  const startInertia = useCallback(
    (velocityPxPerMs: number) => {
      cancelInertia();
      if (Math.abs(velocityPxPerMs) < 0.12) {
        snapToRest();
        return;
      }
      animatingRef.current = true;
      let v = Math.max(-1.6, Math.min(1.6, velocityPxPerMs));
      let last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(32, now - last);
        last = now;
        v *= Math.pow(0.94, dt / 16);
        commitOffset(offsetRef.current + v * dt, true);
        if (Math.abs(v) < 0.04) {
          animatingRef.current = false;
          rafRef.current = 0;
          snapToRest();
          return;
        }
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
    },
    [cancelInertia, commitOffset, snapToRest],
  );

  useLayoutEffect(() => {
    if (draggingRef.current || trackingRef.current || animatingRef.current) return;
    const next = rulerOffsetForValue(snappedValue, lo, safeStep, PX_PER_STEP);
    lastEmittedRef.current = snappedValue;
    if (Math.abs(next - offsetRef.current) < 0.5) return;
    offsetRef.current = next;
    setOffset(next);
  }, [snappedValue, lo, safeStep]);

  useEffect(() => () => cancelInertia(), [cancelInertia]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const blockScroll = (event: TouchEvent) => {
      if (!draggingRef.current || !event.cancelable) return;
      event.preventDefault();
    };
    el.addEventListener('touchmove', blockScroll, { passive: false });
    return () => el.removeEventListener('touchmove', blockScroll);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    cancelInertia();
    trackingRef.current = true;
    draggingRef.current = false;
    velocityRef.current = 0;
    originXRef.current = event.clientX;
    originYRef.current = event.clientY;
    lastXRef.current = event.clientX;
    lastTRef.current = event.timeStamp;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!trackingRef.current) return;
    if (!draggingRef.current) {
      const totalX = event.clientX - originXRef.current;
      const totalY = event.clientY - originYRef.current;
      if (Math.abs(totalY) > 10 && Math.abs(totalY) > Math.abs(totalX)) {
        trackingRef.current = false;
        return;
      }
      if (Math.abs(totalX) < 6) return;
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      viewportRef.current?.focus({ preventScroll: true });
      lastXRef.current = event.clientX;
      lastTRef.current = event.timeStamp;
      return;
    }
    const dx = event.clientX - lastXRef.current;
    const dt = Math.max(8, event.timeStamp - lastTRef.current);
    velocityRef.current = velocityRef.current * 0.35 + (dx / dt) * 0.65;
    lastXRef.current = event.clientX;
    lastTRef.current = event.timeStamp;
    commitOffset(offsetRef.current + dx, true);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wasDragging = draggingRef.current;
    trackingRef.current = false;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (wasDragging) startInertia(velocityRef.current);
  };

  const nudge = (delta: number) => {
    if (disabled) return;
    cancelInertia();
    const { lo: minNow, hi: maxNow, safeStep: stepNow } = propsRef.current;
    const next = snapRulerValue(lastEmittedRef.current + delta, minNow, maxNow, stepNow);
    commitOffset(rulerOffsetForValue(next, minNow, stepNow, PX_PER_STEP), true);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 1 : safeStep;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudge(-amount);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudge(amount);
    }
  };

  const liveValue = snapRulerValue(
    rulerValueForOffset(offset, lo, safeStep, PX_PER_STEP),
    lo,
    hi,
    safeStep,
  );
  const ticks = visibleTicks(lo, hi, safeStep, liveValue);
  const label = ariaLabel || (unit === 'kg' ? ariaForKg(liveValue) : `Valor selecionado: ${liveValue} ${unit}`);
  const majorSpan = safeStep >= 1 ? 5 : 0.5;
  const valueText =
    unit === 'kg'
      ? `${formatPt(liveValue, 1)} quilogramas`
      : unit === 'cm'
        ? `${Number.isInteger(liveValue) ? String(Math.round(liveValue)) : formatPt(liveValue, 1)} centímetros`
        : String(liveValue);

  return (
    <div
      ref={viewportRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={lo}
      aria-valuemax={hi}
      aria-valuenow={liveValue}
      aria-valuetext={valueText}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        if (!draggingRef.current) trackingRef.current = false;
      }}
      onKeyDown={onKeyDown}
      className="relative mx-auto h-[4.75rem] w-full max-w-md cursor-grab touch-pan-y select-none overflow-hidden overscroll-contain rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:cursor-grabbing"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        className="pointer-events-none absolute top-1 left-1/2 h-12 will-change-transform"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {ticks.map((tick) => {
          const active = Math.abs(tick.value - liveValue) < safeStep / 2;
          const labelOn = tick.isMajor && Math.abs(tick.value - liveValue) < majorSpan;
          return (
            <div
              key={tick.index}
              className="absolute top-0"
              style={{ left: tick.index * PX_PER_STEP }}
            >
              <div
                className={`-translate-x-1/2 rounded-full ${
                  tick.isMajor ? 'h-6 w-0.5' : tick.isMid ? 'h-4 w-px' : 'h-2.5 w-px'
                } ${active || labelOn ? 'bg-emerald-500' : tick.isMajor ? 'bg-slate-500' : 'bg-slate-300'}`}
              />
              {tick.isMajor ? (
                <span
                  className={`absolute top-7 left-0 -translate-x-1/2 text-[11px] tabular-nums ${
                    labelOn ? 'font-semibold text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {Math.round(tick.value)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute top-0 left-1/2 z-10 h-7 w-0.5 -translate-x-1/2 rounded-full bg-emerald-500"
        aria-hidden
      />
    </div>
  );
}
