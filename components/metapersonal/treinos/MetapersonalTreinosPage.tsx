'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PersonalPlanosTreinoService } from '@/services/personalPlanosTreinoService';
import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { applyWeeklyBoardToTrainingSessions } from '@/lib/metapersonal/applyWeeklyTrainingBoard';
import { publishTemplateSchedule } from '@/lib/metapersonal/publishTemplateSchedule';
import { coveredPatientsFromCard, formatBulkNoteReportLine } from '@/lib/metapersonal/bulkWorkoutNotes';
import { formatCombinedEditReportLine, type WorkoutScheduleConfig } from '@/lib/metapersonal/bulkWorkoutSchedule';
import type { BulkWorkoutEditPatch } from '@/lib/metapersonal/bulkWorkoutEdit';
import { formatLifecycleReportLine } from '@/lib/metapersonal/bulkWorkoutLifecycle';
import { saveBulkWorkoutNotes } from '@/services/bulkWorkoutNotesService';
import { saveBulkWorkoutAndSchedule } from '@/services/bulkWorkoutScheduleService';
import { saveBulkWorkoutLifecycle } from '@/services/bulkWorkoutLifecycleService';
import { todayLocalYYYYMMDD } from '@/lib/personal/trainingRecurrence';
import { loadExistingPlannerRows } from '@/lib/metapersonal/treinosExistingSessions';
import {
  draftCardsToPlanner,
  formatPatientPublishReportLine,
  groupExistingSessions,
  groupExistingSessionsByDate,
  cardActiveSummary,
  withPlannerCardColors,
  withPlannerCardColorsByDate,
  type PlannerBoardCard,
} from '@/lib/metapersonal/treinosPlannerGroup';
import { monthVisibleRange } from '@/lib/metapersonal/treinosMonth';
import { countPacientesComTreinoAtivo } from '@/lib/metapersonal/treinosCoverage';
import {
  goToToday,
  monthFromDate,
  openWeekAtDate,
  resolvePlannerCardDate,
  setPlannerViewMode as nextPlannerViewMode,
  shiftPlannerNav,
  weekRangeFromReferenceDate,
  type PlannerViewMode,
} from '@/lib/metapersonal/treinosPlannerNav';
import { formatWeekRangeLabel } from '@/lib/metapersonal/treinosWeek';
import { notifyPacienteTreinoPersonalClient } from '@/lib/personal/notifyPacienteTreinoPersonalClient';
import {
  TREINOS_WEEKDAYS,
  createEmptyWeeklyBoard,
  type TreinosSelectedPatient,
  type TreinosWeekday,
  type TreinosWeeklyBoard as WeeklyBoard,
} from './treinosCentral.types';
import { suggestTreinoColorKey } from '@/lib/metapersonal/treinosPlannerTheme';
import { TreinosAddNoteModal } from './TreinosAddNoteModal';
import { TreinosEditWorkoutModal } from './TreinosEditWorkoutModal';
import { TreinosLifecycleModal } from './TreinosLifecycleModal';
import { TreinosAddPacientesModal } from './TreinosAddPacientesModal';
import { TreinosAddWorkoutModal } from './TreinosAddWorkoutModal';
import { TreinosApplyPlanModal } from './TreinosApplyPlanModal';
import { TreinosKpiRow } from './TreinosKpiRow';
import { TreinosPacientesColumn } from './TreinosPacientesColumn';
import { TreinosPatientsDrawer } from './TreinosPatientsDrawer';
import { TreinosSalvosCarousel } from './TreinosSalvosCarousel';
import { TreinosTemplateEditorOverlay } from './TreinosTemplateEditorOverlay';
import { TreinosWeeklyBoard } from './TreinosWeeklyBoard';

type Props = {
  personalTrainerId: string;
  pacientesVisiveis: PacienteVisivelPersonal[];
  loadingPacientes: boolean;
  medicosVinculadosCount: number;
  patientPhotoByUserId?: Record<string, string | null>;
  sidebarCollapsed?: boolean;
};

