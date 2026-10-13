'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, Plus, Minus, Trash2, Save, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Star, BookOpen, ListOrdered, Clock, Layers, Zap } from 'lucide-react';
import type { PlannerSettings, PlannerStats, Schedule, ScheduleSettings, PlanInput } from '@/types/videoLibrary';
import { buildStudyDays, calculatePlannerStats, generatePlanInput } from '@/utils/studyPlannerUtils';
import { generateSchedule } from '@/utils/scheduleGenerator';
import {
  loadPlannersFromFirestore,
  savePlannerToFirestore,
  deletePlannerFromFirestore,
  getFavoritePlannerId,
  setFavoritePlannerId,
} from '@/utils/plannerFirestore';
import { loadScheduleFromFirestore, saveScheduleToFirestore, deleteScheduleFromFirestore } from '@/utils/scheduleFirestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { courseVideosToVideoFiles } from './courseVideoToVideoFile';
import type { CourseVideoItem } from './CoursePlayer';
import { displaySubjectName, getSubjectVisual } from '@/utils/oftreviewSubjectVisuals';

function subjectCardLines(subject: string): { lead: string; rest: string } {
  const full = displaySubjectName(subject);
  const comma = full.indexOf(',');
  if (comma > 0) {
    return { lead: full.slice(0, comma).trim(), rest: full.slice(comma + 1).trim() };
  }
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { lead: full, rest: '' };
  return { lead: words[0], rest: words.slice(1).join(' ') };
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function listMonthsInRange(startISO: string, endISO: string): { year: number; month: number }[] {
  const [sy, sm] = startISO.split('-').map(Number);
  const [ey, em] = endISO.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const months: { year: number; month: number }[] = [];
  let year = sy;
  let month = sm;
  while (year < ey || (year === ey && month <= em)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function toDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const WEEKDAYS = [
  { name: 'Dom', fullName: 'Domingo', index: 0 },
  { name: 'Seg', fullName: 'Segunda-feira', index: 1 },
  { name: 'Ter', fullName: 'Terça-feira', index: 2 },
  { name: 'Qua', fullName: 'Quarta-feira', index: 3 },
  { name: 'Qui', fullName: 'Quinta-feira', index: 4 },
  { name: 'Sex', fullName: 'Sexta-feira', index: 5 },
  { name: 'Sáb', fullName: 'Sábado', index: 6 },
];

const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  intercalateSubjects: false,
  splitLongVideos: true,
};

/** Formata YYYY-MM-DD para dd/mm/aaaa */
function formatDateDDMMYYYY(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface OftPayPlannerProps {
  courseId: string;
  videos: CourseVideoItem[];
  onScheduleChange: (schedule: Schedule | null) => void;
  onPlannerChange?: (plannerId: string | null, planner: PlannerSettings | null) => void;
  /** Dados já carregados da conta do código CarPlay, sem login Google. */
  carplayBundle?: {
    planners: PlannerSettings[];
    favoritePlannerId: string | null;
    schedules: Record<string, Schedule>;
  } | null;
}

export default function OftPayPlanner({
  courseId,
  videos,
  onScheduleChange,
  onPlannerChange,
  carplayBundle = null,
}: OftPayPlannerProps) {
  const libraryId = `oftpay_${courseId}`;
  const videoFiles = useMemo(() => courseVideosToVideoFiles(videos), [videos]);
  const availableSubjects = useMemo(() => {
    const set = new Set(videos.map((v) => v.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [videos]);
  const progressMap = useMemo(() => ({}), []);

  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [plannerName, setPlannerName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hoursPerWeekday, setHoursPerWeekday] = useState<{ [k: number]: number }>({
    0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0,
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectOrder, setSubjectOrder] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [calendarPromptDate, setCalendarPromptDate] = useState<string | null>(null);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(0);

  useEffect(() => {
    setCalendarMonthIndex(0);
    setCalendarPromptDate(null);
  }, [startDate, endDate]);
  const [plannersList, setPlannersList] = useState<PlannerSettings[]>([]);
  const [favoritePlannerId, setFavoritePlannerIdState] = useState<string | null>(null);
  const [isLoadingPlanners, setIsLoadingPlanners] = useState(false);
  const [stats, setStats] = useState<PlannerStats | null>(null);
  /** Quando true, o usuário clicou em "Novo Planejamento" — não reabrir o favorito. */
  const userChoseNewPlannerRef = useRef(false);
  /** Snapshot do planejamento carregado: usado para saber se houve alteração (botão Salvar inativo até mudar algo). */
  const loadedSnapshotRef = useRef<{
    name: string;
    startDate: string;
    endDate: string;
    allowedWeekdays: number[];
    hoursPerWeekday: { [k: number]: number };
    selectedSubjects: string[];
    subjectOrder: string[];
    blockedDates: string[];
  } | null>(null);

  const loadPlannerSettings = useCallback((p: PlannerSettings) => {
    const name = p.name ?? '';
    const start = p.startDateISO;
    const end = p.endDateISO;
    const weekdays = p.allowedWeekdays ?? [];
    const hours = p.hoursPerWeekday && Object.keys(p.hoursPerWeekday).length > 0
      ? p.hoursPerWeekday
      : { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 };
    const subjects = p.selectedSubjects ?? [];
    const order = p.subjectOrder ?? p.selectedSubjects ?? [];
    const blocked = Array.isArray(p.blockedDates) ? p.blockedDates : [];

    setPlannerId(p.id ?? null);
    setPlannerName(name);
    setStartDate(start);
    setEndDate(end);
    setAllowedWeekdays(weekdays);
    setHoursPerWeekday(hours);
    setSelectedSubjects(subjects);
    setSubjectOrder(order);
    setBlockedDates(blocked);
    setCalendarPromptDate(null);

    loadedSnapshotRef.current = {
      name,
      startDate: start,
      endDate: end,
      allowedWeekdays: [...weekdays].sort((a, b) => a - b),
      hoursPerWeekday: { ...hours },
      selectedSubjects: [...subjects].sort(),
      subjectOrder: [...order],
      blockedDates: [...blocked].sort(),
    };
    onPlannerChange?.(p.id ?? null, p);
  }, [onPlannerChange]);

  const loadPlanners = useCallback(async () => {
    try {
      setIsLoadingPlanners(true);
      const [list, favId] = await Promise.all([
        loadPlannersFromFirestore(libraryId),
        getFavoritePlannerId(libraryId),
      ]);
      setPlannersList(list);
      setFavoritePlannerIdState(favId);
    } catch (e) {
      console.error('Erro ao carregar planejamentos:', e);
    } finally {
      setIsLoadingPlanners(false);
    }
  }, [libraryId]);

  useEffect(() => {
    if (carplayBundle) {
      setPlannersList(carplayBundle.planners);
      setFavoritePlannerIdState(carplayBundle.favoritePlannerId);
      setIsLoadingPlanners(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadPlanners();
    });
    return () => unsub();
  }, [loadPlanners, carplayBundle]);

  // Sempre ter um planejamento ativo ao iniciar: abrir o favorito ou o primeiro da lista (não quando o usuário escolheu "Novo Planejamento")
  useEffect(() => {
    if (plannersList.length === 0) return;
    if (userChoseNewPlannerRef.current) return;
    const currentValid = plannerId && plannersList.some((p) => p.id === plannerId);
    if (currentValid) return;
    const target =
      favoritePlannerId && plannersList.find((p) => p.id === favoritePlannerId)
        ? plannersList.find((p) => p.id === favoritePlannerId)!
        : plannersList[0];
    loadPlannerSettings(target);
  }, [plannersList, favoritePlannerId, plannerId, loadPlannerSettings]);

  useEffect(() => {
    if (!plannerId) return;
    if (carplayBundle) {
      const cached = carplayBundle.schedules[plannerId];
      if (cached) onScheduleChange(cached);
      return;
    }
    loadScheduleFromFirestore(libraryId, plannerId).then((s) => {
      if (s) onScheduleChange(s);
    });
  }, [plannerId, libraryId, onScheduleChange, carplayBundle]);

  useEffect(() => {
    if (startDate && endDate && allowedWeekdays.length > 0 && selectedSubjects.length > 0) {
      const studyDays = buildStudyDays(startDate, endDate, allowedWeekdays, hoursPerWeekday, blockedDates);
      const s = calculatePlannerStats(studyDays, hoursPerWeekday, videoFiles, progressMap, selectedSubjects);
      setStats(s);
    } else {
      setStats(null);
    }
  }, [startDate, endDate, allowedWeekdays, hoursPerWeekday, blockedDates, selectedSubjects, subjectOrder, videoFiles, progressMap]);

  const handleSavePlanner = useCallback(async () => {
    if (!startDate || !endDate || !plannerName.trim()) {
      alert('Preencha nome, data de início e data de fim');
      return;
    }
    if (selectedSubjects.length === 0) {
      alert('Selecione pelo menos uma pasta/assunto');
      return;
    }
    try {
      const settings: PlannerSettings = {
        id: plannerId ?? undefined,
        libraryId,
        name: plannerName.trim(),
        startDateISO: startDate,
        endDateISO: endDate,
        allowedWeekdays,
        hoursPerWeekday,
        selectedSubjects,
        subjectOrder: subjectOrder.length > 0 ? subjectOrder : selectedSubjects,
        blockedDates,
      };
      let savedId: string;
      let scheduleForSave: Schedule | null = null;
      if (carplayBundle) {
        const studyDaysForSave = buildStudyDays(startDate, endDate, allowedWeekdays, hoursPerWeekday, blockedDates);
        const selectedVideosForSave = videoFiles.filter((v) => selectedSubjects.includes(v.subject));
        const planInputForSave: PlanInput = {
          studyDays: studyDaysForSave,
          hoursPerWeekday,
          selectedVideoIds: selectedVideosForSave.map((v) => v.videoId),
          selectedSubjects,
          subjectOrder: subjectOrder.length > 0 ? subjectOrder : selectedSubjects,
          plannerId: plannerId ?? 'pending',
        };
        scheduleForSave = generateSchedule(planInputForSave, videoFiles, progressMap, DEFAULT_SCHEDULE_SETTINGS);
        const res = await fetch('/api/oftpay/carplay/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'planner', courseId, settings, schedule: scheduleForSave }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erro ao salvar');
        savedId = typeof data.id === 'string' ? data.id : (plannerId ?? '');
        scheduleForSave = { ...scheduleForSave, plannerId: savedId };
      } else {
        savedId = await savePlannerToFirestore(settings);
      }
      setPlannerId(savedId);

      let schedule = scheduleForSave;
      if (!carplayBundle) {
        const studyDays = buildStudyDays(startDate, endDate, allowedWeekdays, hoursPerWeekday, blockedDates);
        const selectedVideos = videoFiles.filter((v) => selectedSubjects.includes(v.subject));
        const planInput: PlanInput = {
          studyDays,
          hoursPerWeekday,
          selectedVideoIds: selectedVideos.map((v) => v.videoId),
          selectedSubjects,
          subjectOrder: subjectOrder.length > 0 ? subjectOrder : selectedSubjects,
          plannerId: savedId,
        };
        schedule = generateSchedule(planInput, videoFiles, progressMap, DEFAULT_SCHEDULE_SETTINGS);
        await saveScheduleToFirestore(libraryId, schedule);
      }

      onScheduleChange(schedule);
      onPlannerChange?.(savedId, { ...settings, id: savedId });
      loadedSnapshotRef.current = {
        name: settings.name,
        startDate: settings.startDateISO,
        endDate: settings.endDateISO,
        allowedWeekdays: [...settings.allowedWeekdays].sort((a, b) => a - b),
        hoursPerWeekday: { ...settings.hoursPerWeekday },
        selectedSubjects: [...settings.selectedSubjects].sort(),
        subjectOrder: [...(settings.subjectOrder ?? settings.selectedSubjects)],
        blockedDates: [...(settings.blockedDates ?? [])].sort(),
      };
      if (!carplayBundle) await loadPlanners();
      alert('Planejamento salvo. Cronograma gerado.');
    } catch (e) {
      console.error('Erro ao salvar:', e);
      alert('Erro ao salvar. Tente novamente.');
    }
  }, [plannerId, plannerName, startDate, endDate, allowedWeekdays, hoursPerWeekday, blockedDates, selectedSubjects, subjectOrder, libraryId, courseId, videoFiles, progressMap, loadPlanners, onScheduleChange, onPlannerChange, carplayBundle]);

  const handleNewPlanner = useCallback(() => {
    userChoseNewPlannerRef.current = true;
    loadedSnapshotRef.current = null;
    setPlannerId(null);
    setPlannerName('');
    setStartDate('');
    setEndDate('');
    setAllowedWeekdays([1, 2, 3, 4, 5]);
    setHoursPerWeekday({ 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });
    setSelectedSubjects([]);
    setSubjectOrder([]);
    setBlockedDates([]);
    setCalendarPromptDate(null);
    setStats(null);
    onScheduleChange(null);
    onPlannerChange?.(null, null);
  }, [onScheduleChange, onPlannerChange]);

  const handleDeletePlanner = useCallback(async (id: string) => {
    if (!confirm('Excluir este planejamento? O cronograma também será removido.')) return;
    try {
      await deleteScheduleFromFirestore(libraryId, id);
      await deletePlannerFromFirestore(libraryId, id);
      if (favoritePlannerId === id) {
        await setFavoritePlannerId(libraryId, null);
        setFavoritePlannerIdState(null);
      }
      if (plannerId === id) {
        handleNewPlanner();
      }
      await loadPlanners();
    } catch (e) {
      console.error('Erro ao deletar:', e);
      alert('Erro ao deletar.');
    }
  }, [libraryId, plannerId, favoritePlannerId, handleNewPlanner, loadPlanners]);

  const handleSetFavorite = useCallback(async () => {
    if (!plannerId || !plannersList.some((p) => p.id === plannerId)) return;
    try {
      await setFavoritePlannerId(libraryId, plannerId);
      setFavoritePlannerIdState(plannerId);
    } catch (e) {
      console.error('Erro ao definir favorito:', e);
    }
  }, [libraryId, plannerId, plannersList]);

  const toggleWeekday = (index: number) => {
    setAllowedWeekdays((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort()
    );
  };
  const updateHoursForWeekday = (weekday: number, hours: number) => {
    setHoursPerWeekday((prev) => ({ ...prev, [weekday]: Math.max(0, hours) }));
  };
  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      const next = prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject];
      setSubjectOrder((ord) =>
        prev.includes(subject) ? ord.filter((s) => s !== subject) : [...ord, subject]
      );
      return next;
    });
  };
  const moveSubjectUp = (subject: string) => {
    setSubjectOrder((prev) => {
      const i = prev.indexOf(subject);
      if (i <= 0) return prev;
      const n = [...prev];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      return n;
    });
  };
  const moveSubjectDown = (subject: string) => {
    setSubjectOrder((prev) => {
      const i = prev.indexOf(subject);
      if (i < 0 || i >= prev.length - 1) return prev;
      const n = [...prev];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];
      return n;
    });
  };

  const orderedSelectedSubjects = useMemo(() => {
    const ordered = subjectOrder.filter((s) => selectedSubjects.includes(s));
    const rest = selectedSubjects.filter((s) => !subjectOrder.includes(s));
    return [...ordered, ...rest];
  }, [selectedSubjects, subjectOrder]);

  /** Para planejamento existente: botão Salvar só ativo se houver alteração em relação ao carregado. */
  const hasChanges = useMemo(() => {
    if (!plannerId) return true; // Novo planejamento: sempre pode salvar (se form válido)
    const snap = loadedSnapshotRef.current;
    if (!snap) return true;
    if (plannerName.trim() !== snap.name) return true;
    if (startDate !== snap.startDate) return true;
    if (endDate !== snap.endDate) return true;
    const aw = [...allowedWeekdays].sort((a, b) => a - b);
    const saw = [...snap.allowedWeekdays].sort((a, b) => a - b);
    if (aw.length !== saw.length || aw.some((v, i) => v !== saw[i])) return true;
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    if (allDays.some((d) => (hoursPerWeekday[d] ?? 0) !== (snap.hoursPerWeekday[d] ?? 0))) return true;
    const ss = [...selectedSubjects].sort();
    const sss = [...snap.selectedSubjects].sort();
    if (ss.length !== sss.length || ss.some((v, i) => v !== sss[i])) return true;
    if (subjectOrder.length !== snap.subjectOrder.length || subjectOrder.some((v, i) => v !== snap.subjectOrder[i])) return true;
    const blocked = [...blockedDates].sort();
    const snapBlocked = [...(snap.blockedDates ?? [])].sort();
    if (blocked.length !== snapBlocked.length || blocked.some((v, i) => v !== snapBlocked[i])) return true;
    return false;
  }, [plannerId, plannerName, startDate, endDate, allowedWeekdays, hoursPerWeekday, blockedDates, selectedSubjects, subjectOrder]);

  const formatHours = (minutes: number) => {
    if (minutes === 0) return '0h';
    const h = Math.abs(minutes) / 60;
    const sign = minutes < 0 ? '-' : '';
    return h >= 1 ? `${sign}${h.toFixed(1)}h` : `${sign}${Math.abs(minutes).toFixed(0)}min`;
  };

  /** Ícones por curso: Oftreview em /Oftreview Icones/; Propedeutics em /Propedeutics Icones/ (BIOMETRIA.png, CORNEA.png, EMERGENCIA.png, GLAUCOMA.png, RETINA.png, ULTRASSOM.png). */
  const getSubjectIconSrc = (subject: string) => {
    if (courseId?.toLowerCase() === 'propedeutics') {
      const normalized = (subject || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const propedeuticsIcons: Record<string, string> = {
        biometria: 'BIOMETRIA',
        cornea: 'CORNEA',
        emergencia: 'EMERGENCIA',
        glaucoma: 'GLAUCOMA',
        retina: 'RETINA',
        ultrassom: 'ULTRASSOM',
      };
      const iconName = propedeuticsIcons[normalized] ?? (subject.trim().toUpperCase());
      return `/Propedeutics%20Icones/${encodeURIComponent(iconName)}.png`;
    }
    return `/Oftreview%20Icones/${encodeURIComponent(subject.trim())}.png`;
  };

  const weeklyHours = Object.entries(hoursPerWeekday)
    .filter(([index]) => allowedWeekdays.includes(parseInt(index, 10)))
    .reduce((sum, [, hours]) => sum + (hours || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 md:text-2xl">Planejador de Estudo</h2>
            <p className="mt-1 text-sm text-gray-500">Configure sua rotina e organize seu cronograma de estudos.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewPlanner}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Planejamento
        </button>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Planejamento</h3>
        <div className="mt-3 space-y-3">
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Planejamento atual</label>
            <div className="relative">
              <select
                value={plannerId ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) {
                    userChoseNewPlannerRef.current = false;
                    const p = plannersList.find((x) => x.id === id);
                    if (p) loadPlannerSettings(p);
                  } else {
                    handleNewPlanner();
                  }
                }}
                onFocus={() => { if (plannersList.length === 0) loadPlanners(); }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-16 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Novo Planejamento --</option>
                {plannersList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {plannerId && plannersList.some((p) => p.id === plannerId) && (
                <>
                  <button
                    type="button"
                    onClick={handleSetFavorite}
                    className="absolute right-14 top-1/2 -translate-y-1/2 rounded-lg p-1 text-amber-500 hover:bg-amber-50"
                    title={plannerId === favoritePlannerId ? 'Planejamento favorito (abre ao iniciar)' : 'Definir como favorito (abre ao iniciar)'}
                  >
                    <Star className={`h-3.5 w-3.5 ${plannerId === favoritePlannerId ? 'fill-amber-500' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => plannerId && confirm('Tem certeza que deseja excluir este planejamento? O cronograma associado também será excluído.') && handleDeletePlanner(plannerId)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-lg p-1 text-red-600 hover:bg-red-50"
                    title="Excluir planejamento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Nome do planejamento</label>
            <input
              type="text"
              value={plannerName}
              onChange={(e) => setPlannerName(e.target.value)}
              placeholder="Ex: Estudo Anual 2025, Foco Catarata, etc."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Calendário</h3>
              {!startDate || !endDate ? (
                <p className="mt-3 text-sm text-gray-500">Defina o início e o fim para ver os dias.</p>
              ) : (() => {
                const periodMonths = listMonthsInRange(startDate, endDate);
                const monthIndex = Math.min(calendarMonthIndex, Math.max(0, periodMonths.length - 1));
                const current = periodMonths[monthIndex];
                if (!current) return null;
                const { year, month } = current;
                const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
                const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
                const cells: Array<number | null> = [
                  ...Array.from({ length: firstWeekday }, () => null),
                  ...Array.from({ length: totalDays }, (_, i) => i + 1),
                ];
                return (
                  <div className="mt-3 w-full">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={monthIndex <= 0}
                        onClick={() => {
                          setCalendarPromptDate(null);
                          setCalendarMonthIndex(monthIndex - 1);
                        }}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="text-sm font-semibold text-gray-900">{MONTH_LABELS[month - 1]} {year}</p>
                      <button
                        type="button"
                        disabled={monthIndex >= periodMonths.length - 1}
                        onClick={() => {
                          setCalendarPromptDate(null);
                          setCalendarMonthIndex(monthIndex + 1);
                        }}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                        aria-label="Próximo mês"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mb-1.5 grid grid-cols-7 gap-1.5">
                      {WEEKDAYS.map((d) => (
                        <span key={d.index} className="text-center text-[11px] font-medium text-gray-400">{d.name}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {cells.map((day, index) => {
                        if (day == null) return <span key={`empty-${index}`} />;
                        const iso = toDateISO(year, month, day);
                        const inPeriod = iso >= startDate && iso <= endDate;
                        const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
                        const isStudyDay = inPeriod && allowedWeekdays.includes(weekday);
                        const isBlocked = blockedDates.includes(iso);
                        const showPrompt = calendarPromptDate === iso;
                        const placeLeft = weekday >= 4;
                        return (
                          <div key={iso} className="relative">
                            <button
                              type="button"
                              disabled={!isStudyDay && !isBlocked}
                              onClick={() => setCalendarPromptDate(iso)}
                              className={`h-10 w-full rounded-lg text-sm font-medium ${
                                !inPeriod
                                  ? 'text-gray-300'
                                  : isBlocked
                                    ? 'bg-gray-200 text-gray-500 line-through'
                                    : isStudyDay
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-gray-400 border border-gray-200'
                              }`}
                            >
                              {day}
                            </button>
                            {showPrompt && (isStudyDay || isBlocked) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockedDates((prev) => (
                                    isBlocked ? prev.filter((d) => d !== iso) : [...prev, iso]
                                  ));
                                  setCalendarPromptDate(null);
                                }}
                                className={`absolute top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md ${
                                  placeLeft ? 'right-full mr-1' : 'left-full ml-1'
                                }`}
                              >
                                {isBlocked ? 'Desbloquear' : 'Bloquear'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        Disponível
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                        Bloqueado
                      </span>
                    </div>
                  </div>
                );
              })()}
          </div>
          </div>
          <div className="min-w-0 lg:border-l lg:border-gray-100 lg:pl-6">
            <div>
            <p className="mb-1.5 text-xs font-medium text-gray-600">Período</p>
            <div className="flex flex-nowrap items-center gap-2">
              <div className="relative h-10 w-[8.75rem] shrink-0 rounded-xl border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Data de início"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-gray-800">
                  {startDate ? formatDateDDMMYYYY(startDate) : 'dd/mm/aaaa'}
                </span>
              </div>
              <span className="text-sm text-gray-400">→</span>
              <div className="relative h-10 w-[8.75rem] shrink-0 rounded-xl border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Data de fim"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-gray-800">
                  {endDate ? formatDateDDMMYYYY(endDate) : 'dd/mm/aaaa'}
                </span>
              </div>
            </div>
            <h3 className="mt-5 border-t border-gray-100 pt-4 text-sm font-semibold text-gray-900">Disponibilidade semanal</h3>
            <p className="mt-1 text-sm text-gray-500">Defina quanto tempo você pode estudar em cada dia.</p>
            <div className="mt-4 space-y-1.5">
              {WEEKDAYS.map((d) => {
                const active = allowedWeekdays.includes(d.index);
                return (
                  <div
                    key={d.index}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                      active ? 'bg-blue-50/70' : 'bg-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleWeekday(d.index)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-300'}`} />
                      <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{d.fullName}</span>
                    </button>
                    {active ? (
                      <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateHoursForWeekday(d.index, Math.max(0, (hoursPerWeekday[d.index] ?? 0) - 0.5))}
                          className="flex h-9 w-9 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600"
                          aria-label="Diminuir 0,5 h"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[3.5rem] border-x border-gray-200 px-1 text-center text-sm font-semibold tabular-nums text-gray-800">
                          {(hoursPerWeekday[d.index] ?? 0).toFixed(1)} h
                        </span>
                        <button
                          type="button"
                          onClick={() => updateHoursForWeekday(d.index, Math.min(24, (hoursPerWeekday[d.index] ?? 0) + 0.5))}
                          className="flex h-9 w-9 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600"
                          aria-label="Aumentar 0,5 h"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
            {allowedWeekdays.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {allowedWeekdays.length} {allowedWeekdays.length === 1 ? 'dia ativo' : 'dias ativos'}
                </span>
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                  {weeklyHours.toFixed(1)}h / semana
                </span>
              </div>
            ) : (
              <p className="mt-3 text-xs text-red-600">Selecione pelo menos um dia da semana</p>
            )}
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)] lg:gap-5">
        <div className="min-w-0 rounded-[22px] border border-slate-200/60 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <BookOpen className="h-5 w-5 text-blue-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Assuntos do cronograma</h3>
              <p className="mt-0.5 text-sm text-slate-500">Selecione os temas que deseja incluir no seu planejamento.</p>
            </div>
          </div>
          <p className="shrink-0 pt-1 text-sm font-semibold text-blue-600">
            {selectedSubjects.length} {selectedSubjects.length === 1 ? 'selecionado' : 'selecionados'}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
          {availableSubjects.length === 0 ? (
            <div className="col-span-full">
              <p className="text-sm text-slate-500">Nenhum assunto disponível. Os assuntos vêm das pastas dos vídeos (GCS).</p>
            </div>
          ) : (
            availableSubjects.map((subject) => {
              const isSelected = selectedSubjects.includes(subject);
              const visual = getSubjectVisual(subject);
              const lines = subjectCardLines(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  aria-pressed={isSelected}
                  className={`relative flex min-w-0 flex-col items-center overflow-hidden rounded-2xl border bg-white px-1.5 pb-2 pt-2.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:flex-row sm:items-center sm:gap-2 sm:px-2 sm:py-2 sm:text-left lg:flex-col lg:items-center lg:gap-0 lg:px-1.5 lg:pb-2 lg:pt-2.5 lg:text-center xl:flex-row xl:items-center xl:gap-2 xl:px-2 xl:py-2 xl:text-left ${
                    isSelected
                      ? 'border-blue-200 bg-blue-50/30'
                      : 'border-slate-200/80 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  <span className={`absolute inset-x-0 top-0 h-[3px] ${visual.stripeClass} ${isSelected ? '' : 'opacity-60'}`} />
                  {isSelected ? <CheckCircle2 className="absolute right-1.5 top-2 h-3.5 w-3.5 text-blue-600" /> : null}
                  <img
                    src={getSubjectIconSrc(subject)}
                    alt=""
                    className="h-8 w-8 shrink-0 object-contain sm:h-7 sm:w-7 lg:h-8 lg:w-8 xl:h-7 xl:w-7"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span className="mt-1.5 min-w-0 sm:mt-0 lg:mt-1.5 xl:mt-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-900 sm:line-clamp-2">{lines.lead}</span>
                    {lines.rest ? (
                      <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-slate-500">{lines.rest}</span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selectedSubjects.length === 0 && availableSubjects.length > 0 && (
          <p className="mt-3 text-xs text-red-600">Selecione pelo menos um assunto</p>
        )}
        </div>

        <div className="min-w-0 rounded-[22px] border border-slate-200/60 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <ListOrdered className="h-5 w-5 text-slate-700" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Ordem e resumo</h3>
              <p className="mt-0.5 text-sm text-slate-500">A sequência abaixo será usada na geração do cronograma.</p>
            </div>
          </div>
          {stats && startDate && endDate && selectedSubjects.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                    <p className="text-sm font-semibold tabular-nums text-blue-700">{stats.studyDaysCount}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">dias</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-purple-600" aria-hidden />
                    <p className="text-sm font-semibold tabular-nums text-purple-700">{formatHours(stats.totalCapacityMinutes)}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">capacidade</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
                    <p className="text-sm font-semibold tabular-nums text-orange-700">{formatHours(stats.totalLoadMinutes)}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">conteúdo</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`h-3.5 w-3.5 shrink-0 ${stats.excessMinutes >= 0 ? 'text-green-600' : 'text-red-600'}`} aria-hidden />
                    <p className={`text-sm font-semibold tabular-nums ${stats.excessMinutes >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {stats.excessMinutes >= 0 ? '+' : ''}{formatHours(stats.excessMinutes)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">folga</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${stats.coveragePercent}%` }} />
                </div>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">{stats.coveragePercent.toFixed(1)}%</span>
              </div>
              {stats.excessMinutes < 0 ? (
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Não cabe no período. Ajuste as horas ou as datas.
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Cabe com folga de {formatHours(stats.excessMinutes)}h
                </p>
              )}
            </div>
          )}
          {orderedSelectedSubjects.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">Selecione assuntos para definir a ordem.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {orderedSelectedSubjects.map((subject, index) => {
                const visual = getSubjectVisual(subject);
                const stat = stats?.perSubjectStats.find((item) => item.subject === subject);
                return (
                  <div key={subject} className="flex min-h-14 items-center gap-2 rounded-[14px] border border-slate-200/70 bg-white px-2.5 py-1.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${visual.dotClass}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{displaySubjectName(subject)}</p>
                      {stat ? (
                        <p className="truncate text-[11px] tabular-nums text-slate-500">
                          {stat.videoCount} vídeos · {stat.totalMinutes.toFixed(1)}h · {stat.watchedMinutes.toFixed(1)}h assist. · {stat.watchedPercent.toFixed(1)}%
                        </p>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => moveSubjectUp(subject)} disabled={index === 0} className="rounded-lg p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-30" title="Mover para cima" aria-label="Mover para cima">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => moveSubjectDown(subject)} disabled={index === orderedSelectedSubjects.length - 1} className="rounded-lg p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-30" title="Mover para baixo" aria-label="Mover para baixo">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleSavePlanner}
          disabled={!startDate || !endDate || !plannerName.trim() || selectedSubjects.length === 0 || !hasChanges}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={plannerId && !hasChanges ? 'Nenhuma alteração para salvar' : undefined}
        >
          <Save className="h-4 w-4" />
          Salvar Planejamento
        </button>
      </div>
    </div>
  );
}
