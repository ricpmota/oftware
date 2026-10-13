'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PersonalPlanosTreinoService } from '@/services/personalPlanosTreinoService';
import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';
import type { PacienteCompleto } from '@/types/obesidade';
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
  formatPatientPublishReportLine,
  groupExistingSessions,
  groupExistingSessionsByDate,
  cardActiveSummary,
  withPlannerCardColors,
  withPlannerCardColorsByDate,
  type PlannerBoardCard,
} from '@/lib/metapersonal/treinosPlannerGroup';
import { monthVisibleRange } from '@/lib/metapersonal/treinosMonth';
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
import { suggestTreinoColorKey } from '@/lib/metapersonal/treinosPlannerTheme';
import {
  TREINOS_WEEKDAYS,
  type TreinosSelectedPatient,
  type TreinosWeekday,
} from './treinosCentral.types';
import { TreinosAddNoteModal } from './TreinosAddNoteModal';
import { TreinosEditWorkoutModal } from './TreinosEditWorkoutModal';
import { TreinosLifecycleModal } from './TreinosLifecycleModal';
import { TreinosAddWorkoutModal } from './TreinosAddWorkoutModal';
import { TreinosPatientsDrawer } from './TreinosPatientsDrawer';
import { TreinosTemplateEditorOverlay } from './TreinosTemplateEditorOverlay';
import { MetapersonalPacienteAnamneseModal } from './MetapersonalPacienteAnamneseModal';
import { MetapersonalPacienteHistoricoModal } from './MetapersonalPacienteHistoricoModal';
import { TreinosWeeklyBoard } from './TreinosWeeklyBoard';

type Props = {
  personalTrainerId: string;
  paciente: PacienteCompleto;
  vinculo?: PacienteVisivelPersonal | null;
  sidebarCollapsed?: boolean;
  /** Médico no metaadmin: vê o treino e o histórico, sem alterar. */
  readOnly?: boolean;
};

function toSelectedPatient(
  paciente: PacienteCompleto,
  vinculo?: PacienteVisivelPersonal | null
): TreinosSelectedPatient | null {
  const pacienteId = String(vinculo?.pacienteId || paciente.id || '').trim();
  if (!pacienteId) return null;
  if (vinculo && vinculo.pacienteId === pacienteId) {
    return { ...vinculo, paciente, pacienteId };
  }
  return {
    vinculoId: pacienteId,
    pacienteId,
    paciente,
    medicoId: vinculo?.medicoId || paciente.medicoResponsavelId || '',
    medicoNome: vinculo?.medicoNome || '',
    medicoGenero: vinculo?.medicoGenero,
    dataCompartilhamento: vinculo?.dataCompartilhamento || new Date(),
    status: vinculo?.status || 'ativo',
  };
}