export default function MetapersonalTreinosPage({
  personalTrainerId,
  pacientesVisiveis,
  loadingPacientes,
  medicosVinculadosCount,
  patientPhotoByUserId = {},
  sidebarCollapsed = false,
}: Props) {
  const [templates, setTemplates] = useState<PersonalWorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<TreinosSelectedPatient[]>([]);
  const [board, setBoard] = useState<WeeklyBoard>(() => createEmptyWeeklyBoard());
  const [addPacientesOpen, setAddPacientesOpen] = useState(false);
  const [addWorkoutWeekday, setAddWorkoutWeekday] = useState<TreinosWeekday | null>(null);
  const [pendingProgramTemplate, setPendingProgramTemplate] = useState<PersonalWorkoutTemplate | null>(null);
  const [publishingTemplate, setPublishingTemplate] = useState(false);
  const publishingTemplateRef = useRef(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<PersonalWorkoutTemplate | null>(null);
  const [editorAttachWeekday, setEditorAttachWeekday] = useState<TreinosWeekday | null>(null);
  const [photoByUserId, setPhotoByUserId] = useState<Record<string, string | null>>(patientPhotoByUserId);
  const [comTreino, setComTreino] = useState(0);
  const [semTreino, setSemTreino] = useState(0);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [coverageTick, setCoverageTick] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number } | null>(null);
  const [existingRowsTick, setExistingRowsTick] = useState(0);
  const [existingCards, setExistingCards] = useState<PlannerBoardCard[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [drawerCard, setDrawerCard] = useState<PlannerBoardCard | null>(null);
  const [noteCard, setNoteCard] = useState<PlannerBoardCard | null>(null);
  const [noteLockedPatientId, setNoteLockedPatientId] = useState<string | undefined>(undefined);
  const [savingNote, setSavingNote] = useState(false);
  const [editCard, setEditCard] = useState<PlannerBoardCard | null>(null);
  const [editLockedPatientId, setEditLockedPatientId] = useState<string | undefined>(undefined);
  const [savingEdit, setSavingEdit] = useState(false);
  const [plannerViewMode, setPlannerViewMode] = useState<PlannerViewMode>('week');
  const [plannerReferenceDate, setPlannerReferenceDate] = useState(todayLocalYYYYMMDD);
  const [existingByDate, setExistingByDate] = useState<Record<string, PlannerBoardCard[]>>({});
  const [lifeCard, setLifeCard] = useState<PlannerBoardCard | null>(null);
  const [lifeLockedPatientId, setLifeLockedPatientId] = useState<string | undefined>(undefined);
  const [lifeMode, setLifeMode] = useState<'status' | 'delete'>('status');
  const [lifeDefaultAction, setLifeDefaultAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [savingLife, setSavingLife] = useState(false);

  const pacientesAtivos = useMemo(
    () => pacientesVisiveis.filter((item) => item.status === 'ativo'),
    [pacientesVisiveis]
  );

  const loadTemplates = useCallback(async () => {
    if (!personalTrainerId) return;
    setLoadingTemplates(true);
    try {
      const lista = await PersonalPlanosTreinoService.listar(personalTrainerId);
      setTemplates(lista);
    } catch (error) {
      console.error('Erro ao carregar biblioteca de treinos:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [personalTrainerId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    setPhotoByUserId((prev) => ({ ...prev, ...patientPhotoByUserId }));
  }, [patientPhotoByUserId]);

  useEffect(() => {
    if (loadingPacientes) return;
    const visiveis = new Set(pacientesAtivos.map((item) => item.pacienteId));
    setSelectedPatients((prev) => prev.filter((item) => visiveis.has(item.pacienteId)));
  }, [loadingPacientes, pacientesAtivos]);

  useEffect(() => {
    const signal = { cancelled: false };
    if (loadingPacientes) return;
    setLoadingCoverage(true);
    void (async () => {
      const result = await countPacientesComTreinoAtivo(pacientesAtivos, { signal });
      if (signal.cancelled) return;
      setComTreino(result.comTreino);
      setSemTreino(result.semTreino);
      setLoadingCoverage(false);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [loadingPacientes, pacientesAtivos, coverageTick]);

  useEffect(() => {
    const source = addPacientesOpen ? pacientesAtivos : selectedPatients;
    const userIds = source
      .map((item) => item.paciente.userId)
      .filter((id): id is string => isValidFirebaseAuthUid(id));
    const missing = Array.from(new Set(userIds)).filter(
      (id) => !Object.prototype.hasOwnProperty.call(photoByUserId, id)
    );
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/user-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: missing }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { photos?: Record<string, string | null> };
        if (cancelled || !data.photos) return;
        setPhotoByUserId((prev) => {
          const next = { ...prev };
          for (const id of missing) next[id] = data.photos?.[id] ?? null;
          return next;
        });
      } catch {
        if (cancelled) return;
        setPhotoByUserId((prev) => {
          const next = { ...prev };
          for (const id of missing) {
            if (!Object.prototype.hasOwnProperty.call(next, id)) next[id] = null;
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addPacientesOpen, pacientesAtivos, photoByUserId, selectedPatients]);

  const weekRange = useMemo(
    () => weekRangeFromReferenceDate(plannerReferenceDate),
    [plannerReferenceDate]
  );
  const weekLabel = formatWeekRangeLabel(weekRange.startDate, weekRange.endDate);
  const monthKey = useMemo(() => monthFromDate(plannerReferenceDate), [plannerReferenceDate]);
  const monthRange = useMemo(() => monthVisibleRange(monthKey), [monthKey]);
  const todayDate = todayLocalYYYYMMDD();
  const drawerDate = drawerCard
    ? resolvePlannerCardDate(drawerCard, weekRange.datesByWeekday)
    : undefined;

  const coloredExistingByDate = useMemo(
    () => withPlannerCardColorsByDate(existingByDate, templates),
    [existingByDate, templates]
  );

  const applyNav = (next: { plannerViewMode: PlannerViewMode; plannerReferenceDate: string }) => {
    setPlannerViewMode(next.plannerViewMode);
    setPlannerReferenceDate(next.plannerReferenceDate);
  };

  const openWeekFromDate = (date: string) => {
    applyNav(openWeekAtDate({ plannerViewMode, plannerReferenceDate }, date));
  };
  const queryRange =
    plannerViewMode === 'month'
      ? { startDate: monthRange.startDate, endDate: monthRange.endDate }
      : { startDate: weekRange.startDate, endDate: weekRange.endDate };

  useEffect(() => {
    const signal = { cancelled: false };
    if (selectedPatients.length === 0) {
      setExistingCards([]);
      setExistingByDate({});
      setLoadingExisting(false);
      return;
    }
    setLoadingExisting(true);
    void (async () => {
      const rows = await loadExistingPlannerRows({
        patients: selectedPatients,
        startDate: queryRange.startDate,
        endDate: queryRange.endDate,
        signal,
      });
      if (signal.cancelled) return;
      if (plannerViewMode === 'month') {
        const byDate = groupExistingSessionsByDate(rows, selectedPatients.length);
        setExistingByDate(byDate);
        setExistingCards(Object.values(byDate).flat());
      } else {
        setExistingByDate({});
        setExistingCards(groupExistingSessions(rows, selectedPatients.length));
      }
      setLoadingExisting(false);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [
    selectedPatients,
    queryRange.startDate,
    queryRange.endDate,
    plannerViewMode,
    existingRowsTick,
  ]);

  const cardsByWeekday = useMemo(() => {
    const next = Object.fromEntries(TREINOS_WEEKDAYS.map((day) => [day, [] as PlannerBoardCard[]])) as Record<
      TreinosWeekday,
      PlannerBoardCard[]
    >;
    for (const card of existingCards) {
      if (card.date) continue;
      next[card.weekday].push(card);
    }
    for (const weekday of TREINOS_WEEKDAYS) {
      next[weekday] = withPlannerCardColors(
        [
          ...next[weekday],
          ...draftCardsToPlanner(weekday, board[weekday], selectedPatients.length),
        ],
        templates
      );
    }
    return next;
  }, [board, existingCards, selectedPatients.length, templates]);

  const refreshExistingCard = (prev: PlannerBoardCard | null) => {
    if (!prev || prev.source !== 'existing') return prev;
    return (
      existingCards.find((item) => item.id === prev.id) ||
      existingCards.find(
        (item) => item.weekday === prev.weekday && item.visualSignature === prev.visualSignature
      ) ||
      prev
    );
  };

  useEffect(() => {
    setDrawerCard((prev) => refreshExistingCard(prev));
    setNoteCard((prev) => refreshExistingCard(prev));
    setEditCard((prev) => refreshExistingCard(prev));
    setLifeCard((prev) => refreshExistingCard(prev));
  }, [existingCards]);

  const cardCount = useMemo(
    () => TREINOS_WEEKDAYS.reduce((sum, day) => sum + board[day].length, 0),
    [board]
  );
  const canApply = selectedPatients.length > 0 && cardCount > 0;
  const applyDisabledReason = !selectedPatients.length
    ? 'Selecione pelo menos um paciente.'
    : cardCount === 0
      ? 'Adicione pelo menos um treino no quadro semanal.'
      : undefined;

  const handleApplyConfirm = async (input: { startDate: string; weeksCount: number }) => {
    if (applying) return;
    setApplying(true);
    setApplyProgress({ done: 0, total: 0 });
    try {
      const result = await applyWeeklyBoardToTrainingSessions(
        {
          patients: selectedPatients,
          board,
          startDate: input.startDate,
          weeksCount: input.weeksCount,
          createdById: personalTrainerId,
        },
        {
          onProgress: (done, total) => setApplyProgress({ done, total }),
          onPatientPublished: (pacienteDocId) => {
            notifyPacienteTreinoPersonalClient(pacienteDocId);
          },
        }
      );
      if (result.sessionCount > 0) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
        }
        setCoverageTick((tick) => tick + 1);
        setExistingRowsTick((tick) => tick + 1);
      }
      if (result.reports.length > 0) {
        const summary = result.reports.map(formatPatientPublishReportLine).join('\n\n');
        if (!result.ok) {
          alert(summary);
          if (result.sessionCount > 0) setApplyOpen(false);
          return;
        }
        setApplyOpen(false);
        alert(summary);
        return;
      }
      if (!result.ok) {
        alert(result.errors.join('\n') || 'Não foi possível aplicar o planejamento.');
        return;
      }
      setApplyOpen(false);
      alert(
        `Planejamento aplicado. ${result.sessionCount} ${
          result.sessionCount === 1 ? 'sessão criada' : 'sessões criadas'
        } para ${selectedPatients.length} ${
          selectedPatients.length === 1 ? 'paciente' : 'pacientes'
        }.`
      );
    } catch (error) {
      console.error('Erro ao aplicar planejamento:', error);
      alert('Erro ao aplicar o planejamento. Tente novamente.');
    } finally {
      setApplying(false);
      setApplyProgress(null);
    }
  };

  const handleSaveNote = async (input: {
    target: 'session' | 'exercise';
    text: string;
    conflict: 'skip-filled' | 'replace' | 'append';
    patientIds: string[];
    exerciseKey?: { exerciseId: string; order?: number; name?: string };
  }) => {
    if (!noteCard || savingNote) return;
    setSavingNote(true);
    try {
      const result = await saveBulkWorkoutNotes({
        source: noteCard.source,
        target: input.target,
        text: input.text,
        conflict: input.conflict,
        availablePatients: coveredPatientsFromCard(noteCard),
        patientIds: input.patientIds,
        exerciseKey: input.exerciseKey,
        lockedPatientId: noteLockedPatientId,
      });
      if (result.errors.length > 0 && result.savedCount === 0 && result.reports.length === 0) {
        alert(result.errors.join('\n'));
        return;
      }
      if (result.savedCount > 0) {
        setExistingRowsTick((tick) => tick + 1);
        setNoteCard(null);
        setNoteLockedPatientId(undefined);
      }
      alert(
        result.reports.map(formatBulkNoteReportLine).join('\n') ||
          result.errors.join('\n') ||
          'Observação salva.'
      );
    } catch (error) {
      console.error('Erro ao salvar observação:', error);
      alert('Erro ao salvar a observação. Tente novamente.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveEdit = async (input: {
    patientIds: string[];
    temporalScope: 'this' | 'this-and-future';
    patch: BulkWorkoutEditPatch;
    scheduleDirty: boolean;
    schedule: WorkoutScheduleConfig | null;
  }) => {
    if (!editCard || savingEdit) return;
    setSavingEdit(true);
    try {
      const result = await saveBulkWorkoutAndSchedule({
        source: editCard.source,
        availablePatients: coveredPatientsFromCard(editCard),
        patientIds: input.patientIds,
        lockedPatientId: editLockedPatientId,
        temporalScope: input.temporalScope,
        patch: input.patch,
        today: todayLocalYYYYMMDD(),
        allowEmptyPatch: true,
        scheduleDirty: input.scheduleDirty,
        schedule: input.schedule,
      });
      if (result.errors.length > 0 && result.savedCount === 0 && result.reports.length === 0) {
        alert(result.errors.join('\n'));
        return;
      }
      if (result.savedCount > 0) {
        setExistingRowsTick((tick) => tick + 1);
        setCoverageTick((tick) => tick + 1);
        setEditCard(null);
        setEditLockedPatientId(undefined);
      }
      alert(
        result.reports.map(formatCombinedEditReportLine).join('\n') ||
          result.errors.join('\n') ||
          'Alterações aplicadas.'
      );
    } catch (error) {
      console.error('Erro ao editar treino:', error);
      alert('Erro ao aplicar as alterações. Tente novamente.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openLifecycle = (
    card: PlannerBoardCard,
    mode: 'status' | 'delete',
    lockedPatientId?: string
  ) => {
    const summary = cardActiveSummary(card);
    setLifeDefaultAction(summary.state === 'all-inactive' ? 'activate' : 'deactivate');
    setLifeMode(mode);
    setLifeLockedPatientId(lockedPatientId);
    setLifeCard(card);
  };

  const handleSaveLifecycle = async (input: {
    action: 'activate' | 'deactivate' | 'delete';
    temporalScope: 'this' | 'this-and-future' | 'series-future';
    patientIds: string[];
  }) => {
    if (!lifeCard || savingLife) return;
    setSavingLife(true);
    try {
      const result = await saveBulkWorkoutLifecycle({
        source: lifeCard.source,
        action: input.action,
        temporalScope: input.temporalScope,
        availablePatients: coveredPatientsFromCard(lifeCard),
        patientIds: input.patientIds,
        lockedPatientId: lifeLockedPatientId,
        today: todayLocalYYYYMMDD(),
      });
      if (result.errors.length > 0 && result.savedCount === 0 && result.reports.length === 0) {
        alert(result.errors.join('\n'));
        return;
      }
      if (result.savedCount > 0) {
        setExistingRowsTick((tick) => tick + 1);
        setCoverageTick((tick) => tick + 1);
        setLifeCard(null);
        setLifeLockedPatientId(undefined);
      }
      alert(
        result.reports.map(formatLifecycleReportLine).join('\n') ||
          result.errors.join('\n') ||
          'Pronto.'
      );
    } catch (error) {
      console.error('Erro ao alterar treino:', error);
      alert('Erro ao aplicar a ação. Tente novamente.');
    } finally {
      setSavingLife(false);
    }
  };

  const handleConfirmPacientes = (pacienteIds: string[]) => {
    const map = new Map(pacientesAtivos.map((item) => [item.pacienteId, item]));
    setSelectedPatients(
      pacienteIds.map((id) => map.get(id)).filter((item): item is TreinosSelectedPatient => Boolean(item))
    );
    setAddPacientesOpen(false);
  };

  const handleTemplateSaved = (saved: PersonalWorkoutTemplate) => {
    void loadTemplates();
    if (saved.id) setSelectedTemplateId(saved.id);
    const weekday = editorAttachWeekday;
    setEditorAttachWeekday(null);
    setEditorTemplate(null);
    setEditorOpen(false);
    if (weekday && saved.id) {
      setPendingProgramTemplate(saved);
      setAddWorkoutWeekday(weekday);
      return;
    }
    setPendingProgramTemplate(null);
  };

  const closeAddWorkout = () => {
    if (publishingTemplate) return;
    setAddWorkoutWeekday(null);
    setPendingProgramTemplate(null);
  };

  const handleProgramConfirm = async (input: {
    template: PersonalWorkoutTemplate;
    patients: TreinosSelectedPatient[];
    schedule: WorkoutScheduleConfig;
  }) => {
    if (publishingTemplateRef.current) return;
    publishingTemplateRef.current = true;
    setPublishingTemplate(true);
    try {
      const result = await publishTemplateSchedule(
        {
          patients: input.patients,
          template: input.template,
          schedule: input.schedule,
          createdById: personalTrainerId,
        },
        {
          onPatientPublished: (pacienteDocId) => {
            notifyPacienteTreinoPersonalClient(pacienteDocId);
          },
        }
      );
      if (result.sessionCount > 0) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
        }
        setCoverageTick((tick) => tick + 1);
        setExistingRowsTick((tick) => tick + 1);
        setAddWorkoutWeekday(null);
        setPendingProgramTemplate(null);
      }
      if (result.reports.length > 0) {
        const summary = result.reports.map(formatPatientPublishReportLine).join('\n\n');
        alert(summary);
        return;
      }
      alert(result.errors.join('\n') || 'Não foi possível programar o treino.');
    } catch (error) {
      console.error('Erro ao programar treino:', error);
      alert('Erro ao programar o treino. Tente novamente.');
    } finally {
      publishingTemplateRef.current = false;
      setPublishingTemplate(false);
    }
  };

  return (
    <div className="min-w-0 w-full space-y-4 md:-mx-1 xl:-mx-2 2xl:-mx-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Central de Treinos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Planeje e distribua treinos para vários pacientes em um só lugar.
        </p>
      </header>

      <TreinosKpiRow
        totalPacientes={pacientesAtivos.length}
        comTreino={comTreino}
        semTreino={semTreino}
        medicos={medicosVinculadosCount}
        loadingCoverage={loadingCoverage || loadingPacientes}
      />

      <TreinosSalvosCarousel
        templates={templates}
        loading={loadingTemplates}
        selectedTemplateId={selectedTemplateId}
        onSelect={(template) => setSelectedTemplateId(template.id || null)}
        onNovoTreino={() => {
          setEditorAttachWeekday(null);
          setEditorTemplate(null);
          setEditorOpen(true);
        }}
        onEdit={(template) => {
          setEditorAttachWeekday(null);
          setEditorTemplate(template);
          setEditorOpen(true);
        }}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,240px)_minmax(0,1fr)]">
        <TreinosPacientesColumn
          selectedPatients={selectedPatients}
          photoByUserId={photoByUserId}
          onAddClick={() => setAddPacientesOpen(true)}
          onRemove={(pacienteId) =>
            setSelectedPatients((prev) => prev.filter((item) => item.pacienteId !== pacienteId))
          }
        />
        <TreinosWeeklyBoard
          cardsByWeekday={cardsByWeekday}
          weekLabel={weekLabel}
          loadingExisting={loadingExisting}
          plannerViewMode={plannerViewMode}
          onPlannerViewModeChange={(mode) =>
            applyNav(nextPlannerViewMode({ plannerViewMode, plannerReferenceDate }, mode))
          }
          monthLabel={monthRange.label}
          monthDays={monthRange.days}
          cardsByDate={coloredExistingByDate}
          todayDate={todayDate}
          weekDatesByWeekday={weekRange.datesByWeekday}
          onOpenWeek={openWeekFromDate}
          onToday={() => applyNav(goToToday({ plannerViewMode, plannerReferenceDate }, todayDate))}
          onPrev={() => applyNav(shiftPlannerNav({ plannerViewMode, plannerReferenceDate }, -1))}
          onNext={() => applyNav(shiftPlannerNav({ plannerViewMode, plannerReferenceDate }, 1))}
          canApply={canApply}
          applyDisabledReason={applyDisabledReason}
          onApplyClick={() => setApplyOpen(true)}
          onAddClick={(weekday) => setAddWorkoutWeekday(weekday)}
          onRemoveDraft={(weekday, localId) =>
            setBoard((prev) => ({
              ...prev,
              [weekday]: prev[weekday].filter((item) => item.localId !== localId),
            }))
          }
          onVerPacientes={(card) => setDrawerCard(card)}
          onAddObservacao={(card) => {
            setNoteLockedPatientId(undefined);
            setNoteCard(card);
          }}
          onEditWorkout={(card) => {
            setEditLockedPatientId(undefined);
            setEditCard(card);
          }}
          onToggleActive={(card) => openLifecycle(card, 'status')}
          onDeleteWorkout={(card) => openLifecycle(card, 'delete')}
        />
      </div>

      <TreinosAddPacientesModal
        open={addPacientesOpen}
        pacientes={pacientesAtivos}
        selectedIds={selectedPatients.map((item) => item.pacienteId)}
        photoByUserId={photoByUserId}
        elevated={Boolean(addWorkoutWeekday)}
        onClose={() => setAddPacientesOpen(false)}
        onConfirm={handleConfirmPacientes}
      />

      <TreinosAddWorkoutModal
        open={Boolean(addWorkoutWeekday)}
        weekday={addWorkoutWeekday}
        weekdayDate={addWorkoutWeekday ? weekRange.datesByWeekday[addWorkoutWeekday] : undefined}
        templates={templates}
        loading={loadingTemplates}
        patients={selectedPatients}
        createdById={personalTrainerId}
        saving={publishingTemplate}
        initialTemplate={pendingProgramTemplate}
        existingProgramDates={existingCards.flatMap((card) =>
          card.patients.map((patient) => ({
            pacienteId: patient.pacienteId,
            title: card.title,
            scheduledDate: patient.scheduledDate || card.date || '',
          }))
        )}
        onClose={closeAddWorkout}
        onCreateNew={() => {
          setEditorAttachWeekday(addWorkoutWeekday);
          setEditorOpen(true);
        }}
        onRequestPatients={() => setAddPacientesOpen(true)}
        onConfirm={(input) => void handleProgramConfirm(input)}
      />

      <TreinosApplyPlanModal
        open={applyOpen}
        patients={selectedPatients}
        board={board}
        createdById={personalTrainerId}
        applying={applying}
        progress={applyProgress}
        onClose={() => {
          if (!applying) setApplyOpen(false);
        }}
        onConfirm={(input) => void handleApplyConfirm(input)}
      />

      <TreinosPatientsDrawer
        open={Boolean(drawerCard)}
        card={drawerCard}
        selectedPatients={selectedPatients}
        dateLabel={drawerDate}
        onOpenInWeek={
          drawerDate
            ? () => {
                setDrawerCard(null);
                openWeekFromDate(drawerDate);
              }
            : undefined
        }
        onClose={() => setDrawerCard(null)}
        onAddObservacao={
          drawerCard?.source === 'existing'
            ? (pacienteId) => {
                setNoteLockedPatientId(pacienteId);
                setNoteCard(drawerCard);
              }
            : undefined
        }
        onEditWorkout={
          drawerCard?.source === 'existing'
            ? (pacienteId) => {
                setEditLockedPatientId(pacienteId);
                setEditCard(drawerCard);
              }
            : undefined
        }
        onToggleActive={
          drawerCard?.source === 'existing'
            ? (pacienteId) => openLifecycle(drawerCard, 'status', pacienteId)
            : undefined
        }
        onDeleteWorkout={
          drawerCard?.source === 'existing'
            ? (pacienteId) => openLifecycle(drawerCard, 'delete', pacienteId)
            : undefined
        }
      />

      <TreinosAddNoteModal
        open={Boolean(noteCard)}
        card={noteCard}
        lockedPatientId={noteLockedPatientId}
        saving={savingNote}
        onClose={() => {
          if (savingNote) return;
          setNoteCard(null);
          setNoteLockedPatientId(undefined);
        }}
        onSave={(input) => void handleSaveNote(input)}
      />

      <TreinosEditWorkoutModal
        open={Boolean(editCard)}
        card={editCard}
        lockedPatientId={editLockedPatientId}
        saving={savingEdit}
        onClose={() => {
          if (savingEdit) return;
          setEditCard(null);
          setEditLockedPatientId(undefined);
        }}
        onSave={(input) => void handleSaveEdit(input)}
        onGymMediaChanged={() => setExistingRowsTick((tick) => tick + 1)}
      />

      <TreinosLifecycleModal
        open={Boolean(lifeCard)}
        mode={lifeMode}
        card={lifeCard}
        lockedPatientId={lifeLockedPatientId}
        defaultAction={lifeDefaultAction}
        saving={savingLife}
        onClose={() => {
          if (savingLife) return;
          setLifeCard(null);
          setLifeLockedPatientId(undefined);
        }}
        onConfirm={(input) => void handleSaveLifecycle(input)}
      />

      <TreinosTemplateEditorOverlay
        open={editorOpen}
        uid={personalTrainerId}
        initial={editorTemplate}
        defaultCor={suggestTreinoColorKey(templates.map((item) => item.cor))}
        sidebarCollapsed={sidebarCollapsed}
        onClose={() => {
          setEditorOpen(false);
          setEditorTemplate(null);
          setEditorAttachWeekday(null);
        }}
        onSaved={handleTemplateSaved}
      />
    </div>
  );
}
