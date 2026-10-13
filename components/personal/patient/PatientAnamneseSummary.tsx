'use client';

import { useState, type ReactNode } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  MapPin,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  buildEnvironmentRows,
  buildProfileRows,
  buildRoutineRows,
  buildSafetyRows,
} from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaSummarySections';
import {
  BARRIER_OPTIONS,
  BODY_PRIORITY_OPTIONS,
  CARDIO_ACTIVITY_OPTIONS,
  getEquipmentLabels,
  getExperienceLabel,
  getPrimaryGoalLabel,
  getSecondaryGoalLabels,
  labelsFromOptions,
  MODALITY_OPTIONS,
  CURRENT_ACTIVITY_OPTIONS,
} from '@/lib/avaliacaoAtividadeFisica/summaryLabels';
import type { AvaliacaoAtividadeFisicaSummary } from '@/types/avaliacaoAtividadeFisica';

const WEEK_DAYS = [
  { value: 'monday', short: 'SEG', label: 'Segunda-feira' },
  { value: 'tuesday', short: 'TER', label: 'Terça-feira' },
  { value: 'wednesday', short: 'QUA', label: 'Quarta-feira' },
  { value: 'thursday', short: 'QUI', label: 'Quinta-feira' },
  { value: 'friday', short: 'SEX', label: 'Sexta-feira' },
  { value: 'saturday', short: 'SÁB', label: 'Sábado' },
  { value: 'sunday', short: 'DOM', label: 'Domingo' },
] as const;

const MUTED_BADGE_VALUES = new Set([
  'none',
  'unknown',
  'nothing',
  'no_preference',
  'Nenhum objetivo adicional',
  'Nenhum equipamento',
  'Nada costuma atrapalhar',
  'Não tenho preferência',
]);

type Row = { label: string; value: string };

function visibleRows(rows: Row[]): Row[] {
  return rows.filter((row) => row.value && row.value !== 'Não informado');
}

function rowValue(rows: Row[], label: string): string | null {
  return rows.find((row) => row.label === label)?.value ?? null;
}

function CategoryCard({
  title,
  icon: Icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#315072] bg-[#11294B]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12382c]">
          <Icon className="h-4 w-4 text-[#4DDA91]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-white">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#9FB4CF] transition-transform duration-200 motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-[#315072] px-3.5 py-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-[#315072]/70 pt-2.5 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-medium text-[#9FB4CF]">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-white">{value}</p>
    </div>
  );
}

function EmptySection() {
  return <p className="text-sm text-[#9FB4CF]">Nenhuma informação nesta seção.</p>;
}

