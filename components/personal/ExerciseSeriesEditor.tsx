'use client';

import { ArrowLeftRight, Dumbbell, Minus, Plus, Repeat2, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { translateExerciseName } from '@/data/exerciseTranslations';
import {
  addTrainingSeries,
  formatLoadKgInput,
  parseLoadKgInput,
  removeTrainingSeries,
  sanitizeReps,
  sanitizeRestSec,
  updateTrainingSeries,
  type TrainingExerciseSeries,
  type TrainingIntercalatedOccurrence,
} from '@/lib/personal/trainingExerciseSeries';
import {
  hasIntercalationsAfterSeries,
  intercalationLabelOrder,
  intercalationsAfterSeries,
  lastIntercalationBeforeSlot,
  removeSeriesAndLinkedIntercalations,
  updateIntercalatedSeries,
} from '@/lib/personal/trainingIntercalation';

import { LIGHT_EDITOR, type WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';

function intercalatedGifUrl(item: TrainingIntercalatedOccurrence): string {
  if (item.gifUrl) return item.gifUrl;
  const id = String(item.exerciseId || '').trim();
  if (!id) return '';
  return `/api/exercisedb/image?exerciseId=${encodeURIComponent(id)}&resolution=360`;
}

function GifThumb({
  src,
  caption,
  desktop,
  light = false,
}: {
  src: string;
  caption?: string;
  desktop: boolean;
  light?: boolean;
}) {
  return (
    <div className={desktop ? 'w-[11rem]' : 'w-[4.5rem]'}>
      <div
        className={`relative overflow-hidden rounded-lg ring-1 ${
          light ? 'bg-zinc-100 ring-zinc-200' : 'bg-white/5 ring-white/10'
        } ${desktop ? 'aspect-[4/3] w-full' : 'h-[4.5rem] w-[4.5rem]'}`}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Dumbbell className={desktop ? (light ? 'h-6 w-6 text-zinc-300' : 'h-6 w-6 text-white/25') : (light ? 'h-5 w-5 text-zinc-300' : 'h-5 w-5 text-white/25')} />
          </div>
        )}
      </div>
      {caption ? (
        <p className={`mt-1 line-clamp-2 text-center text-[10px] font-semibold leading-tight ${light ? 'text-zinc-800' : 'text-[#E8EDED]'}`}>
          <ArrowLeftRight className={`mr-0.5 inline h-3 w-3 ${light ? 'text-zinc-500' : 'text-[#2F8FA3]'}`} />
          {caption}
        </p>
      ) : null}
    </div>
  );
}

function GifColumnSpacer({ desktop }: { desktop: boolean }) {
  return <div className={desktop ? 'w-[11rem] shrink-0' : 'w-[4.5rem] shrink-0'} aria-hidden />;
}

