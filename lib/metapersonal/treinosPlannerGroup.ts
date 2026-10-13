/**
 * ViewModel e agrupamento VISUAL do planner.
 * Não persiste assinatura. Não afirma identidade de template.
 */

import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import { normalizeTreinoColorKey } from '@/lib/metapersonal/treinosPlannerTheme';
import type { TrainingSession, TrainingSessionExercise, TrainingExercisePrescription } from '@/types/trainingSession';
import type { TreinosPlannedWorkout, TreinosWeekday } from '@/components/metapersonal/treinos/treinosCentral.types';

export type PlannerWorkoutSource = 'existing' | 'draft';

export type PlannerPatientNote = {
  scope: 'session-patient' | 'session-trainer' | 'exercise';
  label: string;
  text: string;
};

export type PlannerCardExercise = {
  id?: string;
  exerciseId: string;
  name: string;
  order: number;
  trainerNote?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  prescription?: TrainingExercisePrescription;
};

export type PlannerCardPatient = {
  pacienteId: string;
  patientUserId: string;
  name: string;
  sessionId?: string;
  scheduledDate?: string;
  status?: TrainingSession['status'];
  recurrenceGroupId?: string;
  active?: boolean;
  createdBy?: TrainingSession['createdBy'];
  sessionTrainerNotes?: string;
  patientNotes?: string;
  exercises: PlannerCardExercise[];
  notes: PlannerPatientNote[];
  gymMedia: ExerciseGymMedia[];
  exerciseCount: number;
};

export type PlannerBoardCard = {
  id: string;
  weekday: TreinosWeekday;
  source: PlannerWorkoutSource;
  title: string;
  subtitle: string;
  exerciseCount: number;
  selectedPatientCount: number;
  coveredPatientCount: number;
  notesPatientCount: number;
  mediaFileCount: number;
  patients: PlannerCardPatient[];
  visualSignature: string;
  colorKey?: string;
  draftLocalId?: string;
  template?: PersonalWorkoutTemplate;
  date?: string;
};

