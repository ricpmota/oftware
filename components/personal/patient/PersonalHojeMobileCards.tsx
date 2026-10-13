'use client';

import { Calendar, CheckCircle, ChevronRight, Dumbbell, FileText, List, Loader2, Play, Printer, Target } from 'lucide-react';

const press =
  'motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:active:scale-[0.98] motion-safe:active:brightness-110';

function GreenTexture() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.22]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 18% 30%, rgba(255,255,255,0.16) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 70%, rgba(255,255,255,0.12) 0 1px, transparent 1.6px), linear-gradient(125deg, transparent 42%, rgba(255,255,255,0.07) 42.4%, transparent 43%), linear-gradient(35deg, transparent 62%, rgba(0,40,30,0.12) 62.4%, transparent 63%)',
        backgroundSize: '18px 18px, 22px 22px, 100% 100%, 100% 100%',
      }}
    />
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const value = Math.min(100, Math.max(0, percent));
  const radius = 8;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
      <circle cx="11" cy="11" r={radius} fill="none" stroke="rgba(145,180,230,0.35)" strokeWidth="2.4" />
      <circle
        cx="11"
        cy="11"
        r={radius}
        fill="none"
        stroke="#32F5A3"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 11 11)"
      />
    </svg>
  );
}

export function PersonalEditWorkoutCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[74px] w-full items-center gap-3 overflow-hidden rounded-[20px] border border-[#8ed8be]/30 px-3.5 py-1.5 text-left ${press}`}
      style={{ background: 'linear-gradient(105deg, #0b5c4c 0%, #0e7560 54%, #12866d 100%)' }}
    >
      <GreenTexture />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7f6ef]/80">
        <Dumbbell className="h-[18px] w-[18px] text-[#071C3C]" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-tight text-white">Edite seu Treino</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-white/70">
          Personalize exercícios, séries e carga
        </span>
      </span>
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
        <ChevronRight className="h-3.5 w-3.5 text-white/90" aria-hidden />
      </span>
    </button>
  );
}

function statusBadgeClass(status: string): string {
  if (status === 'done') return 'bg-[#08C98D]/15 text-[#9dffd0] ring-[#32F5A3]/30';
  if (status === 'skipped') return 'bg-red-500/15 text-red-200 ring-red-300/25';
  return 'bg-[#172E52] text-[#F5F8FF] ring-[rgba(145,180,230,0.22)]';
}

function statusLabel(status: string): string {
  if (status === 'done') return 'Concluído';
  if (status === 'skipped') return 'Pulado';
  return 'Agendado';
}

