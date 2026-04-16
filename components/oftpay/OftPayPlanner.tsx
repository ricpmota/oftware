'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, Plus, Minus, Trash2, Save, ChevronDown, ChevronUp, Star } from 'lucide-react';
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
}

export default function OftPayPlanner({
  courseId,
  videos,
  onScheduleChange,
  onPlannerChange,
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

    setPlannerId(p.id ?? null);
    setPlannerName(name);
    setStartDate(start);
    setEndDate(end);
    setAllowedWeekdays(weekdays);
    setHoursPerWeekday(hours);
    setSelectedSubjects(subjects);
    setSubjectOrder(order);

    loadedSnapshotRef.current = {
      name,
      startDate: start,
      endDate: end,
      allowedWeekdays: [...weekdays].sort((a, b) => a - b),
      hoursPerWeekday: { ...hours },
      selectedSubjects: [...subjects].sort(),
      subjectOrder: [...order],
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
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadPlanners();
    });
    return () => unsub();
  }, [loadPlanners]);

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
    loadScheduleFromFirestore(libraryId, plannerId).then((s) => {
      if (s) onScheduleChange(s);
    });
  }, [plannerId, libraryId, onScheduleChange]);

  useEffect(() => {
    if (startDate && endDate && allowedWeekdays.length > 0 && selectedSubjects.length > 0) {
      const studyDays = buildStudyDays(startDate, endDate, allowedWeekdays, hoursPerWeekday);
      const s = calculatePlannerStats(studyDays, hoursPerWeekday, videoFiles, progressMap, selectedSubjects);
      setStats(s);
    } else {
      setStats(null);
    }
  }, [startDate, endDate, allowedWeekdays, hoursPerWeekday, selectedSubjects, subjectOrder, videoFiles, progressMap]);

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
      };
      const savedId = await savePlannerToFirestore(settings);
      setPlannerId(savedId);

      const studyDays = buildStudyDays(startDate, endDate, allowedWeekdays, hoursPerWeekday);
      const selectedVideos = videoFiles.filter((v) => selectedSubjects.includes(v.subject));
      const planInput: PlanInput = {
        studyDays,
        hoursPerWeekday,
        selectedVideoIds: selectedVideos.map((v) => v.videoId),
        selectedSubjects,
        subjectOrder: subjectOrder.length > 0 ? subjectOrder : selectedSubjects,
        plannerId: savedId,
      };
      const schedule = generateSchedule(planInput, videoFiles, progressMap, DEFAULT_SCHEDULE_SETTINGS);
      await saveScheduleToFirestore(libraryId, schedule);

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
      };
      await loadPlanners();
      alert('Planejamento salvo. Cronograma gerado.');
    } catch (e) {
      console.error('Erro ao salvar:', e);
      alert('Erro ao salvar. Tente novamente.');
    }
  }, [plannerId, plannerName, startDate, endDate, allowedWeekdays, hoursPerWeekday, selectedSubjects, subjectOrder, libraryId, videoFiles, progressMap, loadPlanners, onScheduleChange, onPlannerChange]);

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
    return false;
  }, [plannerId, plannerName, startDate, endDate, allowedWeekdays, hoursPerWeekday, selectedSubjects, subjectOrder]);

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
  const getSubjectShortLabel = (subject: string) => {
    if (subject.toLowerCase() === 'neuroftalmologia') return 'Neuroftalmo';
    const cleaned = subject.replace(/[.,]/g, ' ').trim();
    const first = cleaned.split(/\s+/)[0];
    return first || subject;
  };
  /** Versão curta em maiúsculas para caber no card no mobile (ex: OCULOPLASTICA → OCULOPLA). */
  const getSubjectShortLabelMobile = (subject: string, maxLen = 8) => {
    const upper = (subject || '').trim().toUpperCase();
    if (upper.length <= maxLen) return upper;
    return upper.slice(0, maxLen);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Planejador de Estudo</h2>
        </div>
        <button
          type="button"
          onClick={handleNewPlanner}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Planejamento
        </button>
      </div>

      {/* Seletor de Planejamento Salvo (igual ao oftreview) */}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Planejamento:</label>
        <div className="flex-1 relative">
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
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-16"
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
                className="absolute right-14 top-1/2 transform -translate-y-1/2 p-1 rounded text-amber-500 hover:bg-amber-50"
                title={plannerId === favoritePlannerId ? 'Planejamento favorito (abre ao iniciar)' : 'Definir como favorito (abre ao iniciar)'}
              >
                <Star className={`w-3.5 h-3.5 ${plannerId === favoritePlannerId ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => plannerId && confirm('Tem certeza que deseja excluir este planejamento? O cronograma associado também será excluído.') && handleDeletePlanner(plannerId)}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-red-600 hover:bg-red-50 rounded"
                title="Excluir planejamento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Nome do planejamento */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Nome do Planejamento</label>
        <input
          type="text"
          value={plannerName}
          onChange={(e) => setPlannerName(e.target.value)}
          placeholder="Ex: Estudo Anual 2025, Foco Catarata, etc."
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Período: Início e Fim na mesma linha, 2cm cada, exibição dd/mm/aaaa */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Período</h3>
        <div className="flex flex-nowrap gap-2 items-end min-w-0">
          <div className="flex flex-col gap-0.5 w-[2cm] shrink-0">
            <label className="text-[10px] font-medium text-gray-600 whitespace-nowrap">Início</label>
            <div className="relative w-[2cm] h-7 border border-gray-300 rounded bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Data de início"
              />
              <span className="absolute inset-0 flex items-center px-1.5 text-xs text-gray-800 pointer-events-none">
                {startDate ? formatDateDDMMYYYY(startDate) : 'dd/mm/aaaa'}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 w-[2cm] shrink-0">
            <label className="text-[10px] font-medium text-gray-600 whitespace-nowrap">Fim</label>
            <div className="relative w-[2cm] h-7 border border-gray-300 rounded bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Data de fim"
              />
              <span className="absolute inset-0 flex items-center px-1.5 text-xs text-gray-800 pointer-events-none">
                {endDate ? formatDateDDMMYYYY(endDate) : 'dd/mm/aaaa'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dias da Semana e Horas: 1ª coluna = dia (nome completo), 2ª coluna = controle de horas (+ / −) */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Dias da Semana e Horas</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
          <div className="p-2.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 items-center">
              {WEEKDAYS.map((d) => (
                <Fragment key={d.index}>
                  <button
                    type="button"
                    onClick={() => toggleWeekday(d.index)}
                    className={`px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all duration-200 text-left shadow-sm md:py-2.5 md:text-xs ${
                      allowedWeekdays.includes(d.index)
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-md shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    {d.fullName}
                  </button>
                  <div className="flex items-center justify-center">
                    {allowedWeekdays.includes(d.index) ? (
                      <div className="inline-flex items-center rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateHoursForWeekday(d.index, Math.max(0, (hoursPerWeekday[d.index] ?? 0) - 0.5))}
                          className="flex items-center justify-center w-10 h-10 text-gray-600 hover:bg-gray-100 hover:text-blue-600 active:bg-gray-200 transition-colors touch-manipulation md:w-9 md:h-9"
                          aria-label="Diminuir 0,5 h"
                        >
                          <Minus className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                        <span className="min-w-[3.5rem] py-2 text-center text-sm font-semibold tabular-nums text-gray-800 bg-gray-50/80 border-x border-gray-200 md:min-w-[3rem] md:text-xs">
                          {(hoursPerWeekday[d.index] ?? 0).toFixed(1)} h
                        </span>
                        <button
                          type="button"
                          onClick={() => updateHoursForWeekday(d.index, Math.min(24, (hoursPerWeekday[d.index] ?? 0) + 0.5))}
                          className="flex items-center justify-center w-10 h-10 text-gray-600 hover:bg-gray-100 hover:text-blue-600 active:bg-gray-200 transition-colors touch-manipulation md:w-9 md:h-9"
                          aria-label="Aumentar 0,5 h"
                        >
                          <Plus className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
        {allowedWeekdays.length > 0 && (
          <div className="pt-1 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-medium text-gray-700">Total semanal:</span>
              <span className="text-sm font-bold text-blue-600">
                {Object.entries(hoursPerWeekday)
                  .filter(([i]) => allowedWeekdays.includes(parseInt(i, 10)))
                  .reduce((s, [, h]) => s + (h || 0), 0)
                  .toFixed(1)}h
              </span>
            </div>
          </div>
        )}
        {allowedWeekdays.length === 0 && (
          <p className="text-xs text-red-600">Selecione pelo menos um dia da semana</p>
        )}
      </div>

      {/* Assuntos do Cronograma (pastas dos vídeos do GCS - mesmo layout do oftreview com ícones) */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Assuntos do Cronograma</h3>
        {orderedSelectedSubjects.length > 0 && (
          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-2">Ordem de Estudo:</p>
            <div className="space-y-1">
              {orderedSelectedSubjects.map((subject, index) => (
                <div key={subject} className="flex items-center gap-2 p-1.5 bg-white rounded border border-blue-100">
                  <span className="text-xs font-medium text-gray-700 w-6">{index + 1}.</span>
                  <span className="flex-1 text-xs text-gray-900">{subject}</span>
                  <button type="button" onClick={() => moveSubjectUp(subject)} disabled={index === 0} className="p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Mover para cima">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSubjectDown(subject)} disabled={index === orderedSelectedSubjects.length - 1} className="p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Mover para baixo">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {availableSubjects.length === 0 ? (
            <div className="col-span-full">
              <p className="text-xs text-gray-500">Nenhum assunto disponível. Os assuntos vêm das pastas dos vídeos (GCS).</p>
            </div>
          ) : (
            availableSubjects.map((subject) => {
              const isSelected = selectedSubjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`group flex flex-col items-center justify-start gap-1.5 md:gap-2 p-2 md:p-3 rounded-xl md:rounded-2xl border-2 bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-0 overflow-hidden ${
                    isSelected ? 'border-blue-500 bg-blue-50 shadow-md md:scale-105' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm md:hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <div className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 flex-shrink-0 rounded-lg md:rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200 max-w-full ${
                    isSelected ? 'bg-white shadow-sm border-2 border-blue-100' : 'bg-gray-50 border border-gray-200 group-hover:bg-white group-hover:border-blue-200'
                  }`}>
                    <img
                      src={getSubjectIconSrc(subject)}
                      alt={subject}
                      className={`w-full h-full object-contain transition-transform duration-200 max-w-full max-h-full ${isSelected ? 'md:scale-110' : 'group-hover:scale-105'}`}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className={`text-[10px] md:text-[11px] font-semibold text-center leading-tight transition-colors duration-200 ${isSelected ? 'text-blue-700' : 'text-gray-700 group-hover:text-blue-600'}`}>
                    <span className="md:hidden">{getSubjectShortLabelMobile(subject)}</span>
                    <span className="hidden md:inline">{getSubjectShortLabel(subject)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selectedSubjects.length === 0 && availableSubjects.length > 0 && (
          <p className="text-xs text-red-600">Selecione pelo menos um assunto</p>
        )}
      </div>

      {/* Botão Salvar */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSavePlanner}
          disabled={!startDate || !endDate || !plannerName.trim() || selectedSubjects.length === 0 || !hasChanges}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title={plannerId && !hasChanges ? 'Nenhuma alteração para salvar' : undefined}
        >
          <Save className="w-4 h-4" />
          Salvar Planejamento
        </button>
      </div>

      {/* Resumo e Estatísticas (igual ao oftreview) */}
      {stats && startDate && endDate && selectedSubjects.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Resumo do Planejamento</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            <div className="bg-blue-50 rounded p-2.5">
              <p className="text-xs text-gray-600 mb-0.5">Dias de Estudo</p>
              <p className="text-lg font-bold text-blue-600">{stats.studyDaysCount}</p>
            </div>
            <div className="bg-green-50 rounded p-2.5">
              <p className="text-xs text-gray-600 mb-0.5">Capacidade Total</p>
              <p className="text-lg font-bold text-green-600">{formatHours(stats.totalCapacityMinutes)}</p>
            </div>
            <div className="bg-orange-50 rounded p-2.5">
              <p className="text-xs text-gray-600 mb-0.5">Carga dos Vídeos</p>
              <p className="text-lg font-bold text-orange-600">{formatHours(stats.totalLoadMinutes)}h</p>
            </div>
            <div className={`rounded p-2.5 ${stats.excessMinutes >= 0 ? 'bg-purple-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-600 mb-0.5">Folga/Excesso</p>
              <p className={`text-lg font-bold ${stats.excessMinutes >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {stats.excessMinutes >= 0 ? '+' : ''}{formatHours(stats.excessMinutes)}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Percentual de Cobertura</span>
              <span className="text-xs font-bold text-blue-700">{stats.coveragePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${stats.coveragePercent}%` }} />
            </div>
          </div>
          {stats.excessMinutes < 0 ? (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">Não cabe no período</p>
                  <p className="text-xs text-red-700">Ajuste as horas por dia ou o período para acomodar todo o conteúdo.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-0.5">Cabe com folga</p>
                  <p className="text-xs text-green-700">Folga de <strong>{formatHours(stats.excessMinutes)}h</strong> ({stats.coveragePercent.toFixed(1)}% de cobertura)</p>
                </div>
              </div>
            </div>
          )}
          {stats.perSubjectStats.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Breakdown por Assunto</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">Assunto</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">Vídeos</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">Horas</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">Assistido</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.perSubjectStats.map((stat) => (
                      <tr key={stat.subject} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 font-medium text-gray-900">{stat.subject}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{stat.videoCount}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">
                          {stat.totalMinutes.toFixed(1)}h
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700">
                          {stat.watchedMinutes.toFixed(1)}h
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{stat.watchedPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