function Badge({ children, muted = false }: { children: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full break-words rounded-full border px-2.5 py-1 text-xs font-medium leading-snug ${
        muted
          ? 'border-[#315072] bg-[#1B3658] text-[#9FB4CF]'
          : 'border-[#4DDA91]/35 bg-[#12382c] text-[#4DDA91]'
      }`}
    >
      {children}
    </span>
  );
}

function BadgeWrap({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label, index) => (
        <Badge key={`${label}-${index}`} muted={MUTED_BADGE_VALUES.has(label)}>
          {label}
        </Badge>
      ))}
    </div>
  );
}

function CompactBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#1B3658] px-3 py-2.5">
      <p className="text-[11px] font-medium text-[#9FB4CF]">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-white">{children}</div>
    </div>
  );
}

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#1B3658] px-3 py-2.5">
      <p className="break-words text-lg font-semibold leading-tight text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#9FB4CF]">{caption}</p>
    </div>
  );
}

function durationStat(minutes: number): { value: string; caption: string } {
  if (minutes === 100) return { value: '+90', caption: 'min / treino' };
  return { value: String(minutes), caption: 'min / treino' };
}

function GoalsSection({ summary }: { summary: AvaliacaoAtividadeFisicaSummary }) {
  const goal = summary.goalProfile;
  const primary =
    goal.primaryGoal === 'other'
      ? goal.primaryGoalOther?.trim() || 'Outro'
      : getPrimaryGoalLabel(goal.primaryGoal);
  const primaryShown = primary && primary !== 'Não informado' ? primary : null;
  const secondary = getSecondaryGoalLabels(goal.secondaryGoals).filter(Boolean);
  const experience = getExperienceLabel(goal.experienceLevel);
  const experienceShown = experience && experience !== 'Não informado' ? experience : null;

  const activityNames = [
    ...labelsFromOptions(CURRENT_ACTIVITY_OPTIONS, goal.currentActivities),
    ...(goal.currentActivityOther?.trim() ? [goal.currentActivityOther.trim()] : []),
  ];
  const frequency =
    goal.currentFrequencyPerWeek != null
      ? `${goal.currentFrequencyPerWeek} vez${goal.currentFrequencyPerWeek === 1 ? '' : 'es'} por semana`
      : '';
  const inactive = goal.currentlyActive === false;
  const active = goal.currentlyActive === true && (activityNames.length > 0 || Boolean(frequency));
  const hasContent = Boolean(primaryShown || secondary.length || experienceShown || inactive || active);

  return (
    <CategoryCard title="Objetivos e experiência" icon={Target} defaultOpen>
      {!hasContent ? (
        <EmptySection />
      ) : (
        <div className="space-y-3">
          {primaryShown ? (
            <div className="flex min-w-0 items-start gap-2.5 rounded-2xl bg-[#1B3658] px-3 py-2.5">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#4DDA91]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#9FB4CF]">Objetivo principal</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold text-white">
                  {primaryShown}
                </p>
              </div>
            </div>
          ) : null}
          {secondary.length > 0 ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-medium text-[#9FB4CF]">Outros objetivos</p>
              <BadgeWrap labels={secondary} />
            </div>
          ) : null}
          {experienceShown || inactive || active ? (
            <div className="grid grid-cols-1 gap-2">
              {experienceShown ? (
                <CompactBlock label="Experiência">
                  <p className="break-words">{experienceShown}</p>
                </CompactBlock>
              ) : null}
              {inactive || active ? (
                <CompactBlock label="Atividade atual">
                  {inactive ? <p>Não pratica atualmente</p> : null}
                  {active && activityNames.length > 0 ? (
                    <p className="whitespace-pre-wrap break-words">{activityNames.join(', ')}</p>
                  ) : null}
                  {active && frequency ? <p className="mt-0.5 text-[#9FB4CF]">{frequency}</p> : null}
                </CompactBlock>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </CategoryCard>
  );
}

function RoutineSection({ summary }: { summary: AvaliacaoAtividadeFisicaSummary }) {
  const routine = summary.routine;
  const rows = visibleRows(buildRoutineRows(summary));
  const days = routine.availableDaysPerWeek;
  const duration =
    routine.sessionDurationMinutes != null ? durationStat(routine.sessionDurationMinutes) : null;
  const selected = new Set(routine.preferredWeekdays || []);
  const knownSelected = WEEK_DAYS.some((day) => selected.has(day.value));
  const preferredRow = rowValue(rows, 'Dias preferidos');
  const variable = preferredRow === 'Rotina variável';
  const showWeek = !variable && knownSelected;
  const unknownDays = (routine.preferredWeekdays || []).filter(
    (value) => !WEEK_DAYS.some((day) => day.value === value)
  );
  const extras = rows.filter(
    (row) => !['Dias disponíveis', 'Dias preferidos', 'Duração por treino'].includes(row.label)
  );
  const hasContent = Boolean(days != null || duration || preferredRow || extras.length);

  return (
    <CategoryCard title="Rotina e disponibilidade" icon={CalendarDays} defaultOpen>
      {!hasContent ? (
        <EmptySection />
      ) : (
        <div className="space-y-3">
          {days != null || duration ? (
            <div className={`grid gap-2 ${days != null && duration ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {days != null ? (
                <Stat
                  value={String(days)}
                  caption={days === 1 ? 'dia / semana' : 'dias / semana'}
                />
              ) : null}
              {duration ? <Stat value={duration.value} caption={duration.caption} /> : null}
            </div>
          ) : null}
          {showWeek ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-medium text-[#9FB4CF]">Dias preferidos</p>
              <div className="grid grid-cols-7 gap-1" role="list" aria-label="Dias preferidos">
                {WEEK_DAYS.map((day) => {
                  const on = selected.has(day.value);
                  return (
                    <span
                      key={day.value}
                      role="listitem"
                      aria-label={`${day.label}, ${on ? 'selecionado' : 'não selecionado'}`}
                      className={`flex min-w-0 items-center justify-center rounded-lg border px-0.5 py-1.5 text-[10px] font-semibold leading-none ${
                        on
                          ? 'border-[#4DDA91]/40 bg-[#12382c] text-[#4DDA91]'
                          : 'border-[#315072] bg-[#091D3C] text-[#9FB4CF]'
                      }`}
                    >
                      {day.short}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
          {preferredRow && !showWeek ? <Field label="Dias preferidos" value={preferredRow} /> : null}
          {showWeek && unknownDays.length > 0 ? (
            <Field label="Dias preferidos" value={unknownDays.join(', ')} />
          ) : null}
          {extras.map((row) => (
            <Field key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}
    </CategoryCard>
  );
}

function ProfileSection({ summary }: { summary: AvaliacaoAtividadeFisicaSummary }) {
  const profile = summary.trainingProfile;
  const rows = visibleRows(buildProfileRows(summary));
  const priorities = labelsFromOptions(BODY_PRIORITY_OPTIONS, profile.bodyPriorities);
  const modalities = labelsFromOptions(MODALITY_OPTIONS, profile.preferredModalities);
  const cardioActivities = labelsFromOptions(CARDIO_ACTIVITY_OPTIONS, profile.preferredCardioActivities);
  const barriers = labelsFromOptions(BARRIER_OPTIONS, profile.trainingBarriers);
  const cardioOther = profile.preferredCardioOther?.trim() || '';
  const barrierOther = profile.trainingBarrierOther?.trim() || '';
  const showPriorities = Boolean(rowValue(rows, 'Prioridades corporais'));
  const showModalities = Boolean(rowValue(rows, 'Modalidades'));
  const intensity = rowValue(rows, 'Intensidade');
  const cardio = rowValue(rows, 'Cardio');
  const showCardioActivities = Boolean(rowValue(rows, 'Atividades aeróbicas'));
  const favorites = rowValue(rows, 'Exercícios favoritos');
  const avoided = rowValue(rows, 'Exercícios evitados');
  const showBarriers = Boolean(rowValue(rows, 'Barreiras'));
  const hasContent = rows.length > 0;

  return (
    <CategoryCard title="Preferências de treino" icon={Dumbbell} defaultOpen={false}>
      {!hasContent ? (
        <EmptySection />
      ) : (
        <div className="space-y-3">
          {showPriorities && priorities.length > 0 ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-medium text-[#9FB4CF]">Prioridades corporais</p>
              <ol className="space-y-1.5">
                {priorities.map((label, index) => (
                  <li key={`${label}-${index}`} className="flex min-w-0 items-start gap-2 text-sm text-white">
                    <span className="shrink-0 font-semibold text-[#4DDA91]">{index + 1}ª</span>
                    <span className="min-w-0 break-words">{label}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {showModalities && modalities.length > 0 ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-medium text-[#9FB4CF]">Modalidades</p>
              <BadgeWrap labels={modalities} />
            </div>
          ) : null}
          {intensity ? <Field label="Intensidade" value={intensity} /> : null}
          {cardio ? <Field label="Cardio" value={cardio} /> : null}
          {showCardioActivities ? (
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-medium text-[#9FB4CF]">Atividades aeróbicas</p>
              <BadgeWrap labels={cardioActivities} />
              {cardioOther ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white">{cardioOther}</p>
              ) : null}
            </div>
          ) : null}
          {favorites ? <Field label="Exercícios favoritos" value={favorites} /> : null}
          {avoided ? <Field label="Exercícios evitados" value={avoided} /> : null}
          {showBarriers ? (
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-medium text-[#9FB4CF]">Barreiras</p>
              <BadgeWrap labels={barriers} />
              {barrierOther ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white">{barrierOther}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </CategoryCard>
  );
}

function EnvironmentSection({ summary }: { summary: AvaliacaoAtividadeFisicaSummary }) {
  const environment = summary.environment;
  const rows = visibleRows(buildEnvironmentRows(summary));
  const location = rowValue(rows, 'Local');
  const showEquipment = Boolean(rowValue(rows, 'Equipamentos'));
  const equipment = getEquipmentLabels(environment.availableEquipment);
  const equipmentOther = environment.availableEquipmentOther?.trim() || '';
  const extras = rows.filter((row) => row.label !== 'Local' && row.label !== 'Equipamentos');

  return (
    <CategoryCard title="Local e equipamentos" icon={MapPin} defaultOpen={false}>
      {rows.length === 0 ? (
        <EmptySection />
      ) : (
        <div className="space-y-3">
          {location ? (
            <div className="flex min-w-0 items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4DDA91]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#9FB4CF]">Local</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white">{location}</p>
              </div>
            </div>
          ) : null}
          {showEquipment ? (
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-medium text-[#9FB4CF]">Equipamentos</p>
              <BadgeWrap labels={equipment} />
              {equipmentOther ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white">{equipmentOther}</p>
              ) : null}
            </div>
          ) : null}
          {extras.map((row) => (
            <Field key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}
    </CategoryCard>
  );
}

function SafetySection({ summary }: { summary: AvaliacaoAtividadeFisicaSummary }) {
  const rows = visibleRows(buildSafetyRows(summary));

  return (
    <CategoryCard title="Segurança e limitações" icon={HeartPulse} defaultOpen={false}>
      {rows.length === 0 ? (
        <EmptySection />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Field key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}
    </CategoryCard>
  );
}

export function PatientAnamneseSummary({ summary }: { summary: AvaliacaoAtividadeFisicaSummary }) {
  return (
    <div className="space-y-3">
      <GoalsSection summary={summary} />
      <RoutineSection summary={summary} />
      <ProfileSection summary={summary} />
      <EnvironmentSection summary={summary} />
      <SafetySection summary={summary} />
    </div>
  );
}
