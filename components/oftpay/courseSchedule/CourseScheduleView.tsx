'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { ProgressMap, ScheduleDay, ScheduleItem } from '@/types/videoLibrary';
import {
  WEEKDAY_NAMES,
  calculateItemProgress,
  findCurrentWeekIndex,
  formatTime,
  localTodayISO,
  utcDateISO,
  watchedPercentForItems,
  weekEndISO,
} from '@/components/oftreview/scheduleMetrics';
import {
  displaySubjectName,
  getSubjectVisual,
  shortSubjectLabel,
} from '@/utils/oftreviewSubjectVisuals';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export type ScheduleWeekGroup = { weekStart: Date; days: ScheduleDay[] };

type Props = {
  weeks: ScheduleWeekGroup[];
  progressMap: ProgressMap;
  videos: Array<{ videoId: string; name: string }>;
  onItemClick: (item: ScheduleItem) => void;
  selectedVideoId?: string | null;
  presentation: 'expanded' | 'compact';
};

function addUtcDaysISO(weekStart: Date, days: number): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateISO(date);
}

function formatShortDate(dateISO: string): string {
  const [, month, day] = dateISO.split('-');
  return `${day}/${month}`;
}

function formatPrettyRange(startISO: string, endISO: string): string {
  const [, startMonth, startDay] = startISO.split('-').map(Number);
  const [, endMonth, endDay] = endISO.split('-').map(Number);
  const startLabel = `${String(startDay).padStart(2, '0')} ${MONTHS_SHORT[startMonth - 1]}`;
  const endLabel = `${String(endDay).padStart(2, '0')} ${MONTHS_SHORT[endMonth - 1]}`;
  if (startMonth === endMonth) {
    return `${String(startDay).padStart(2, '0')}–${String(endDay).padStart(2, '0')} ${MONTHS_SHORT[endMonth - 1]}`;
  }
  return `${startLabel} – ${endLabel}`;
}

function weekTiming(weekStart: Date): 'past' | 'current' | 'future' {
  const today = localTodayISO();
  const start = utcDateISO(weekStart);
  const end = weekEndISO(weekStart);
  if (today < start) return 'future';
  if (today > end) return 'past';
  return 'current';
}

function lessonTitle(item: ScheduleItem, videos: Array<{ videoId: string; name: string }>): string {
  const fromList = videos.find((video) => video.videoId === item.videoId)?.name;
  const base = (fromList || item.name || 'Aula').trim();
  if (item.isPart && item.part) {
    return `${base} (Parte ${item.part.partNumber}/${item.part.totalParts})`;
  }
  return base;
}

function weekStats(week: ScheduleWeekGroup, progressMap: ProgressMap) {
  const items = week.days.flatMap((day) => day.items);
  const completed = items.filter((item) => calculateItemProgress(item, progressMap).status === 'watched').length;
  const plannedMinutes = week.days.reduce((sum, day) => sum + day.plannedMinutes, 0);
  const watchedMinutes = week.days.reduce((sum, day) => sum + day.watchedMinutes, 0);
  const percent = watchedPercentForItems(items, progressMap);
  const studiedDays = week.days.filter((day) => day.watchedMinutes > 0).length;
  const averagePerStudiedDay = studiedDays > 0 ? watchedMinutes / studiedDays : 0;
  return { items, completed, plannedMinutes, watchedMinutes, percent, studiedDays, averagePerStudiedDay };
}

type SubjectRollup = {
  subject: string;
  totalLessons: number;
  plannedMinutes: number;
  watchedMinutes: number;
  watchedPercent: number;
};

function rollupSubjects(items: ScheduleItem[], progressMap: ProgressMap): SubjectRollup[] {
  const groups = new Map<string, ScheduleItem[]>();
  items.forEach((item) => {
    const key = (item.subject || '').trim();
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  });
  return Array.from(groups.entries())
    .map(([subject, group]) => {
      let plannedMinutes = 0;
      let watchedMinutes = 0;
      group.forEach((item) => {
        plannedMinutes += item.plannedMinutes;
        watchedMinutes += calculateItemProgress(item, progressMap).watchedMinutes;
      });
      return {
        subject,
        totalLessons: group.length,
        plannedMinutes,
        watchedMinutes,
        watchedPercent: watchedPercentForItems(group, progressMap),
      };
    })
    .sort(
      (a, b) =>
        b.plannedMinutes - a.plannedMinutes ||
        b.totalLessons - a.totalLessons ||
        a.subject.localeCompare(b.subject, 'pt-BR'),
    );
}