function CompactStepper({
  label,
  value,
  min,
  step = 1,
  suffix,
  disabled,
  onChange,
  light = false,
}: {
  label: string;
  value: number;
  min: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onChange: (next: number) => void;
  light?: boolean;
}) {
  const clamp = (n: number) => Math.max(min, Number.isFinite(n) ? n : min);
  return (
    <div className="min-w-0">
      <span className={`block text-center text-[9px] font-medium uppercase tracking-[0.06em] mb-1 ${light ? 'text-zinc-400' : 'text-[#E8EDED]/40'}`}>
        {label}
      </span>
      <div className={`flex h-8 items-center rounded-full ring-1 ring-inset ${light ? 'bg-white ring-zinc-200' : 'bg-white/[0.05] ring-white/[0.08]'}`}>
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          className={`flex h-full w-7 shrink-0 items-center justify-center rounded-l-full transition-colors disabled:opacity-30 disabled:pointer-events-none ${
            light ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-[#E8EDED]/55 hover:bg-white/[0.08] hover:text-[#E8EDED]'
          }`}
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="w-3 h-3" strokeWidth={2.5} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
          className={`h-full min-w-0 flex-1 bg-transparent text-center text-[12px] font-semibold tabular-nums outline-none disabled:opacity-70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            light ? 'text-zinc-900' : 'text-[#E8EDED]'
          }`}
          aria-label={label}
        />
        {suffix ? (
          <span className={`pr-0.5 text-[9px] font-medium tabular-nums ${light ? 'text-zinc-400' : 'text-[#E8EDED]/35'}`}>{suffix}</span>
        ) : null}
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled}
          className={`flex h-full w-7 shrink-0 items-center justify-center rounded-r-full transition-colors disabled:opacity-30 disabled:pointer-events-none ${
            light
              ? LIGHT_EDITOR.stepperPlus
              : 'text-[#4CCB7A]/80 hover:bg-[#4CCB7A]/15 hover:text-[#4CCB7A]'
          }`}
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function LoadKgField({
  value,
  disabled,
  onChange,
  light = false,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (next: number | null) => void;
  light?: boolean;
}) {
  const [text, setText] = useState(formatLoadKgInput(value));
  useEffect(() => {
    setText(formatLoadKgInput(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseLoadKgInput(raw);
    onChange(parsed);
    setText(formatLoadKgInput(parsed));
  };

  const step = (delta: number) => {
    const current = value ?? 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    onChange(next);
  };

  return (
    <div className="min-w-0">
      <span className={`block text-center text-[9px] font-medium uppercase tracking-[0.06em] mb-1 ${light ? 'text-zinc-400' : 'text-[#E8EDED]/40'}`}>
        Carga
      </span>
      <div className={`flex h-8 items-center rounded-full ring-1 ring-inset ${light ? 'bg-white ring-zinc-200' : 'bg-white/[0.05] ring-white/[0.08]'}`}>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || (value ?? 0) <= 0}
          className={`flex h-full w-7 shrink-0 items-center justify-center rounded-l-full transition-colors disabled:opacity-30 disabled:pointer-events-none ${
            light ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-[#E8EDED]/55 hover:bg-white/[0.08] hover:text-[#E8EDED]'
          }`}
          aria-label="Diminuir carga"
        >
          <Minus className="w-3 h-3" strokeWidth={2.5} />
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={disabled}
          placeholder="—"
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d,.\-]/g, '');
            setText(next);
          }}
          onBlur={() => commit(text)}
          className={`h-full min-w-0 flex-1 bg-transparent text-center text-[12px] font-semibold tabular-nums outline-none disabled:opacity-70 ${
            light ? 'text-zinc-900 placeholder:text-zinc-300' : 'text-[#E8EDED] placeholder:text-[#E8EDED]/30'
          }`}
          aria-label="Carga em kg"
        />
        <span className={`pr-0.5 text-[9px] font-medium ${light ? 'text-zinc-400' : 'text-[#E8EDED]/35'}`}>kg</span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled}
          className={`flex h-full w-7 shrink-0 items-center justify-center rounded-r-full transition-colors disabled:opacity-30 disabled:pointer-events-none ${
            light
              ? LIGHT_EDITOR.stepperPlus
              : 'text-[#4CCB7A]/80 hover:bg-[#4CCB7A]/15 hover:text-[#4CCB7A]'
          }`}
          aria-label="Aumentar carga"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function IntercalationSlotRow({
  previous,
  desktop,
  onPick,
  onRepeat,
  light = false,
}: {
  previous: TrainingIntercalatedOccurrence | null;
  desktop: boolean;
  onPick: () => void;
  onRepeat: (source: TrainingIntercalatedOccurrence) => void;
  light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const previousName = previous ? translateExerciseName(previous.name) : '';

  const handlePlus = () => {
    if (!previous) {
      onPick();
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <div className="relative flex items-start gap-2">
      <div
        className={`flex shrink-0 flex-col items-center py-0.5 ${desktop ? 'w-[11rem]' : 'w-[4.5rem]'}`}
      >
        <span className={`h-2 w-px ${light ? 'bg-zinc-300' : 'bg-white/15'}`} />
        <button
          type="button"
          onClick={handlePlus}
          aria-label="Adicionar exercício intercalado"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
            light
              ? 'bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-900 hover:text-white hover:ring-zinc-900'
              : 'bg-white/10 text-[#E8EDED]/70 ring-white/15 hover:bg-[#2F8FA3]/20 hover:text-[#2F8FA3] hover:ring-[#2F8FA3]/40'
          }`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
        <span className={`h-2 w-px ${light ? 'bg-zinc-300' : 'bg-white/15'}`} />
      </div>
      {open && previous ? (
        <div
          className={`absolute z-20 mt-1 w-[min(calc(100%-5rem),16rem)] rounded-xl border p-1.5 shadow-lg ${
            desktop ? 'left-[11.5rem]' : 'left-[5rem]'
          } ${light ? 'border-zinc-200 bg-white shadow-lg' : 'border-white/15 bg-[#0A1F44]'}`}
        >
          <p className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${light ? 'text-zinc-400' : 'text-[#E8EDED]/45'}`}>
            Adicionar exercício intercalado
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRepeat(previous);
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold ${
              light ? 'text-zinc-800 hover:bg-zinc-100' : 'text-[#E8EDED] hover:bg-white/10'
            }`}
          >
            <Repeat2 className={`w-3.5 h-3.5 ${light ? 'text-zinc-500' : 'text-[#2F8FA3]'}`} />
            Repetir {previousName}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPick();
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold ${
              light ? 'text-zinc-800 hover:bg-zinc-100' : 'text-[#E8EDED] hover:bg-white/10'
            }`}
          >
            <Plus className={`w-3.5 h-3.5 ${light ? 'text-zinc-500' : 'text-[#2F8FA3]'}`} />
            Selecionar outro exercício
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-[11px] ${
              light ? 'text-zinc-500 hover:bg-zinc-50' : 'text-[#E8EDED]/55 hover:bg-white/10'
            }`}
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SeriesFieldsCard({
  title,
  titleClass,
  canRemove,
  onRemove,
  removeLabel,
  children,
  light = false,
}: {
  title: string;
  titleClass: string;
  canRemove: boolean;
  onRemove?: () => void;
  removeLabel: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className={`min-w-0 flex-1 rounded-xl p-2 ring-1 ${light ? 'bg-white ring-zinc-200' : 'bg-white/[0.03] ring-white/[0.06]'}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${titleClass}`}>
          {title}
        </p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className={`p-1 rounded-md transition-colors ${
              light
                ? 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800'
                : 'text-[#E8EDED]/40 hover:text-red-400 hover:bg-red-500/10'
            }`}
            aria-label={removeLabel}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

type ExerciseSeriesEditorProps = {
  series: TrainingExerciseSeries[];
  onChange: (series: TrainingExerciseSeries[]) => void;
  intercalations?: TrainingIntercalatedOccurrence[];
  onIntercalationsChange?: (intercalations: TrainingIntercalatedOccurrence[]) => void;
  onPickIntercalation?: (afterSeriesId: string) => void;
  onRepeatIntercalation?: (afterSeriesId: string, source: TrainingIntercalatedOccurrence) => void;
  hostGifSrc?: string;
  readOnly?: boolean;
  variant?: 'sheet' | 'desktop';
  appearance?: WorkoutEditorAppearance;
};

export function ExerciseSeriesEditor({
  series,
  onChange,
  intercalations,
  onIntercalationsChange,
  onPickIntercalation,
  onRepeatIntercalation,
  hostGifSrc = '',
  readOnly = false,
  variant = 'sheet',
  appearance = 'dark',
}: ExerciseSeriesEditorProps) {
  const canRemove = series.length > 1 && !readOnly;
  const isDesktop = variant === 'desktop';
  const showSlots = Boolean(onPickIntercalation) && !readOnly;
  const intercalationList = intercalations || [];
  const light = appearance === 'light';

  const handleRemoveSeries = (item: TrainingExerciseSeries) => {
    if (hasIntercalationsAfterSeries(intercalationList, item.id)) {
      const ok = confirm(
        'Esta série possui um exercício intercalado.\n\nAo remover a série, o exercício intercalado também será removido.'
      );
      if (!ok) return;
      const next = removeSeriesAndLinkedIntercalations(series, intercalationList, item.id);
      onChange(next.series);
      onIntercalationsChange?.(next.intercalations);
      return;
    }
    onChange(removeTrainingSeries(series, item.id));
  };

  const fields = (
    item: {
      reps: number;
      loadKg: number | null;
      restSec: number;
    },
    onPatch: (patch: Partial<Pick<TrainingExerciseSeries, 'reps' | 'loadKg' | 'restSec'>>) => void
  ) => (
    <div className="grid grid-cols-3 gap-1.5">
      <CompactStepper
        label="Reps"
        value={item.reps}
        min={1}
        disabled={readOnly}
        light={light}
        onChange={(next) => onPatch({ reps: sanitizeReps(next) })}
      />
      <LoadKgField
        value={item.loadKg}
        disabled={readOnly}
        light={light}
        onChange={(next) => onPatch({ loadKg: next })}
      />
      <CompactStepper
        label="Descanso"
        value={item.restSec}
        min={0}
        suffix="s"
        disabled={readOnly}
        light={light}
        onChange={(next) => onPatch({ restSec: sanitizeRestSec(next) })}
      />
    </div>
  );

  return (
    <div className={isDesktop ? 'space-y-1.5' : 'space-y-2'}>
      {series.map((item, index) => (
        <div key={item.id}>
          <div className="flex items-start gap-2">
            {index === 0 ? (
              <GifThumb src={hostGifSrc} desktop={isDesktop} light={light} />
            ) : (
              <GifColumnSpacer desktop={isDesktop} />
            )}
            <SeriesFieldsCard
              title={`Série ${item.order}`}
              titleClass={light ? 'text-zinc-600' : 'text-[#4CCB7A]'}
              canRemove={canRemove}
              onRemove={() => handleRemoveSeries(item)}
              removeLabel={`Remover série ${item.order}`}
              light={light}
            >
              {fields(item, (patch) => onChange(updateTrainingSeries(series, item.id, patch)))}
            </SeriesFieldsCard>
          </div>

          {intercalationsAfterSeries(intercalationList, item.id).map((occ) => {
            const gifSrc = intercalatedGifUrl(occ);
            const label = intercalationLabelOrder(series, intercalationList, occ.id);
            const name = translateExerciseName(occ.name);
            return (
              <div key={occ.id} className="mt-1.5 flex items-start gap-2">
                <GifThumb
                  src={gifSrc}
                  caption={name}
                  desktop={isDesktop}
                  light={light}
                />
                <SeriesFieldsCard
                  title={`Série ${label}`}
                  titleClass={light ? 'text-zinc-500' : 'text-[#2F8FA3]'}
                  canRemove={!readOnly}
                  light={light}
                  onRemove={() =>
                    onIntercalationsChange?.(
                      intercalationList.filter((entry) => entry.id !== occ.id)
                    )
                  }
                  removeLabel={`Remover ${name}`}
                >
                  {fields(occ.series, (patch) =>
                    onIntercalationsChange?.(updateIntercalatedSeries(intercalationList, occ.id, patch))
                  )}
                </SeriesFieldsCard>
              </div>
            );
          })}

          {showSlots ? (
            <IntercalationSlotRow
              previous={lastIntercalationBeforeSlot(series, intercalationList, item.id)}
              desktop={isDesktop}
              light={light}
              onPick={() => onPickIntercalation?.(item.id)}
              onRepeat={(source) => onRepeatIntercalation?.(item.id, source)}
            />
          ) : null}
        </div>
      ))}
      {!readOnly ? (
        <div className="flex items-start gap-2">
          <GifColumnSpacer desktop={isDesktop} />
          <button
            type="button"
            onClick={() => onChange(addTrainingSeries(series))}
            className={`min-w-0 flex-1 h-9 rounded-lg border border-dashed text-[11px] font-semibold transition-colors ${
              light
                ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400'
                : 'border-white/15 text-[#4CCB7A] hover:bg-[#4CCB7A]/10 hover:border-[#4CCB7A]/40'
            }`}
          >
            + Adicionar série
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ExerciseSeriesEditor;