export default function MetapersonalPacienteTreinoPanel({
  personalTrainerId,
  paciente,
  vinculo,
  sidebarCollapsed = false,
  readOnly = false,
}: Props) {
  const selectedPatient = useMemo(
    () => toSelectedPatient(paciente, vinculo),
    [paciente, vinculo]
  );
  const selectedPatients = useMemo(
    () => (selectedPatient ? [selectedPatient] : []),
    [selectedPatient]
  );
  const lockedPatientId = selectedPatient?.pacienteId;

  const [templates, setTemplates] = useState<PersonalWorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [addWorkoutWeekday, setAddWorkoutWeekday] = useState<TreinosWeekday | null>(null);
  const [pendingProgramTemplate, setPendingProgramTemplate] = useState<PersonalWorkoutTemplate | null>(null);
  const [publishingTemplate, setPublishingTemplate] = useState(false);
  const publishingTemplateRef = useRef(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<PersonalWorkoutTemplate | null>(null);
  const [editorAttachWeekday, setEditorAttachWeekday] = useState<TreinosWeekday | null>(null);
  const [existingRowsTick, setExistingRowsTick] = useState(0);
  const [existingCards, setExistingCards] = useState<PlannerBoardCard[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [drawerCard, setDrawerCard] = useState<PlannerBoardCard | null>(null);
  const [noteCard, setNoteCard] = useState<PlannerBoardCard | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [editCard, setEditCard] = useState<PlannerBoardCard | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [plannerViewMode, setPlannerViewMode] = useState<PlannerViewMode>('week');
  const [plannerReferenceDate, setPlannerReferenceDate] = useState(todayLocalYYYYMMDD);
  const [existingByDate, setExistingByDate] = useState<Record<string, PlannerBoardCard[]>>({});
  const [lifeCard, setLifeCard] = useState<PlannerBoardCard | null>(null);
  const [lifeMode, setLifeMode] = useState<'status' | 'delete'>('status');
  const [lifeDefaultAction, setLifeDefaultAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [savingLife, setSavingLife] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [anamneseOpen, setAnamneseOpen] = useState(false);

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
      next[weekday] = withPlannerCardColors(next[weekday], templates);
    }
    return next;
  }, [existingCards, templates]);

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
        lockedPatientId,
      });
      if (result.errors.length > 0 && result.savedCount === 0 && result.reports.length === 0) {
        alert(result.errors.join('\n'));
        return;
      }
      if (result.savedCount > 0) {
        setExistingRowsTick((tick) => tick + 1);
        setNoteCard(null);
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
        lockedPatientId,
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
        setEditCard(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
        }
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

  const openLifecycle = (card: PlannerBoardCard, mode: 'status' | 'delete') => {
    const summary = cardActiveSummary(card);
    setLifeDefaultAction(summary.state === 'all-inactive' ? 'activate' : 'deactivate');
    setLifeMode(mode);
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
        lockedPatientId,
        today: todayLocalYYYYMMDD(),
      });
      if (result.errors.length > 0 && result.savedCount === 0 && result.reports.length === 0) {
        alert(result.errors.join('\n'));
        return;
      }
      if (result.savedCount > 0) {
        setExistingRowsTick((tick) => tick + 1);
        setLifeCard(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
        }
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

  const handleTemplateSaved = (saved: PersonalWorkoutTemplate) => {
    void loadTemplates();
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
        setExistingRowsTick((tick) => tick + 1);
        setAddWorkoutWeekday(null);
        setPendingProgramTemplate(null);
      }
      if (result.reports.length > 0) {
        alert(result.reports.map(formatPatientPublishReportLine).join('\n\n'));
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

  if (!selectedPatient) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Não foi possível identificar este paciente para carregar o treino.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-gray-50">
      <div className="min-w-0 p-4">
        <TreinosWeeklyBoard
          heading="Treino"
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
          onAddClick={(weekday) => setAddWorkoutWeekday(weekday)}
          onRemoveDraft={() => {}}
          onVerPacientes={(card) => setDrawerCard(card)}
          onAddObservacao={(card) => setNoteCard(card)}
          onEditWorkout={(card) => setEditCard(card)}
          onToggleActive={(card) => openLifecycle(card, 'status')}
          onDeleteWorkout={(card) => openLifecycle(card, 'delete')}
          readOnly={readOnly}
          headerAction={
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoricoOpen(true)}
                className="h-9 shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Histórico
              </button>
              <button
                type="button"
                onClick={() => setAnamneseOpen(true)}
                className="h-9 shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Anamnese
              </button>
            </div>
          }
        />
      </div>

      {readOnly ? null : (
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
        onRequestPatients={() => {}}
        onConfirm={(input) => void handleProgramConfirm(input)}
      />
      )}

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
          readOnly || drawerCard?.source !== 'existing' ? undefined : () => setNoteCard(drawerCard)
        }
        onEditWorkout={
          readOnly || drawerCard?.source !== 'existing' ? undefined : () => setEditCard(drawerCard)
        }
        onToggleActive={
          readOnly || drawerCard?.source !== 'existing'
            ? undefined
            : () => openLifecycle(drawerCard, 'status')
        }
        onDeleteWorkout={
          readOnly || drawerCard?.source !== 'existing'
            ? undefined
            : () => openLifecycle(drawerCard, 'delete')
        }
      />

      {readOnly ? null : (
      <>
      <TreinosAddNoteModal
        open={Boolean(noteCard)}
        card={noteCard}
        lockedPatientId={lockedPatientId}
        saving={savingNote}
        onClose={() => {
          if (savingNote) return;
          setNoteCard(null);
        }}
        onSave={(input) => void handleSaveNote(input)}
      />

      <TreinosEditWorkoutModal
        open={Boolean(editCard)}
        card={editCard}
        lockedPatientId={lockedPatientId}
        saving={savingEdit}
        onClose={() => {
          if (savingEdit) return;
          setEditCard(null);
        }}
        onSave={(input) => void handleSaveEdit(input)}
        onGymMediaChanged={() => setExistingRowsTick((tick) => tick + 1)}
      />

      <TreinosLifecycleModal
        open={Boolean(lifeCard)}
        mode={lifeMode}
        card={lifeCard}
        lockedPatientId={lockedPatientId}
        defaultAction={lifeDefaultAction}
        saving={savingLife}
        onClose={() => {
          if (savingLife) return;
          setLifeCard(null);
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
      </>
      )}

      <MetapersonalPacienteHistoricoModal
        open={historicoOpen}
        paciente={paciente}
        onClose={() => setHistoricoOpen(false)}
      />
      <MetapersonalPacienteAnamneseModal
        open={anamneseOpen}
        paciente={paciente}
        onClose={() => setAnamneseOpen(false)}
      />
    </div>
  );
}