export function PersonalTodayHeroCard({
  dayTitle,
  status,
  title,
  exerciseCount,
  doneCount,
  percentage,
  progressCaption,
  muscleImageUrl,
  muscleAlt,
  onMuscleError,
  startLabel,
  startSubtitle,
  startCompleted,
  onStart,
  startDisabled,
  onPrint,
  printDisabled,
  printLoading,
}: {
  dayTitle: string;
  status: string;
  title: string;
  exerciseCount: number;
  doneCount: number;
  percentage: number;
  progressCaption: string;
  muscleImageUrl?: string | null;
  muscleAlt: string;
  onMuscleError: () => void;
  startLabel: string;
  startSubtitle: string;
  startCompleted: boolean;
  onStart: () => void;
  startDisabled?: boolean;
  onPrint: () => void;
  printDisabled?: boolean;
  printLoading?: boolean;
}) {
  return (
    <section className="space-y-3.5 rounded-[24px] border border-[rgba(126,168,214,0.22)] bg-gradient-to-b from-[#0c2244] to-[#071428] p-5 text-[#F5F8FF] shadow-[0_18px_36px_-22px_rgba(0,0,0,0.72)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-medium text-[#A7B7D2]">{dayTitle}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusBadgeClass(status)}`}>
              <Calendar className="h-3 w-3" aria-hidden />
              {statusLabel(status)}
            </span>
          </div>
          <h2 className="text-[32px] font-bold leading-[1.05] tracking-tight text-[#F5F8FF]">{title}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#C5D3E8]">
            <span className="inline-flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-[#E8F1FF]" aria-hidden />
              {exerciseCount} exercícios
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <ProgressRing percent={percentage} />
              {percentage}%
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Target className="h-3.5 w-3.5 text-[#D5E6FF]" aria-hidden />
              {doneCount}/{exerciseCount}
            </span>
          </div>
          <div className="flex items-center gap-3 pt-0.5">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#163056]">
              <div
                className="h-full rounded-full bg-[#1EBE86] motion-safe:transition-all motion-safe:duration-300"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
            <span className="shrink-0 text-[12px] font-medium tabular-nums text-[#A7B7D2]">
              {progressCaption}: {percentage}%
            </span>
          </div>
        </div>
        {muscleImageUrl ? (
          <div className="w-[104px] shrink-0 self-start sm:w-[116px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={muscleImageUrl}
              alt={muscleAlt}
              className="h-auto w-full object-contain"
              loading="lazy"
              onError={onMuscleError}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className={`relative flex min-h-[76px] w-full items-center gap-3 overflow-hidden rounded-[22px] border border-[rgba(126,255,196,0.55)] px-3.5 py-2 text-left shadow-[0_0_16px_rgba(16,196,140,0.16)] disabled:cursor-not-allowed disabled:opacity-50 ${press}`}
        style={{ background: 'linear-gradient(108deg, #0d7a60 0%, #12a078 48%, #1cbf8c 100%)' }}
      >
        <GreenTexture />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/85">
          {startCompleted ? (
            <CheckCircle className="h-[18px] w-[18px] text-white" aria-hidden />
          ) : (
            <Play className="h-[18px] w-[18px] fill-white text-white" aria-hidden />
          )}
        </span>
        <span className="relative h-8 w-px shrink-0 bg-white/30" aria-hidden />
        <span className="relative min-w-0 flex-1 text-left">
          <span className="block text-[17px] font-bold leading-tight text-white">{startLabel}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-white/75">{startSubtitle}</span>
        </span>
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#063528]/45">
          <ChevronRight className="h-4 w-4 text-white" aria-hidden />
        </span>
      </button>

      <button
        type="button"
        onClick={onPrint}
        disabled={printDisabled}
        className={`flex min-h-[70px] w-full items-center gap-3 rounded-[20px] border border-[rgba(148,182,224,0.32)] bg-[#122844] px-3.5 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${press}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#071428] text-white">
          {printLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-tight text-[#F5F8FF]">Imprimir treino</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[#A7B7D2]">Leve seu treino para onde quiser</span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
          <ChevronRight className="h-3.5 w-3.5 text-white/90" aria-hidden />
        </span>
      </button>
      </div>
    </section>
  );
}

export function PersonalExerciseListHeader({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-h-[90px] w-full items-center gap-3 rounded-[22px] border border-[rgba(145,180,230,0.20)] bg-[#0B2042] px-3.5 py-3 text-left ${press} ${expanded ? 'rounded-b-none border-b-0' : ''}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#172E52] text-white">
        <List className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold leading-tight text-[#F5F8FF]">Ver todos os exercícios</span>
        <span className="mt-1 block text-[13px] leading-snug text-[#A7B7D2]">Explore a biblioteca de exercícios</span>
      </span>
      <ChevronRight className={`h-5 w-5 shrink-0 text-white transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden />
    </button>
  );
}

export function PersonalNotesHeader({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`flex min-h-[90px] w-full items-center gap-3 rounded-[22px] border border-[rgba(145,180,230,0.20)] bg-[#0B2042] px-3.5 py-3 text-left ${press}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#172E52] text-white">
        <FileText className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold leading-tight text-[#F5F8FF]">Observações</span>
        <span className="mt-1 block text-[13px] leading-snug text-[#A7B7D2]">Anotações e observações do seu treino</span>
      </span>
      <span className="text-sm font-semibold text-[#32F5A3]">Editar</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-white" aria-hidden />
    </button>
  );
}