function daySlots(week: ScheduleWeekGroup) {
  const byDate = new Map(week.days.map((day) => [day.dateISO, day]));
  return Array.from({ length: 7 }, (_, weekday) => {
    const dateISO = addUtcDaysISO(week.weekStart, weekday);
    return { weekday, dateISO, day: byDate.get(dateISO) };
  });
}

function SubjectIcon({
  subject,
  className,
}: {
  subject: string;
  className: string;
}) {
  const visual = getSubjectVisual(subject);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={`inline-block shrink-0 rounded-sm ${visual.dotClass} ${className}`} aria-hidden />;
  }
  return (
    <img
      src={visual.iconSrc}
      alt=""
      className={`shrink-0 object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

function LessonCard({
  item,
  progressMap,
  videos,
  onItemClick,
  active,
}: {
  item: ScheduleItem;
  progressMap: ProgressMap;
  videos: Array<{ videoId: string; name: string }>;
  onItemClick: (item: ScheduleItem) => void;
  active: boolean;
}) {
  const progress = calculateItemProgress(item, progressMap);
  const title = lessonTitle(item, videos);
  const visual = getSubjectVisual(item.subject);
  const statusLabel = active
    ? 'Reproduzindo'
    : progress.status === 'watched'
      ? 'Concluída'
      : progress.status === 'in_progress'
        ? 'Continuar'
        : 'Assistir';
  const statusClass = active
    ? 'text-blue-700'
    : progress.status === 'watched'
      ? 'text-green-700'
      : progress.status === 'in_progress'
        ? 'text-blue-700'
        : 'text-gray-600';

  return (
    <button
      type="button"
      onClick={() => onItemClick(item)}
      className={`relative w-full overflow-hidden rounded-xl border p-3 pl-4 text-left transition-colors ${
        active
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${visual.stripeClass}`} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md px-1 py-0.5 ${visual.badgeClass}`}
          title={displaySubjectName(item.subject)}
        >
          <SubjectIcon subject={item.subject} className="h-6 w-6" />
          <span className="truncate text-[10px] font-semibold tracking-wide">{shortSubjectLabel(item.subject)}</span>
        </span>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
            item.estimatedDuration ? 'bg-amber-50 text-amber-800/80' : 'text-gray-400'
          }`}
        >
          {item.estimatedDuration ? '≈ ' : ''}
          {Math.round(item.plannedMinutes)} min
        </span>
      </div>
      <p className="mt-2 min-w-0 break-words text-sm font-semibold leading-snug text-gray-900">{title}</p>
      {progress.totalDuration > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>
              {formatTime(progress.watchedSeconds)} / {formatTime(progress.totalDuration)}
            </span>
            <span>{Math.round(progress.percent)}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-1 rounded-full ${progress.status === 'watched' ? 'bg-green-600' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
        </div>
      )}
      <p className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${statusClass}`}>
        {progress.status === 'watched' && !active ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {statusLabel}
      </p>
    </button>
  );
}