export function normalizePlannerTitle(title: string): string {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function prescriptionBaseFingerprint(prescription?: TrainingExercisePrescription | null): string {
  const series = [...(prescription?.series || [])]
    .sort((a, b) => a.order - b.order)
    .map((item) => String(item.reps ?? ''))
    .join(',');
  const intercalations = [...(prescription?.intercalations || [])]
    .sort((a, b) => a.slotOrder - b.slotOrder)
    .map((item) => `${String(item.exerciseId || '').trim()}:${item.series?.reps ?? ''}`)
    .join(',');
  return `${series}~${intercalations}`;
}

/**
 * Assinatura só para consolidar a coluna.
 * Inclui: título normalizado, exerciseIds em ordem, reps por série, intercalações.
 * Ignora: series.id, loadKg, restSec, trainerNote, gifUrl, timestamps, createdById.
 */
export function visualWorkoutSignature(
  title: string,
  exercises: Array<{
    exerciseId?: string;
    order?: number;
    prescription?: TrainingExercisePrescription | null;
  }>
): string {
  const rows = [...exercises]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((exercise) => {
      const exerciseId = String(exercise.exerciseId || '').trim();
      return `${exerciseId}:${prescriptionBaseFingerprint(exercise.prescription)}`;
    });
  return `${normalizePlannerTitle(title)}::${rows.join('>')}`;
}

export function collectPatientNotes(input: {
  patientNotes?: string;
  trainerNotes?: string;
  exercises?: Array<{ name?: string; trainerNote?: string }>;
}): PlannerPatientNote[] {
  const notes: PlannerPatientNote[] = [];
  const sessionTrainer = String(input.trainerNotes || '').trim();
  if (sessionTrainer) {
    notes.push({
      scope: 'session-trainer',
      label: 'Nota do personal na sessão',
      text: sessionTrainer,
    });
  }
  const patientNotes = String(input.patientNotes || '').trim();
  if (patientNotes) {
    notes.push({
      scope: 'session-patient',
      label: 'Como foi o treino (paciente)',
      text: patientNotes,
    });
  }
  for (const exercise of input.exercises || []) {
    const text = String(exercise.trainerNote || '').trim();
    if (!text) continue;
    notes.push({
      scope: 'exercise',
      label: exercise.name?.trim() || 'Exercício',
      text,
    });
  }
  return notes;
}

export function coverageLabel(card: PlannerBoardCard): string {
  if (card.source === 'draft') return 'Não publicado';
  if (card.selectedPatientCount <= 1) return 'Programado';
  if (card.coveredPatientCount >= card.selectedPatientCount) return 'Todos';
  return `${card.coveredPatientCount} de ${card.selectedPatientCount} pacientes`;
}

export function draftCardsToPlanner(
  weekday: TreinosWeekday,
  drafts: TreinosPlannedWorkout[],
  selectedPatientCount: number
): PlannerBoardCard[] {
  return drafts.map((item) => {
    const exercises = item.template.exercicios || [];
    const subtitle = item.template.descricao?.trim()
      ? `${item.template.descricao.trim()} · ${exercises.length} exercício${exercises.length === 1 ? '' : 's'}`
      : `${exercises.length} exercício${exercises.length === 1 ? '' : 's'}`;
    const colorKey = normalizeTreinoColorKey(item.template.cor);
    return {
      id: `draft:${item.localId}`,
      weekday,
      source: 'draft' as const,
      title: item.template.nome,
      subtitle,
      exerciseCount: exercises.length,
      selectedPatientCount,
      coveredPatientCount: 0,
      notesPatientCount: 0,
      mediaFileCount: 0,
      patients: [],
      visualSignature: visualWorkoutSignature(item.template.nome, exercises),
      ...(colorKey ? { colorKey } : {}),
      draftLocalId: item.localId,
      template: item.template,
    };
  });
}

export type ExistingSessionRow = {
  pacienteId: string;
  patientUserId: string;
  name: string;
  weekday: TreinosWeekday;
  session: TrainingSession;
  exercises: TrainingSessionExercise[];
  gymMedia: ExerciseGymMedia[];
};

function patientFromRow(row: ExistingSessionRow): PlannerCardPatient {
  const exercises: PlannerCardExercise[] = [...(row.exercises || [])]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((exercise) => ({
      id: exercise.id,
      exerciseId: String(exercise.exerciseId || '').trim(),
      name: exercise.name || 'Exercício',
      order: exercise.order || 0,
      trainerNote: exercise.trainerNote,
      bodyPart: exercise.bodyPart,
      target: exercise.target,
      equipment: exercise.equipment,
      gifUrl: exercise.gifUrl,
      prescription: exercise.prescription,
    }));
  const notes = collectPatientNotes({
    patientNotes: row.session.patientNotes,
    trainerNotes: row.session.trainerNotes,
    exercises: row.exercises,
  });
  return {
    pacienteId: row.pacienteId,
    patientUserId: row.patientUserId,
    name: row.name,
    sessionId: row.session.id,
    scheduledDate: row.session.scheduledDate,
    status: row.session.status,
    recurrenceGroupId: row.session.recurrenceGroupId,
    active: isTrainingSessionActive(row.session),
    createdBy: row.session.createdBy,
    sessionTrainerNotes: row.session.trainerNotes,
    patientNotes: row.session.patientNotes,
    exercises,
    notes,
    gymMedia: row.gymMedia,
    exerciseCount: row.exercises.length,
  };
}

function cardsFromBuckets(
  buckets: Map<string, ExistingSessionRow[]>,
  selectedPatientCount: number,
  idPrefix: 'weekday' | 'date'
): PlannerBoardCard[] {
  const cards: PlannerBoardCard[] = [];
  for (const [key, list] of buckets) {
    const first = list[0];
    const signature = key.slice(key.indexOf('::') + 2);
    const byPaciente = new Map<string, ExistingSessionRow>();
    for (const row of list) {
      if (!byPaciente.has(row.pacienteId)) byPaciente.set(row.pacienteId, row);
    }
    const patients = Array.from(byPaciente.values()).map(patientFromRow);
    const notesPatientCount = patients.filter((item) => item.notes.length > 0).length;
    const mediaFileCount = patients.reduce((sum, item) => sum + item.gymMedia.length, 0);
    const title = first.session.title?.trim() || 'Treino';
    const exerciseCount = first.exercises.length;
    const date = first.session.scheduledDate;
    cards.push({
      id:
        idPrefix === 'date'
          ? `existing:${date}:${signature}`
          : `existing:${first.weekday}:${signature}`,
      weekday: first.weekday,
      source: 'existing',
      title,
      subtitle: `${exerciseCount} exercício${exerciseCount === 1 ? '' : 's'}`,
      exerciseCount,
      selectedPatientCount,
      coveredPatientCount: patients.length,
      notesPatientCount,
      mediaFileCount,
      patients,
      visualSignature: signature,
      ...(idPrefix === 'date' ? { date } : {}),
    });
  }
  return cards.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

export function groupExistingSessions(
  rows: ExistingSessionRow[],
  selectedPatientCount: number
): PlannerBoardCard[] {
  const buckets = new Map<string, ExistingSessionRow[]>();
  for (const row of rows) {
    const signature = visualWorkoutSignature(row.session.title || 'Treino', row.exercises);
    const key = `${row.weekday}::${signature}`;
    const list = buckets.get(key) || [];
    list.push(row);
    buckets.set(key, list);
  }
  return cardsFromBuckets(buckets, selectedPatientCount, 'weekday');
}

export function groupExistingSessionsByDate(
  rows: ExistingSessionRow[],
  selectedPatientCount: number
): Record<string, PlannerBoardCard[]> {
  const buckets = new Map<string, ExistingSessionRow[]>();
  for (const row of rows) {
    const date = row.session.scheduledDate;
    if (!date) continue;
    const signature = visualWorkoutSignature(row.session.title || 'Treino', row.exercises);
    const key = `${date}::${signature}`;
    const list = buckets.get(key) || [];
    list.push(row);
    buckets.set(key, list);
  }
  const cards = cardsFromBuckets(buckets, selectedPatientCount, 'date');
  const byDate: Record<string, PlannerBoardCard[]> = {};
  for (const card of cards) {
    const date = card.date;
    if (!date) continue;
    const list = byDate[date] || [];
    list.push(card);
    byDate[date] = list;
  }
  return byDate;
}

export function plannerColorKeyFromTemplates(
  card: Pick<PlannerBoardCard, 'title' | 'visualSignature' | 'template'>,
  templates: PersonalWorkoutTemplate[]
): string | undefined {
  const fromOwn = normalizeTreinoColorKey(card.template?.cor);
  if (fromOwn) return fromOwn;
  const signatureHit = templates.find(
    (template) => visualWorkoutSignature(template.nome, template.exercicios) === card.visualSignature
  );
  const fromSignature = normalizeTreinoColorKey(signatureHit?.cor);
  if (fromSignature) return fromSignature;
  const title = normalizePlannerTitle(card.title);
  const titleHit = templates.find((template) => normalizePlannerTitle(template.nome) === title);
  return normalizeTreinoColorKey(titleHit?.cor);
}

export function withPlannerCardColors(
  cards: PlannerBoardCard[],
  templates: PersonalWorkoutTemplate[]
): PlannerBoardCard[] {
  return cards.map((card) => {
    const colorKey = plannerColorKeyFromTemplates(card, templates);
    if (!colorKey) return card;
    if (card.colorKey === colorKey) return card;
    return { ...card, colorKey };
  });
}

export function withPlannerCardColorsByDate(
  cardsByDate: Record<string, PlannerBoardCard[]>,
  templates: PersonalWorkoutTemplate[]
): Record<string, PlannerBoardCard[]> {
  const next: Record<string, PlannerBoardCard[]> = {};
  for (const [date, cards] of Object.entries(cardsByDate)) {
    next[date] = withPlannerCardColors(cards, templates);
  }
  return next;
}

export type CardActiveSummary = {
  activeCount: number;
  total: number;
  state: 'all-active' | 'all-inactive' | 'mixed' | 'none';
};

export function cardActiveSummary(card: PlannerBoardCard): CardActiveSummary {
  const total = (card.patients || []).filter((item) => item.sessionId).length;
  if (card.source === 'draft' || total === 0) {
    return { activeCount: 0, total: 0, state: 'none' };
  }
  const activeCount = card.patients.filter((item) => item.active !== false && item.sessionId).length;
  if (activeCount === total) return { activeCount, total, state: 'all-active' };
  if (activeCount === 0) return { activeCount, total, state: 'all-inactive' };
  return { activeCount, total, state: 'mixed' };
}

export function shouldNotifyPatientPublish(created: number): boolean {
  return created > 0;
}

export function formatPatientPublishReportLine(report: {
  patientName: string;
  created: number;
  planned: number;
  status: 'success' | 'partial' | 'failed';
}): string {
  if (report.status === 'success') {
    return `${report.patientName}\n${report.created}/${report.planned} — sucesso`;
  }
  if (report.status === 'partial') {
    return `${report.patientName}\n${report.created}/${report.planned} sessões criadas — falha parcial`;
  }
  return `${report.patientName}\n${report.created}/${report.planned} — falha`;
}