function MonthCalendar({
  weeks,
  progressMap,
  selectedDayISO,
  onSelectDay,
}: {
  weeks: ScheduleWeekGroup[];
  progressMap: ProgressMap;
  selectedDayISO: string | null;
  onSelectDay: (dateISO: string) => void;
}) {
  const today = localTodayISO();
  const anchor = selectedDayISO || today;
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    setCursor(null);
  }, [selectedDayISO]);

  const visible = cursor ?? {
    year: Number(anchor.slice(0, 4)),
    month: Number(anchor.slice(5, 7)),
  };

  const dayMeta = useMemo(() => {
    const map = new Map<string, { planned: boolean; completed: boolean }>();
    weeks.forEach((week) => {
      week.days.forEach((day) => {
        if (day.items.length === 0) return;
        const completed = day.items.every((item) => calculateItemProgress(item, progressMap).status === 'watched');
        map.set(day.dateISO, { planned: true, completed });
      });
    });
    return map;
  }, [weeks, progressMap]);

  const firstWeekday = new Date(Date.UTC(visible.year, visible.month - 1, 1)).getUTCDay();
  const totalDays = new Date(Date.UTC(visible.year, visible.month, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ];

  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(visible.year, visible.month - 1 + delta, 1));
    setCursor({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {MONTHS[visible.month - 1]} {visible.year}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={`${letter}-${index}`} className="text-center text-[10px] font-medium text-gray-400">
            {letter}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day == null) return <span key={`empty-${index}`} />;
          const dateISO = `${visible.year}-${String(visible.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const meta = dayMeta.get(dateISO);
          const selected = dateISO === selectedDayISO;
          const isToday = dateISO === today;
          const className = selected
            ? 'bg-blue-600 text-white'
            : meta?.completed
              ? 'bg-green-50 text-green-700'
              : meta?.planned
                ? 'bg-white text-gray-800'
                : 'text-gray-300';
          return (
            <button
              key={dateISO}
              type="button"
              disabled={!meta?.planned}
              onClick={() => onSelectDay(dateISO)}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${className} ${
                isToday && !selected ? 'ring-1 ring-blue-600' : ''
              } ${meta?.planned && !selected ? 'hover:bg-blue-50' : ''} ${!meta?.planned ? 'cursor-default' : ''}`}
            >
              {day}
              {meta?.planned && !selected ? (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${meta.completed ? 'bg-green-600' : 'bg-blue-600'}`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubjectProgressBar({ percent, barClass }: { percent: number; barClass: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <span className="shrink-0 text-[11px] font-medium text-gray-500">{Math.round(percent)}%</span>
    </div>
  );
}

function WeekThemes({ themes, compact }: { themes: SubjectRollup[]; compact?: boolean }) {
  const visible = themes.slice(0, 3);
  const hiddenCount = Math.max(0, themes.length - visible.length);
  const single = themes.length === 1 ? themes[0] : null;

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {themes.length === 1 ? 'Tema da semana' : 'Temas da semana'}
      </p>
      {themes.length === 0 ? (
        <p className="mt-3 text-xs text-gray-400">Nenhum tema nesta semana.</p>
      ) : single ? (
        <div className="mt-2">
          <SubjectIcon subject={single.subject} className={compact ? 'h-12 w-12' : 'h-14 w-14'} />
          <p className="mt-2 text-sm font-semibold leading-snug text-gray-900">{displaySubjectName(single.subject)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {single.totalLessons} {single.totalLessons === 1 ? 'aula' : 'aulas'} · {Math.round(single.watchedMinutes)} min estudados
          </p>
          <SubjectProgressBar percent={single.watchedPercent} barClass={getSubjectVisual(single.subject).barClass} />
        </div>
      ) : (
        <div className="mt-2 space-y-2.5">
          {visible.map((theme) => (
            <div key={theme.subject || 'sem-assunto'} className="flex items-start gap-2">
              <SubjectIcon subject={theme.subject} className="mt-0.5 h-8 w-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-900" title={displaySubjectName(theme.subject)}>
                  {displaySubjectName(theme.subject)}
                </p>
                <p className="text-[11px] text-gray-500">
                  {theme.totalLessons} {theme.totalLessons === 1 ? 'aula' : 'aulas'} · {Math.round(theme.watchedMinutes)} min
                </p>
                <SubjectProgressBar percent={theme.watchedPercent} barClass={getSubjectVisual(theme.subject).barClass} />
              </div>
            </div>
          ))}
          {hiddenCount > 0 ? (
            <p className="text-[11px] text-gray-400">
              + {hiddenCount} {hiddenCount === 1 ? 'outro tema' : 'outros temas'}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function WeekSummary({
  weekIndex,
  week,
  progressMap,
  compact,
}: {
  weekIndex: number;
  week: ScheduleWeekGroup;
  progressMap: ProgressMap;
  compact?: boolean;
}) {
  const { stats, themes } = useMemo(() => {
    const nextStats = weekStats(week, progressMap);
    return { stats: nextStats, themes: rollupSubjects(nextStats.items, progressMap) };
  }, [week, progressMap]);
  const range = formatPrettyRange(utcDateISO(week.weekStart), weekEndISO(week.weekStart));
  const percentLabel = `${Math.round(stats.percent)}%`;
  const lessonLabel = `${stats.completed} de ${stats.items.length} aulas concluídas`;

  const progressBlock = (
    <div className="min-w-0">
      <p className={`font-semibold tracking-tight text-gray-900 ${compact ? 'text-3xl' : 'text-[32px] leading-none'}`}>
        {percentLabel}
      </p>
      <p className="mt-2 text-sm font-semibold text-gray-900">Semana {weekIndex + 1}</p>
      <p className="text-sm text-gray-500">{range}</p>
      <p className="mt-2 text-sm text-gray-600">{lessonLabel}</p>
      <div className="mt-3 h-1.5 w-full max-w-[11rem] overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${stats.percent >= 90 ? 'bg-green-600' : 'bg-blue-600'}`}
          style={{ width: `${Math.min(100, stats.percent)}%` }}
        />
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {progressBlock}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
          <Stat value={`${Math.round(stats.plannedMinutes)} min`} label="planejados" />
          <Stat value={`${Math.round(stats.watchedMinutes)} min`} label="assistidos" />
          <Stat value={`${stats.studiedDays} ${stats.studiedDays === 1 ? 'dia' : 'dias'}`} label="estudados" />
        </div>
        <div className="mt-4 border-t border-gray-100 pt-3">
          <WeekThemes themes={themes} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,1.2fr)] items-start gap-0">
        <div className="min-w-0 pr-5">{progressBlock}</div>
        <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 border-l border-gray-100 px-5">
          <Stat value={`${Math.round(stats.plannedMinutes)} min`} label="planejados" />
          <Stat value={`${Math.round(stats.watchedMinutes)} min`} label="assistidos" />
          <Stat value={`${stats.studiedDays} ${stats.studiedDays === 1 ? 'dia' : 'dias'}`} label="estudados" />
          <Stat value={`${Math.round(stats.averagePerStudiedDay)} min`} label="média/dia" />
        </div>
        <div className="min-w-0 border-l border-gray-100 pl-5">
          <WeekThemes themes={themes} />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function WeekCards({
  weeks,
  progressMap,
  selectedIndex,
  onSelect,
}: {
  weeks: ScheduleWeekGroup[];
  progressMap: ProgressMap;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const themesByWeek = useMemo(
    () => weeks.map((week) => rollupSubjects(week.days.flatMap((day) => day.items), progressMap)),
    [weeks, progressMap],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = itemRefs.current[selectedIndex];
    if (!scroller || !item) return;
    const left = item.offsetLeft - scroller.clientWidth / 2 + item.offsetWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [selectedIndex, weeks.length]);

  return (
    <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {weeks.map((week, index) => {
        const stats = weekStats(week, progressMap);
        const themes = themesByWeek[index] ?? [];
        const selected = index === selectedIndex;
        const timing = weekTiming(week.weekStart);
        const done = stats.percent >= 90;
        const range = formatPrettyRange(utcDateISO(week.weekStart), weekEndISO(week.weekStart));
        return (
          <button
            key={week.weekStart.toISOString()}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            onClick={() => onSelect(index)}
            className={`w-[158px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              selected
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              {done ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${timing === 'current' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
              Semana {index + 1}
            </span>
            <span className={`mt-1 block text-[11px] ${selected ? 'text-blue-600' : 'text-gray-500'}`}>{range}</span>
            {themes.length > 0 && themes.length <= 2 ? (
              <span className="mt-1.5 flex items-center">
                {themes.map((theme, themeIndex) => (
                  <SubjectIcon
                    key={theme.subject || 'sem-assunto'}
                    subject={theme.subject}
                    className={`h-4 w-4 ${themeIndex > 0 ? '-ml-1' : ''}`}
                  />
                ))}
              </span>
            ) : null}
            <span className={`mt-1 block text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
              {Math.round(stats.percent)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayChip({
  weekday,
  dateISO,
  selected,
  planned,
  onClick,
}: {
  weekday: number;
  dateISO: string;
  selected: boolean;
  planned: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2 ${
        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700'
      }`}
    >
      <span className={`text-[10px] font-medium uppercase ${selected ? 'text-blue-100' : 'text-gray-400'}`}>
        {WEEKDAY_NAMES[weekday]}
      </span>
      <span className="text-sm font-semibold">{dateISO.slice(8, 10)}</span>
      {planned ? <span className={`mt-1 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-blue-600'}`} /> : <span className="mt-1 h-1 w-1" />}
    </button>
  );
}

export default function CourseScheduleView({
  weeks,
  progressMap,
  videos,
  onItemClick,
  selectedVideoId,
  presentation,
}: Props) {
  const weeksIdentity = weeks.map((week) => week.weekStart.toISOString()).join('|');
  const weeksRef = useRef(weeks);
  weeksRef.current = weeks;
  const pendingDayRef = useRef<string | null>(null);
  const [pickedWeekIndex, setPickedWeekIndex] = useState<number | null>(null);
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  useEffect(() => {
    setPickedWeekIndex(null);
  }, [weeksIdentity]);

  const currentWeekIndex = findCurrentWeekIndex(weeks);
  const selectedWeekIndex = weeks.length === 0
    ? 0
    : Math.min(pickedWeekIndex ?? currentWeekIndex, weeks.length - 1);
  const activeWeek = weeks[selectedWeekIndex];

  useEffect(() => {
    const week = weeksRef.current[selectedWeekIndex];
    if (!week) {
      setSelectedDayISO(null);
      return;
    }
    const start = utcDateISO(week.weekStart);
    const end = weekEndISO(week.weekStart);
    const pending = pendingDayRef.current;
    pendingDayRef.current = null;
    if (pending && pending >= start && pending <= end) {
      setSelectedDayISO(pending);
      return;
    }
    const today = localTodayISO();
    if (today >= start && today <= end) {
      setSelectedDayISO(today);
      return;
    }
    setSelectedDayISO(week.days[0]?.dateISO ?? start);
  }, [selectedWeekIndex, weeksIdentity]);

  const chooseWeek = (index: number, dayISO?: string) => {
    if (index === selectedWeekIndex) {
      if (dayISO) setSelectedDayISO(dayISO);
      return;
    }
    pendingDayRef.current = dayISO ?? null;
    setPickedWeekIndex(index);
  };

  const chooseCalendarDay = (dateISO: string) => {
    const index = weeks.findIndex((week) => dateISO >= utcDateISO(week.weekStart) && dateISO <= weekEndISO(week.weekStart));
    if (index < 0) return;
    chooseWeek(index, dateISO);
  };

  if (!activeWeek) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
        Nenhum dia de estudo no cronograma.
      </div>
    );
  }

  const slots = daySlots(activeWeek);
  const selectedSlot = slots.find((slot) => slot.dateISO === selectedDayISO) ?? slots.find((slot) => slot.day) ?? slots[0];

  const openLesson = (item: ScheduleItem, dateISO: string) => {
    chooseCalendarDay(dateISO);
    onItemClick(item);
  };

  const lessonsOf = (day: ScheduleDay | undefined, dateISO: string) => {
    if (!day || day.items.length === 0) {
      return <p className="px-1 py-6 text-center text-xs text-gray-400">Sem aulas neste dia.</p>;
    }
    return (
      <div className="space-y-2">
        {day.items.map((item) => (
          <LessonCard
            key={item.itemId}
            item={item}
            progressMap={progressMap}
            videos={videos}
            onItemClick={(clicked) => openLesson(clicked, dateISO)}
            active={!!selectedVideoId && selectedVideoId === item.videoId}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <h2 className="mb-4 hidden text-lg font-semibold text-gray-900 md:block">Cronograma de Estudos</h2>
      <div className="md:hidden space-y-4">
        <MonthCalendar
          weeks={weeks}
          progressMap={progressMap}
          selectedDayISO={selectedDayISO}
          onSelectDay={chooseCalendarDay}
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => chooseWeek(Math.max(0, selectedWeekIndex - 1))}
            disabled={selectedWeekIndex <= 0}
            className="rounded-lg p-2 text-gray-500 hover:bg-white disabled:opacity-30"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-sm font-semibold text-gray-900">Semana {selectedWeekIndex + 1}</p>
            <p className="text-xs text-gray-500">
              {formatPrettyRange(utcDateISO(activeWeek.weekStart), weekEndISO(activeWeek.weekStart))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => chooseWeek(Math.min(weeks.length - 1, selectedWeekIndex + 1))}
            disabled={selectedWeekIndex >= weeks.length - 1}
            className="rounded-lg p-2 text-gray-500 hover:bg-white disabled:opacity-30"
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <WeekSummary weekIndex={selectedWeekIndex} week={activeWeek} progressMap={progressMap} compact />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {slots.map((slot) => (
            <DayChip
              key={slot.dateISO}
              weekday={slot.weekday}
              dateISO={slot.dateISO}
              selected={slot.dateISO === selectedSlot?.dateISO}
              planned={!!slot.day && slot.day.items.length > 0}
              onClick={() => setSelectedDayISO(slot.dateISO)}
            />
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">
            {WEEKDAY_NAMES[selectedSlot.weekday]}, {formatShortDate(selectedSlot.dateISO)}
          </p>
          {lessonsOf(selectedSlot.day, selectedSlot.dateISO)}
        </div>
      </div>

      {presentation === 'compact' ? (
        <div className="hidden md:block space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Semana {selectedWeekIndex + 1}</p>
              <p className="text-xs text-gray-500">
                {formatPrettyRange(utcDateISO(activeWeek.weekStart), weekEndISO(activeWeek.weekStart))}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{Math.round(weekStats(activeWeek, progressMap).percent)}%</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => chooseWeek(Math.max(0, selectedWeekIndex - 1))}
                disabled={selectedWeekIndex <= 0}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white disabled:opacity-30"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => chooseWeek(Math.min(weeks.length - 1, selectedWeekIndex + 1))}
                disabled={selectedWeekIndex >= weeks.length - 1}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white disabled:opacity-30"
                aria-label="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {slots.map((slot) => (
              <DayChip
                key={slot.dateISO}
                weekday={slot.weekday}
                dateISO={slot.dateISO}
                selected={slot.dateISO === selectedSlot?.dateISO}
                planned={!!slot.day && slot.day.items.length > 0}
                onClick={() => setSelectedDayISO(slot.dateISO)}
              />
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">
              {WEEKDAY_NAMES[selectedSlot.weekday]}, {formatShortDate(selectedSlot.dateISO)}
            </p>
            {lessonsOf(selectedSlot.day, selectedSlot.dateISO)}
          </div>
        </div>
      ) : (
        <div className="hidden md:block space-y-6">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <WeekSummary weekIndex={selectedWeekIndex} week={activeWeek} progressMap={progressMap} />
            <MonthCalendar
              weeks={weeks}
              progressMap={progressMap}
              selectedDayISO={selectedDayISO}
              onSelectDay={chooseCalendarDay}
            />
          </div>
          <WeekCards
            weeks={weeks}
            progressMap={progressMap}
            selectedIndex={selectedWeekIndex}
            onSelect={(index) => chooseWeek(index)}
          />
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[980px] grid-cols-7 items-start gap-3 xl:min-w-0">
              {slots.map((slot) => {
                const focused = slot.dateISO === selectedSlot?.dateISO;
                return (
                  <div
                    key={slot.dateISO}
                    className={`rounded-2xl border bg-white p-3 shadow-sm ${
                      focused ? 'border-blue-300' : 'border-gray-200'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {WEEKDAY_NAMES[slot.weekday]}, {formatShortDate(slot.dateISO)}
                    </p>
                    {slot.day && slot.day.items.length > 0 ? (
                      <>
                        <p className="mt-2 text-xs text-gray-500">{Math.round(slot.day.plannedMinutes)} min planejados</p>
                        <p className="text-xs text-gray-500">{Math.round(slot.day.watchedMinutes)} min assistidos</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-blue-600"
                              style={{ width: `${Math.min(100, slot.day.progressPercent)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-gray-500">
                            {Math.round(slot.day.progressPercent)}%
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {slot.day.items.map((item) => (
                            <LessonCard
                              key={item.itemId}
                              item={item}
                              progressMap={progressMap}
                              videos={videos}
                              onItemClick={(clicked) => openLesson(clicked, slot.dateISO)}
                              active={!!selectedVideoId && selectedVideoId === item.videoId}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mt-4 text-xs text-gray-400">Sem aulas</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
