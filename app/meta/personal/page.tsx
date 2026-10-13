'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { deleteDoc, doc, updateDoc, deleteField, collection, getDocs, query, where } from 'firebase/firestore';
import {
  Dumbbell,
  Calendar,
  Plus,
  History,
  Target,
  BarChart3,
  Bell,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  X,
  Stethoscope,
  Shield,
  ShieldCheck,
  Loader2,
  Info,
  Video,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Star,
  Pill,
  Settings,
  Printer,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import { trainingSessionService } from '@/services/trainingSessionService';
import { TrainingExerciseExecutionService } from '@/services/trainingExerciseExecutionService';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import { WorkoutRunSeriesPanel } from '@/components/personal/run/WorkoutRunSeriesPanel';
import { WorkoutRunRestTimer } from '@/components/personal/run/WorkoutRunRestTimer';
import { WorkoutRunNotesSheet } from '@/components/personal/run/WorkoutRunNotesSheet';
import { WorkoutRunGymMediaSheet } from '@/components/personal/run/WorkoutRunGymMediaSheet';
import { GymMediaLoopVideo } from '@/components/personal/run/GymMediaLoopVideo';
import { AvaliacaoAtividadeFisicaGate } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate';
import { ProfessionalPersonalToolsBar } from '@/components/avaliacaoAtividadeFisica/ProfessionalPersonalToolsBar';
import { MetapersonalPersonalPatientTabBar } from '@/components/metapersonal/shell/MetapersonalPersonalPatientTabs';
import type {
  TrainingSession,
  TrainingSessionExercise,
  TrainingReminderPrefs,
} from '@/types/trainingSession';
import { ClassificacaoProfissionalService } from '@/services/classificacaoProfissionalService';
import { COL_PACIENTE_PERSONAL_TRAINER } from '@/features/metaPersonal/metaPersonal.constants';
import type { Exercise } from '@/types/exercise';
import { PacientePersonalTrainerService } from '@/services/pacientePersonalTrainerService';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { MedicoService } from '@/services/medicoService';
import type { Medico } from '@/types/medico';
import {
  translateExerciseName,
  translateBodyPart,
  translateTarget,
  translateEquipment,
} from '@/data/exerciseTranslations';
import {
  buildMuscleGroupImageUrl,
  muscleGroupsFromSessionExercises,
} from '@/lib/muscleGroupImage/exerciseDbMuscleMap';
import { listarInjetaveisPlanejadosNoPeriodo } from '@/utils/injetaveisCalendario';
import { ExerciseSeriesEditor } from '@/components/personal/ExerciseSeriesEditor';
import { ExerciseTrainerNoteField } from '@/components/personal/ExerciseTrainerNoteField';
import { ExerciseCatalogPanel } from '@/components/personal/create/ExerciseCatalogPanel';
import { PersonalCreateWorkoutDesktop } from '@/components/personal/create/PersonalCreateWorkoutDesktop';
import { PersonalWorkoutTemplatesPanel } from '@/components/personal/templates/PersonalWorkoutTemplatesPanel';
import { ImportWorkoutTemplateModal } from '@/components/personal/templates/ImportWorkoutTemplateModal';
import { SaveWorkoutAsTemplateModal } from '@/components/personal/templates/SaveWorkoutAsTemplateModal';
import { WorkoutLibraryDraftActions } from '@/components/personal/templates/WorkoutLibraryDraftActions';
import { WorkoutPrintModal } from '@/components/personal/print/WorkoutPrintModal';
import { PersonalTrainingStatsPanel } from '@/components/personal/stats/PersonalTrainingStatsPanel';
import { PatientTrainingStats } from '@/components/personal/patient/PatientTrainingStats';
import { SessionExerciseExecutionDetail } from '@/components/personal/stats/SessionExerciseExecutionDetail';
import { WorkoutSequencePreview } from '@/components/personal/WorkoutSequencePreview';
import { buildWorkoutPrintData, type WorkoutPrintData } from '@/lib/personal/workoutPrint';
import {
  createDefaultTrainingSeries,
  formatTrainingSeriesSummary,
  getEffectiveRestSec,
  normalizeTrainingExercisePrescription,
  sanitizeIntercalations,
  serializeTrainingPrescription,
  validateTrainingPrescription,
  type TrainingExerciseSeries,
  type TrainingIntercalatedOccurrence,
} from '@/lib/personal/trainingExerciseSeries';
import {
  importWorkoutTemplateToDraft,
  mergeClonedDraftsIntoWorkout,
  suggestedSessionTitleFromTemplate,
  type ImportWorkoutMode,
  type PersonalWorkoutTemplate,
} from '@/lib/personal/planosTreino';
import {
  completeExecutedSeries,
  createExerciseExecutionFromPrescription,
  getMarkExerciseStatusFromExecution,
  skipExecutedSeries,
  updatePendingExecutedSeriesPrescription,
  type TrainingExerciseExecution,
} from '@/lib/personal/trainingExecutionSeries';
import {
  createIntercalatedOccurrence,
  insertIntercalatedOccurrence,
  repeatIntercalatedOccurrence,
  shouldStartRestTimer,
} from '@/lib/personal/trainingIntercalation';
import {
  createIntercalationExecution,
  getHostQueueMarkStatus,
  getHostQueuePendingStep,
  resetHostQueueExecutions,
  skipRemainingHostQueue,
  stepExecution,
  buildHostRunQueueForExercise,
  type HostRunStep,
} from '@/lib/personal/trainingHostRun';
import {
  buildSeriesPrescriptionTarget,
  type SeriesPrescriptionPatch,
} from '@/lib/personal/propagateSeriesPrescription';
import { readOrganizationShellBrandingResponse } from '@/lib/organization/readOrganizationShellBrandingResponse';
import {
  PLATFORM_SHELL_LOGO_SRC,
  resolveOrganizationShellLogoUrl,
} from '@/lib/organization/resolveOrganizationShellLogoUrl';
import { metaPacienteAuthFetch } from '@/lib/meta/metaPacienteAuthFetch';
import { DEFAULT_PUBLIC_PAGE_LOGO_SRC } from '@/lib/whiteLabel/publicPagesTheme';
import {
  catalogExerciseIsAdded,
  clonePrescriptionWithNewIds,
  insertDuplicatedExercise,
  reorderSelectedExercises,
  sanitizeTrainerNote,
  toSelectedExerciseDraft,
  type SelectedExerciseDraft,
} from '@/lib/personal/workoutDraft';
import { getMetaHomeFirstName } from '@/components/meta/home/MetaPatientHeader';
import {
  PersonalPatientHeaderActions,
  type PersonalVinculadoPerfil,
} from '@/components/personal/patient/PersonalPatientHeaderActions';
import {
  PersonalEditWorkoutCard,
  PersonalExerciseListHeader,
  PersonalNotesHeader,
  PersonalTodayHeroCard,
} from '@/components/personal/patient/PersonalHojeMobileCards';
import { PatientTrainingHistory } from '@/components/personal/patient/PatientTrainingHistory';
import { notifyPacienteTreinoPersonalClient } from '@/lib/personal/notifyPacienteTreinoPersonalClient';
import { generateSessionDates as generateTrainingSessionDates } from '@/lib/personal/trainingRecurrence';
import { inferRecurringConfigFromSessions as inferRecurringConfigFromSessionsShared } from '@/lib/personal/inferRecurringConfig';
import { exerciseGymMediaService } from '@/services/exerciseGymMediaService';
import {
  deleteExerciseGymMediaClient,
  uploadExerciseGymMediaClient,
} from '@/lib/personal/uploadExerciseGymMediaClient';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';

type Tab = 'hoje' | 'cronograma' | 'criar' | 'historico' | 'estatisticas' | 'config';
const EXERCISE_FETCH_LIMIT = 300;
/** 360 = bom equilíbrio (1080 é ~1.7MB/GIF e falha mais em rede lenta). */
const EXERCISE_GIF_RESOLUTION: '180' | '360' | '720' | '1080' = '360';
const EXERCISE_GIF_THUMB_RESOLUTION: '180' | '360' | '720' | '1080' = '180';

/**
 * Constrói a URL do GIF do exercício usando nossa rota proxy.
 * Sempre use o ID da ExerciseDB (não o id do documento Firestore).
 */
function getExerciseGifUrl(
  exerciseDbId: string,
  resolution: '180' | '360' | '720' | '1080' = EXERCISE_GIF_RESOLUTION
): string {
  const id = String(exerciseDbId || '').trim();
  if (!id) return '';
  return `/api/exercisedb/image?exerciseId=${encodeURIComponent(id)}&resolution=${resolution}`;
}

/** Resolve o ID ExerciseDB a partir de um exercício da API ou da sessão. */
function resolveExerciseDbId(ex: {
  id?: string;
  exerciseId?: string;
  source?: string;
}): string {
  const fromSession = String(ex.exerciseId || '').trim();
  if (fromSession) return fromSession;
  const fromApi = String(ex.id || '').trim();
  // IDs ExerciseDB são tipicamente numéricos curtos ("0025"); docs Firestore são longos.
  // Se só temos id e parece Firestore, não use.
  if (fromApi && /^\d{1,6}$/.test(fromApi)) return fromApi;
  if (fromApi && !fromApi.includes('/') && fromApi.length <= 8) return fromApi;
  return fromApi && fromApi.length < 28 ? fromApi : '';
}

function resolveExerciseGifUrl(
  ex: { id?: string; exerciseId?: string; gifUrl?: string | null },
  resolution: '180' | '360' | '720' | '1080' = EXERCISE_GIF_RESOLUTION
): string {
  const dbId = resolveExerciseDbId(ex);
  if (dbId) return getExerciseGifUrl(dbId, resolution);
  const existing = String(ex.gifUrl || '').trim();
  // Só reutiliza gifUrl salvo se já apontar para nosso proxy com exerciseId
  if (existing.includes('/api/exercisedb/image?') && existing.includes('exerciseId=')) {
    return existing;
  }
  return '';
}

function withResolvedGifUrls<T extends { id?: string; exerciseId?: string; gifUrl?: string | null }>(
  exercises: T[],
  resolution: '180' | '360' | '720' | '1080' = EXERCISE_GIF_RESOLUTION
): T[] {
  return exercises.map((ex) => ({
    ...ex,
    gifUrl: resolveExerciseGifUrl(ex, resolution) || ex.gifUrl || undefined,
  }));
}

function translateDifficulty(value?: string): string | null {
  if (!value) return null;
  const map: Record<string, string> = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  };
  return map[value.toLowerCase()] || value;
}

function translateCategory(value?: string): string | null {
  if (!value) return null;
  const map: Record<string, string> = {
    strength: 'Força',
    cardio: 'Cardio',
    mobility: 'Mobilidade',
    balance: 'Equilíbrio',
    stretching: 'Alongamento',
    plyometrics: 'Pliometria',
    rehabilitation: 'Reabilitação',
  };
  return map[value.toLowerCase()] || value;
}

/** YYYY-MM-DD em horário local (scheduledDate no Firestore é local). */
function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Iniciais Seg–Dom (X = sexta, para não colidir com Sábado/Segunda). */
const WEEKDAY_LETTERS = ['S', 'T', 'Q', 'Q', 'X', 'S', 'D'] as const;
/** Letras do calendário circular (esboço: sexta e sábado compartilham S; o nome completo fica no aria-label). */
const WEEKDAY_CIRCLE_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;
const WEEKDAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;
const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

/** Saudação pelo horário local do aparelho. 05–11 dia, 12–17 tarde, 18–04 noite. */
function greetingLabelForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia,';
  if (hour >= 12 && hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

function msUntilNextGreetingBoundary(now = new Date()): number {
  const hour = now.getHours();
  const next = [5, 12, 18].find((boundary) => boundary > hour);
  const target = new Date(now);
  if (next == null) {
    target.setDate(target.getDate() + 1);
    target.setHours(5, 0, 0, 0);
  } else {
    target.setHours(next, 0, 0, 0);
  }
  return Math.max(1000, target.getTime() - now.getTime() + 250);
}

function weekDayStatusLabel(temTreino: boolean, progresso: number): string {
  if (progresso >= 100) return ', treino realizado';
  if (progresso > 0) return `, treino em andamento, ${progresso}% concluído`;
  if (temTreino) return ', treino agendado';
  return '';
}

function weekDayDotClass(temTreino: boolean, progresso: number): string {
  if (progresso >= 100) return 'bg-[#4CCB7A]';
  if (progresso > 0) return 'bg-orange-400';
  if (temTreino) return 'bg-[#7EB6E8]';
  return 'bg-white/25';
}

/** Borda neon laranja de progresso do treino (inset da borda verde quando selecionado). */
function CalendarDayProgressBorder({
  percent,
  selected = false,
  dense = false,
  circular = false,
}: {
  percent: number;
  selected?: boolean;
  dense?: boolean;
  circular?: boolean;
}) {
  if (percent <= 0) return null;
  const inset = selected ? (dense ? 'inset-[3px]' : 'inset-[4px]') : dense ? 'inset-[2px]' : 'inset-[2.5px]';
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute ${circular ? 'rounded-full' : 'rounded-[10px]'} ${inset}`}
      style={{
        padding: dense ? 1.5 : 2,
        background: `conic-gradient(from -90deg, #F97316 ${percent}%, transparent 0)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        boxShadow:
          percent >= 100
            ? '0 0 12px rgba(249, 115, 22, 0.55)'
            : '0 0 8px rgba(249, 115, 22, 0.3)',
      }}
    />
  );
}

function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Item de injetável no calendário Personal (Cronograma). */
type CalendarioInjetavelItem = {
  data: Date;
  protocoloNome: string;
  semana: number;
  observacao?: string;
  realizado: boolean;
  aplicacaoId: string;
};

function statusInjetavelNoDia(item: { data: Date; realizado: boolean }): 'aplicado' | 'hoje' | 'pendente' | 'futura' {
  if (item.realizado) return 'aplicado';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(item.data);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === hoje.getTime()) return 'hoje';
  if (d.getTime() < hoje.getTime()) return 'pendente';
  return 'futura';
}

function CalendarioInjetavelBadge({
  items,
  dense = false,
}: {
  items: CalendarioInjetavelItem[];
  dense?: boolean;
}) {
  if (items.length === 0) return null;
  const allDone = items.every((i) => i.realizado);
  return (
    <span
      className={`${dense ? 'w-4 h-4' : 'w-5 h-5'} rounded-full flex items-center justify-center ${
        allDone
          ? 'bg-[#4CCB7A]/25 ring-1 ring-[#4CCB7A]/80 text-[#4CCB7A] shadow-[0_0_8px_rgba(76,203,122,0.5)]'
          : 'bg-[#F97316]/20 ring-1 ring-[#F97316]/80 text-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.55)]'
      }`}
      title={items
        .map(
          (i) =>
            `${i.protocoloNome} · Semana ${i.semana}${i.realizado ? ' (aplicado)' : ''}`
        )
        .join(', ')}
    >
      <Pill className={dense ? 'w-2.5 h-2.5' : 'w-3 h-3'} aria-hidden />
    </span>
  );
}

/** Semana atual com início na segunda-feira. */
function getCurrentWeekDates(ref: Date = new Date()): Date[] {
  const base = new Date(ref);
  base.setHours(0, 0, 0, 0);
  const dow = base.getDay(); // 0 = domingo
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

/** ETAPA 0 v2 — Mini design system local (tokens + componentes) */
const ui = {
  surface: 'min-h-full bg-gradient-to-b from-[#2F8FA3]/15 via-transparent to-[#0A1F44]/70',
  card: 'rounded-2xl border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED] shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]',
  cardAlt: 'rounded-2xl border border-white/10 bg-[#0A1F44]/85 text-[#E8EDED] backdrop-blur-sm shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]',
  pill: 'text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-black/5 dark:ring-white/10',
  btnPrimary: 'min-h-[44px] py-2.5 px-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-95 active:scale-[0.99] transition ring-1 ring-black/5 dark:ring-white/10 shadow-lg shadow-emerald-500/20',
  btnGhost: 'min-h-[44px] py-2.5 px-4 rounded-xl font-medium bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition',
  btnDanger: 'min-h-[44px] py-2.5 px-4 rounded-xl font-semibold border border-red-300 dark:border-red-700 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.99] transition',
  btnSuccess: 'min-h-[44px] py-2.5 px-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-95 active:scale-[0.99] transition',
  hairline: 'border-t border-black/5 dark:border-white/10',
} as const;

function Surface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${ui.surface} ${className}`}>
      {/* Mancha/blur decorativa no topo (full-bleed) */}
      <div
        className="absolute inset-x-0 top-0 h-48 pointer-events-none blur-3xl opacity-30 bg-emerald-400/30 dark:bg-emerald-500/20"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function Card({
  children,
  variant = 'solid',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'solid' | 'glass';
  className?: string;
}) {
  const base = variant === 'glass' ? ui.cardAlt : ui.card;
  return <div className={`${base} ${className}`}>{children}</div>;
}

function PrimaryCTA({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 ${ui.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

export function PersonalPageContent({
  embedded = false,
  pacienteProp,
  fromMetapersonalEmbedded = false,
  fromMetaadminEmbedded = false,
  metaadminFullscreen = false,
  suppressAppHeader = false,
  professionalReadOnly = false,
  professionalViewerRole,
  onCloseMetaadmin,
  metaadminHeaderExtra,
  patientBrowserTabs,
}: {
  embedded?: boolean;
  pacienteProp?: any;
  /** Quando true, aberto dentro do Metapersonal (mesma página, menu inferior visível); header só "Aluno: nome" */
  fromMetapersonalEmbedded?: boolean;
  /** Aberto no Personal do metaadmin (médico): espelha abas do paciente; vínculo fica no container. */
  fromMetaadminEmbedded?: boolean;
  /** Mobile metaadmin: mesma tela cheia do metapersonal. */
  metaadminFullscreen?: boolean;
  /** Cabeçalho do paciente já renderizado pelo container (ex.: PacienteModalHeader). */
  suppressAppHeader?: boolean;
  /** Médico: visualiza sem criar/editar/apagar treinos. */
  professionalReadOnly?: boolean;
  /** Papel na anamnese / plano gerado. Default: personal_trainer (metapersonal) ou doctor (metaadmin). */
  professionalViewerRole?: 'doctor' | 'personal_trainer';
  onCloseMetaadmin?: () => void;
  /** Controles de vínculo personal no header (tela cheia do médico). */
  metaadminHeaderExtra?: React.ReactNode;
  /** Mobile metapersonal: abas de pacientes no header, como um navegador. */
  patientBrowserTabs?: {
    tabs: Array<{ id: string; nome: string }>;
    activeId: string;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onAdd: () => void;
    onCloseAll: () => void;
  } | null;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('hoje');
  
  // Estado para modo personal trainer (quando acessando via query string)
  const [pacienteIdFromQuery, setPacienteIdFromQuery] = useState<string | null>(null);
  const [isPersonalTrainerMode, setIsPersonalTrainerMode] = useState(false);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);

  // Estados gerais
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
  const [selectedTodaySessionId, setSelectedTodaySessionId] = useState<string | null>(null);
  const [todayExercises, setTodayExercises] = useState<TrainingSessionExercise[]>([]);
  const [muscleImageFailed, setMuscleImageFailed] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  /** Data selecionada na faixa Seg–Dom (YYYY-MM-DD). Default = hoje. */
  const [selectedHojeDate, setSelectedHojeDate] = useState(() => toLocalYYYYMMDD(new Date()));
  /** Datas da semana atual que já têm treino gravado (indicador nas bolinhas). */
  const [weekDatesWithSessions, setWeekDatesWithSessions] = useState<Set<string>>(() => new Set());
  /** Progresso % do treino por dia (YYYY-MM-DD) para a borda laranja nos retângulos Seg–Dom. */
  const [weekProgressByDate, setWeekProgressByDate] = useState<Record<string, number>>({});
  const [patientNotes, setPatientNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<TrainingSession | null>(null);
  const [selectedSessionExercisesDetail, setSelectedSessionExercisesDetail] = useState<TrainingSessionExercise[]>([]);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deletingExercise, setDeletingExercise] = useState<string | null>(null);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [showAllCalendarExercises, setShowAllCalendarExercises] = useState(false);
  const [showAllHistoricoExercises, setShowAllHistoricoExercises] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dayGreeting, setDayGreeting] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [activeRunSession, setActiveRunSession] = useState<TrainingSession | null>(null);
  const [activeRunExerciseId, setActiveRunExerciseId] = useState<string | null>(null);
  const activeRunExerciseIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeRunExerciseIdRef.current = activeRunExerciseId;
  }, [activeRunExerciseId]);
  const [runExerciseDetails, setRunExerciseDetails] = useState<Exercise | null>(null);
  const [loadingRunDetails, setLoadingRunDetails] = useState(false);
  const runExerciseDetailsCacheRef = useRef<Map<string, Exercise>>(new Map());
  const [runDetailsSheetOpen, setRunDetailsSheetOpen] = useState(false);
  const [runNotesSheetOpen, setRunNotesSheetOpen] = useState(false);
  const [runGymMediaSheetOpen, setRunGymMediaSheetOpen] = useState(false);
  const [runGymMedia, setRunGymMedia] = useState<ExerciseGymMedia | null>(null);
  const [showRunGymMediaPreview, setShowRunGymMediaPreview] = useState(false);
  const [gymMediaUploading, setGymMediaUploading] = useState(false);
  const [gymMediaError, setGymMediaError] = useState<string | null>(null);
  const [runDetailsTranslated, setRunDetailsTranslated] = useState<{
    descriptionPt: string | null;
    instructionsPt: string[];
  } | null>(null);
  const [loadingRunDetailsTranslate, setLoadingRunDetailsTranslate] = useState(false);
  const runDetailsTranslateCacheRef = useRef<
    Map<string, { descriptionPt: string | null; instructionsPt: string[] }>
  >(new Map());
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restTotalSec, setRestTotalSec] = useState<number | null>(null);
  const [organizationShellBranding, setOrganizationShellBranding] = useState<{
    logoDarkUrl?: string | null;
    logoLightUrl?: string | null;
    logoMainUrl?: string | null;
    iconUrl?: string | null;
    publicName?: string | null;
  } | null>(null);
  const [organizationShellContext, setOrganizationShellContext] = useState<{
    organizationId: string | null;
    organizationMatch: boolean;
  }>({ organizationId: null, organizationMatch: true });
  const persistSeriesPrescriptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSeriesPrescriptionPendingRef = useRef<{
    seriesId: string;
    patch: SeriesPrescriptionPatch;
  } | null>(null);
  const persistingPrescriptionRef = useRef(false);
  const [isRestRunning, setIsRestRunning] = useState(false);
  const [restAdvanceMode, setRestAdvanceMode] = useState<'series' | 'exercise'>('series');
  const restAdvanceModeRef = useRef<'series' | 'exercise'>('series');
  const [runExecution, setRunExecution] = useState<TrainingExerciseExecution | null>(null);
  const [runIntercalationExecutions, setRunIntercalationExecutions] = useState<
    Record<string, TrainingExerciseExecution>
  >({});
  const [loadingRunExecution, setLoadingRunExecution] = useState(false);
  const [runExecutionError, setRunExecutionError] = useState(false);
  const [savingRunSeries, setSavingRunSeries] = useState(false);
  const savingRunSeriesRef = useRef(false);
  const [workoutElapsedSec, setWorkoutElapsedSec] = useState(0);
  const [workoutPaused, setWorkoutPaused] = useState(false);
  const [restDefaultSec, setRestDefaultSec] = useState(60);
  const [restSoundEnabled, setRestSoundEnabled] = useState(true);
  const [timerAutoStart, setTimerAutoStart] = useState(true);
  const [restFinishedBadge, setRestFinishedBadge] = useState(false);
  const [futureSessionToast, setFutureSessionToast] = useState<string | null>(null);
  const workoutStartAtRef = useRef<number | null>(null);

  // Computed: primeira sessão para compatibilidade com header
  const todaySession = todaySessions.length > 0 ? todaySessions[0] : null;

  // Estados do calendário
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [semanaCalendario, setSemanaCalendario] = useState(new Date());
  const [visualizacaoCalendario, setVisualizacaoCalendario] = useState<'mes' | 'semana'>('semana');
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [sessoesCalendario, setSessoesCalendario] = useState<TrainingSession[]>([]);
  const [showTreinosToggle, setShowTreinosToggle] = useState(true);
  const [showAplicacoesToggle, setShowAplicacoesToggle] = useState(true);
  const [showInjetaveisToggle, setShowInjetaveisToggle] = useState(true);
  const [showPagamentosToggle, setShowPagamentosToggle] = useState(true);
  const [aplicacoesCalendario, setAplicacoesCalendario] = useState<Array<{ data: Date; semana: number; dose: number; status: string }>>([]);
  const [injetaveisCalendario, setInjetaveisCalendario] = useState<CalendarioInjetavelItem[]>([]);
  const [pagamentosCalendario, setPagamentosCalendario] = useState<Array<{ data: Date; tipo: 'nutri' | 'personal'; valor: number; parcela?: number }>>([]);
  const [paciente, setPaciente] = useState<any>(null);
  const [medicoResponsavel, setMedicoResponsavel] = useState<Medico | null>(null);
  /** Personal vinculado ao paciente (modo cliente / app fullscreen). */
  const [personalVinculado, setPersonalVinculado] = useState<PersonalVinculadoPerfil | null>(null);
  const [agregadoPersonalVinculado, setAgregadoPersonalVinculado] = useState<{
    count: number;
    media: number;
  } | null>(null);
  const [libraryPersonalTrainerId, setLibraryPersonalTrainerId] = useState<string | null>(null);
  const [aplicacaoSelecionada, setAplicacaoSelecionada] = useState<Date | null>(null);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Date | null>(null);

  // Estados do Criar Treino
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [criarFiltroPastaAtiva, setCriarFiltroPastaAtiva] = useState<'bodyPart' | 'target' | 'equipment'>('bodyPart');
  const [targets, setTargets] = useState<string[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [bodyPartCatalogExercises, setBodyPartCatalogExercises] = useState<Exercise[]>([]);
  const [exercisesResults, setExercisesResults] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExerciseDraft[]>([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [sessionType, setSessionType] = useState<'single' | 'recurring'>('single');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'custom'>('weekly');
  const [weeksCount, setWeeksCount] = useState(4);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);
  const [criarTab, setCriarTab] = useState<'novo' | 'salvos' | 'biblioteca'>('novo');
  const [criarTreinoSheetOpen, setCriarTreinoSheetOpen] = useState(false);
  const [criarPortalReady, setCriarPortalReady] = useState(false);
  const [editingSessionIds, setEditingSessionIds] = useState<string[]>([]);
  const [editingRecurrenceGroupId, setEditingRecurrenceGroupId] = useState<string | null>(null);
  const [isWorkoutDraftDirty, setIsWorkoutDraftDirty] = useState(false);
  const [isLibraryDraftDirty, setIsLibraryDraftDirty] = useState(false);
  const [importTemplateOpen, setImportTemplateOpen] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<string[]>([]);
  const [intercalationPick, setIntercalationPick] = useState<{
    draftId: string;
    afterSeriesId: string;
  } | null>(null);
  const [savedSessionsCriar, setSavedSessionsCriar] = useState<TrainingSession[]>([]);
  const [loadingSavedSessionsCriar, setLoadingSavedSessionsCriar] = useState(false);
  const [togglingSavedGroupKey, setTogglingSavedGroupKey] = useState<string | null>(null);

  // Estados do Histórico
  const [historicoSessions, setHistoricoSessions] = useState<TrainingSession[]>([]);
  const [historicoExerciseStatusMap, setHistoricoExerciseStatusMap] = useState<Record<string, boolean>>({});
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<TrainingSession | null>(null);
  const [selectedSessionExercises, setSelectedSessionExercises] = useState<
    TrainingSessionExercise[]
  >([]);
  const [selectedHistoricoExecutions, setSelectedHistoricoExecutions] = useState<
    Record<string, TrainingExerciseExecution>
  >({});
  const [workoutPrintOpen, setWorkoutPrintOpen] = useState(false);
  const [workoutPrintData, setWorkoutPrintData] = useState<WorkoutPrintData | null>(null);
  const [loadingWorkoutPrint, setLoadingWorkoutPrint] = useState(false);
  const [loggedPersonalName, setLoggedPersonalName] = useState<string | null>(null);
  const [mesHistoricoCalendario, setMesHistoricoCalendario] = useState(new Date());
  const [semanaHistoricoCalendario, setSemanaHistoricoCalendario] = useState(new Date());
  const [visualizacaoHistoricoCalendario, setVisualizacaoHistoricoCalendario] = useState<'mes' | 'semana'>('semana');
  const [diaHistoricoSelecionado, setDiaHistoricoSelecionado] = useState<Date | null>(new Date());
  const [historicoAplicacaoSelecionada, setHistoricoAplicacaoSelecionada] = useState<Date | null>(null);
  const [historicoPagamentoSelecionado, setHistoricoPagamentoSelecionado] = useState<Date | null>(null);

  // Estados de Lembretes
  const [reminderPrefs, setReminderPrefs] = useState<TrainingReminderPrefs | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);
  const [configTimerExpanded, setConfigTimerExpanded] = useState(true);
  const [configReminderExpanded, setConfigReminderExpanded] = useState(true);
  const normFilterValue = useCallback((v: unknown) => String(v ?? '').trim().toLowerCase(), []);
  const availableTargetsByBodyPart = useMemo(() => {
    if (!selectedBodyPart) return targets;
    const available = new Set(
      bodyPartCatalogExercises
        .filter((ex) => normFilterValue(ex.bodyPart) === normFilterValue(selectedBodyPart))
        .map((ex) => ex.target)
        .filter((value): value is string => Boolean(value))
    );
    return targets.filter((target) => available.has(target));
  }, [selectedBodyPart, targets, bodyPartCatalogExercises, normFilterValue]);
  const availableEquipmentsByFilters = useMemo(() => {
    if (!selectedBodyPart) return equipments;
    const available = new Set(
      bodyPartCatalogExercises
        .filter((ex) => {
          if (normFilterValue(ex.bodyPart) !== normFilterValue(selectedBodyPart)) return false;
          if (selectedTarget && normFilterValue(ex.target) !== normFilterValue(selectedTarget)) return false;
          return true;
        })
        .map((ex) => ex.equipment)
        .filter((value): value is string => Boolean(value))
    );
    return equipments.filter((equipment) => available.has(equipment));
  }, [selectedBodyPart, selectedTarget, equipments, bodyPartCatalogExercises, normFilterValue]);

  // Função helper para obter o ID do paciente (pacienteId da query ou user.uid)
  // Não usar useCallback para evitar problemas de inicialização
  const getPatientId = (): string | null => {
    return pacienteIdFromQuery || user?.uid || null;
  };

  // from=metapersonal ou fromMetapersonalEmbedded: header só "Aluno: nome"
  const fromMetapersonal = searchParams.get('from') === 'metapersonal' || fromMetapersonalEmbedded;
  const isProfessionalEmbed = fromMetapersonal || fromMetaadminEmbedded;
  const restLogoSrc = useMemo(
    () =>
      resolveOrganizationShellLogoUrl(organizationShellBranding, {
        darkBackground: true,
        fallbackSrc:
          organizationShellContext.organizationId &&
          organizationShellContext.organizationId !== 'metodo'
            ? PLATFORM_SHELL_LOGO_SRC
            : DEFAULT_PUBLIC_PAGE_LOGO_SRC,
      }),
    [organizationShellBranding, organizationShellContext.organizationId]
  );
  const restLogoAlt = organizationShellBranding?.publicName?.trim() || 'Organização';
  const resolvedProfessionalRole: 'doctor' | 'personal_trainer' =
    professionalViewerRole || (fromMetaadminEmbedded ? 'doctor' : 'personal_trainer');
  const blockProfessionalMutations = professionalReadOnly || fromMetaadminEmbedded;

  // Ler pacienteId da query string e verificar autorização.
  // Embedded (metapersonal / metaadmin / metanutri): ativa modo PT com o pacienteProp.
  useEffect(() => {
    const pacienteId = searchParams.get('pacienteId');
    const embeddedPacienteId =
      (fromMetapersonalEmbedded || fromMetaadminEmbedded) && pacienteProp
        ? String(pacienteProp.id || pacienteProp.userId || '')
        : '';
    console.log('[useEffect] pacienteId da query:', pacienteId, 'embeddedPacienteId:', embeddedPacienteId || null);
    if (pacienteId) {
      setPacienteIdFromQuery(pacienteId);
      setIsPersonalTrainerMode(true);
      console.log('[useEffect] Modo personal trainer ativado, pacienteId:', pacienteId);
    } else if (embeddedPacienteId) {
      setPacienteIdFromQuery(embeddedPacienteId);
      setIsPersonalTrainerMode(true);
      setAuthorizationError(null);
      console.log('[useEffect] Modo personal trainer (embedded profissional), pacienteId:', embeddedPacienteId);
    } else {
      setPacienteIdFromQuery(null);
      setIsPersonalTrainerMode(false);
      setAuthorizationError(null);
      console.log('[useEffect] Modo paciente normal');
    }
  }, [
    searchParams,
    fromMetapersonalEmbedded,
    fromMetaadminEmbedded,
    pacienteProp?.id,
    pacienteProp?.userId,
  ]);

  // Verificar autorização quando houver pacienteId e user
  // Se veio do /metapersonal (com pacienteId na query), confiar que já tem acesso
  // pois o paciente só aparece na lista se o Personal Trainer tiver acesso
  // Embeds de médico/nutri (fromMetaadminEmbedded): só visualização — não exige PT
  useEffect(() => {
    const verifyAuthorization = async () => {
      if (!pacienteIdFromQuery || !user) {
        setAuthorizationError(null);
        setLoggedPersonalName(null);
        return;
      }

      if (fromMetaadminEmbedded || professionalReadOnly) {
        setAuthorizationError(null);
        setLoggedPersonalName(null);
        return;
      }
      
      try {
        // Verificar se o usuário é um personal trainer
        const personalTrainer = await PersonalTrainerService.getPersonalTrainerByUserId(user.uid);
        if (!personalTrainer) {
          setLoggedPersonalName(null);
          setAuthorizationError('Acesso negado: você não é um Personal Trainer.');
          return;
        }
        setLoggedPersonalName(String(personalTrainer.nome || '').trim() || null);

        // Se veio através do /metapersonal, confiar que tem acesso
        // Verificar de forma silenciosa apenas para logging, mas sempre permitir acesso
        try {
          const pacientesVisiveis = await PacientePersonalTrainerService.listPacientesVisiveisByPersonal(user.uid);
          const temAcesso = pacientesVisiveis.some(p => 
            p.pacienteId === pacienteIdFromQuery || 
            p.paciente.id === pacienteIdFromQuery ||
            p.paciente.userId === pacienteIdFromQuery
          );

          if (!temAcesso) {
            // Tentar verificação direta como fallback
            const hasAccess = await PacientePersonalTrainerService.hasAccessToPaciente(
              user.uid,
              pacienteIdFromQuery
            );

            if (!hasAccess) {
              console.warn('Personal Trainer tentando acessar paciente sem vínculo direto:', {
                personalTrainerId: user.uid,
                pacienteId: pacienteIdFromQuery
              });
              // Mesmo assim permitir acesso, pois pode ser um caso edge ou problema de sincronização
            }
          }
        } catch (checkError) {
          console.warn('Erro ao verificar acesso (permitindo mesmo assim):', checkError);
        }

        // Sempre permitir acesso se veio do /metapersonal
        setAuthorizationError(null);
      } catch (error) {
        console.error('Erro ao verificar autorização:', error);
        // Em caso de erro, permitir acesso (mais permissivo)
        setAuthorizationError(null);
      }
    };

    verifyAuthorization();
  }, [pacienteIdFromQuery, user, paciente, fromMetaadminEmbedded, professionalReadOnly]);

  useEffect(() => {
    if (!user) {
      setOrganizationShellBranding(null);
      setOrganizationShellContext({ organizationId: null, organizationMatch: true });
      return;
    }
    const endpoint =
      fromMetapersonalEmbedded || fromMetapersonal
        ? '/api/metapersonal/organization-branding'
        : fromMetaadminEmbedded
          ? '/api/metaadmin/organization-branding'
          : '/api/meta/organization-branding';
    let cancelled = false;
    setOrganizationShellBranding(null);
    setOrganizationShellContext({ organizationId: null, organizationMatch: true });
    void (async () => {
      try {
        const res =
          endpoint === '/api/meta/organization-branding'
            ? await metaPacienteAuthFetch(endpoint)
            : await fetch(endpoint, {
                headers: { Authorization: `Bearer ${await user.getIdToken()}` },
              });
        const parsed = readOrganizationShellBrandingResponse(res.ok ? await res.json() : null);
        if (!cancelled) {
          setOrganizationShellContext({
            organizationId: parsed.organizationId,
            organizationMatch: parsed.organizationMatch,
          });
          setOrganizationShellBranding(parsed.branding);
        }
      } catch {
        if (!cancelled) {
          setOrganizationShellBranding(null);
          setOrganizationShellContext({ organizationId: null, organizationMatch: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fromMetapersonalEmbedded, fromMetapersonal, fromMetaadminEmbedded]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setDayGreeting(greetingLabelForHour(new Date().getHours()));
      timer = window.setTimeout(tick, msUntilNextGreetingBoundary());
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      setKeyboardOpen(window.innerHeight - viewport.height > 140);
    };
    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
    };
  }, []);

  // Paciente em desktop: Personal fica no shell do /meta (sidebar), como o /metapersonal.
  useEffect(() => {
    if (embedded || metaadminFullscreen || fromMetapersonalEmbedded || fromMetaadminEmbedded) return;
    if (searchParams.get('pacienteId') || searchParams.get('from') === 'metapersonal') return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) {
      router.replace('/meta?menu=personal');
    }
  }, [
    embedded,
    metaadminFullscreen,
    fromMetapersonalEmbedded,
    fromMetaadminEmbedded,
    searchParams,
    router,
  ]);

  useEffect(() => {
    setCriarPortalReady(true);
  }, []);

  // App fullscreen (standalone ou embutido com overlay): trava scroll do body
  useEffect(() => {
    if (embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  // Modais portados (Salvar / Iniciar treino): trava overscroll e scroll por baixo
  const isOverlayModalOpen =
    criarTreinoSheetOpen ||
    importTemplateOpen ||
    saveAsTemplateOpen ||
    (isWorkoutRunning && !selectedSessionForDetail);
  useEffect(() => {
    if (!isOverlayModalOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.touchAction = prev.bodyTouchAction;
    };
  }, [isOverlayModalOpen]);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' && window.localStorage.getItem('oftware_personal_timer_prefs');
      if (raw) {
        const prefs = JSON.parse(raw) as { soundEnabled?: boolean; restDefaultSec?: number; autoStart?: boolean };
        if (prefs.soundEnabled !== undefined) setRestSoundEnabled(prefs.soundEnabled);
        if (prefs.restDefaultSec !== undefined && prefs.restDefaultSec >= 10 && prefs.restDefaultSec <= 600) setRestDefaultSec(prefs.restDefaultSec);
        if (prefs.autoStart !== undefined) setTimerAutoStart(prefs.autoStart);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('oftware_personal_timer_prefs', JSON.stringify({
        soundEnabled: restSoundEnabled,
        restDefaultSec,
        autoStart: timerAutoStart,
      }));
    } catch (_) {}
  }, [restSoundEnabled, restDefaultSec, timerAutoStart]);

  useEffect(() => {
    if (!activeRunSession) return;
    runExercisesRef.current = activeRunSession.id === selectedTodaySessionId ? todayExercises : selectedSessionExercisesDetail;
  }, [activeRunSession, selectedTodaySessionId, todayExercises, selectedSessionExercisesDetail]);

  useEffect(() => {
    if (restSecondsLeft == null) setRestTotalSec(null);
  }, [restSecondsLeft]);

  useEffect(() => {
    if (!isRestRunning || restSecondsLeft == null) return;
    const t = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev == null || prev <= 1) {
          setIsRestRunning(false);
          setRestFinishedBadge(true);
          if (restSoundEnabled) {
            try {
              const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.value = 0.15;
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.15);
            } catch (_) {}
          }
          setTimeout(() => setRestFinishedBadge(false), 2000);
          if (restAdvanceModeRef.current === 'exercise') {
            const list = runExercisesRef.current ?? [];
            const currentId = activeRunExerciseIdRef.current;
            const currentIdx = list.findIndex((ex) => ex.id === currentId);
            const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % Math.max(list.length, 1);
            setActiveRunExerciseId(list[nextIdx]?.id ?? currentId ?? null);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isRestRunning, restSecondsLeft, restSoundEnabled]);

  useEffect(() => {
    if (!isWorkoutRunning || workoutPaused) return;
    const t = setInterval(() => setWorkoutElapsedSec((prev) => prev + 1), 1000);
    return () => clearInterval(t);
  }, [isWorkoutRunning, workoutPaused]);

  const startWorkout = useCallback((session: TrainingSession | null, exerciseId: string | null) => {
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem iniciar o treino por aqui.');
      return;
    }
    if (!session || !exerciseId) return;
    setActiveRunSession(session);
    setActiveRunExerciseId(exerciseId);
    setIsWorkoutRunning(true);
    setWorkoutElapsedSec(0);
    setWorkoutPaused(false);
    setRestSecondsLeft(null);
    setIsRestRunning(false);
    setRunExecution(null);
    setRunIntercalationExecutions({});
    setLoadingRunExecution(false);
    setSavingRunSeries(false);
    workoutStartAtRef.current = Date.now();
  }, [blockProfessionalMutations]);

  // Definir todas as funções useCallback antes dos useEffect que as usam
  const loadPaciente = useCallback(async () => {
    const patientId = pacienteIdFromQuery || user?.uid || null;
    if (!patientId) {
      console.log('[loadPaciente] Sem patientId disponível', { pacienteIdFromQuery, userId: user?.uid });
      return;
    }
    
    console.log('[loadPaciente] Carregando paciente', { 
      patientId, 
      isPersonalTrainerMode, 
      pacienteIdFromQuery,
      userId: user?.uid 
    });
    
    try {
      const { PacienteService } = await import('@/services/pacienteService');
      let pacienteData;
      
      if (isPersonalTrainerMode && pacienteIdFromQuery) {
        // Modo personal trainer: buscar pelo ID do documento Firestore
        console.log('[loadPaciente] Buscando paciente por ID do documento:', pacienteIdFromQuery);
        pacienteData = await PacienteService.getPacienteById(pacienteIdFromQuery);
        
        // Se não encontrou pelo ID do documento, tentar buscar pelo userId como fallback
        if (!pacienteData) {
          console.log('[loadPaciente] Não encontrado pelo ID, tentando buscar pacientes visíveis...');
          const pacientesVisiveis = await PacientePersonalTrainerService.listPacientesVisiveisByPersonal(user?.uid || '');
          const pacienteEncontrado = pacientesVisiveis.find(p => 
            p.pacienteId === pacienteIdFromQuery || 
            p.paciente.id === pacienteIdFromQuery ||
            p.paciente.userId === pacienteIdFromQuery
          );
          
          if (pacienteEncontrado) {
            pacienteData = pacienteEncontrado.paciente;
            console.log('[loadPaciente] Paciente encontrado na lista de pacientes visíveis');
          }
        }
        
        console.log('[loadPaciente] Paciente encontrado:', pacienteData ? `Sim - ${pacienteData.nome}` : 'Não');
      } else if (user?.email) {
        // Modo paciente: buscar pelo email
        console.log('[loadPaciente] Buscando paciente por email:', user.email);
        pacienteData = await PacienteService.getPacienteByEmail(user.email);
        console.log('[loadPaciente] Paciente encontrado:', pacienteData ? 'Sim' : 'Não');
      }
      
      if (pacienteData) {
        console.log('[loadPaciente] Paciente carregado com sucesso:', {
          nome: pacienteData.nome,
          id: pacienteData.id,
          userId: pacienteData.userId,
          email: pacienteData.email
        });
        setPaciente(pacienteData);
      } else {
        console.warn('[loadPaciente] Nenhum paciente encontrado para:', pacienteIdFromQuery);
      }
    } catch (error) {
      console.error('[loadPaciente] Erro ao carregar paciente:', error);
    }
  }, [pacienteIdFromQuery, user, isPersonalTrainerMode]);

  const loadCalendarSessions = useCallback(async () => {
    // Usar userId do paciente se disponível (sessões são criadas com userId)
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;

    try {
      console.log('[loadCalendarSessions] Buscando sessões para patientId:', patientId);
      let startDate: string;
      let endDate: string;

      if (visualizacaoCalendario === 'semana') {
        // Calcular início e fim da semana
        const inicioSemana = new Date(semanaCalendario);
        inicioSemana.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);
        
        startDate = toLocalYYYYMMDD(inicioSemana);
        endDate = toLocalYYYYMMDD(fimSemana);
      } else {
        // Visualização mensal
        const ano = mesCalendario.getFullYear();
        const mes = mesCalendario.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        startDate = toLocalYYYYMMDD(primeiroDia);
        endDate = toLocalYYYYMMDD(ultimoDia);
      }

      const sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
        activeOnly: true,
      });

      setSessoesCalendario(sessions);
    } catch (error) {
      console.error('Erro ao carregar sessões do calendário:', error);
    }
  }, [pacienteIdFromQuery, user, paciente, visualizacaoCalendario, semanaCalendario, mesCalendario]);

  const loadHistorico = useCallback(async () => {
    // Usar userId do paciente se disponível (sessões são criadas com userId)
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;

    setLoadingHistorico(true);
    setHistoricoExerciseStatusMap({});
    try {
      console.log('[loadHistorico] Buscando sessões para patientId:', patientId);
      const hoje = new Date();
      const umAnoAtras = new Date(hoje);
      umAnoAtras.setDate(umAnoAtras.getDate() - 365);
      const startDate = umAnoAtras.toISOString().split('T')[0];
      const endDate = hoje.toISOString().split('T')[0];

      const sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
      });

      setHistoricoSessions(sessions);
      const sessionStatusMap: Record<string, boolean> = {};
      await Promise.all(
        sessions.map(async (session) => {
          if (!session.id) return;
          if (session.status === 'done' || session.status === 'skipped') {
            sessionStatusMap[session.id] = true;
            return;
          }
          try {
            const exercises = await trainingSessionService.getSessionExercises(session.id);
            sessionStatusMap[session.id] = exercises.some(
              (exercise) => exercise.status === 'done' || exercise.status === 'skipped'
            );
          } catch {
            sessionStatusMap[session.id] = false;
          }
        })
      );
      setHistoricoExerciseStatusMap(sessionStatusMap);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  }, [pacienteIdFromQuery, user, paciente]);

  const loadSavedSessionsCriar = useCallback(async () => {
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;

    setLoadingSavedSessionsCriar(true);
    try {
      const hoje = new Date();
      const umAnoAtras = new Date(hoje);
      umAnoAtras.setDate(umAnoAtras.getDate() - 365);
      const umAnoFrente = new Date(hoje);
      umAnoFrente.setDate(umAnoFrente.getDate() + 365);
      const startDate = umAnoAtras.toISOString().split('T')[0];
      const endDate = umAnoFrente.toISOString().split('T')[0];

      const sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
      });

      setSavedSessionsCriar(sessions);
    } catch (error) {
      console.error('Erro ao carregar treinos salvos:', error);
    } finally {
      setLoadingSavedSessionsCriar(false);
    }
  }, [pacienteIdFromQuery, user, paciente]);

  const loadReminderPrefs = useCallback(async () => {
    // Usar userId do paciente se disponível (preferências são salvas com userId)
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;
    try {
      console.log('[loadReminderPrefs] Buscando preferências para patientId:', patientId);
      const prefs = await trainingSessionService.getReminderPrefs(patientId);
      setReminderPrefs(prefs);
    } catch (error) {
      console.error('Erro ao carregar preferências de lembrete:', error);
    }
  }, [pacienteIdFromQuery, user, paciente]);

  const loadTodaySession = useCallback(async () => {
    // Usar userId do paciente se disponível (sessões são criadas com userId)
    // Caso contrário, usar pacienteIdFromQuery ou user.uid
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;

    const dateStr = selectedHojeDate || toLocalYYYYMMDD(new Date());
    
    setLoadingToday(true);
    try {
      console.log('[loadTodaySession] Buscando sessões para patientId:', patientId, 'date:', dateStr);
      const sessions = await trainingSessionService.getSessionsForDate(patientId, dateStr);
      console.log('[loadTodaySession] Sessões encontradas com userId completo:', sessions.length);
      if (sessions.length > 0) {
        setTodaySessions(sessions);
        const firstSession = sessions[0];
        setSelectedTodaySessionId(firstSession.id || null);
        setPatientNotes(firstSession.patientNotes || '');
        if (firstSession.id) {
          const exercises = await trainingSessionService.getSessionExercises(firstSession.id);
          setTodayExercises(withResolvedGifUrls(exercises));
        } else {
          setTodayExercises([]);
        }
      } else {
        setTodaySessions([]);
        setSelectedTodaySessionId(null);
        setTodayExercises([]);
        setPatientNotes('');
      }
    } catch (error) {
      console.error('Erro ao carregar sessão do dia:', error);
      setTodaySessions([]);
      setSelectedTodaySessionId(null);
      setTodayExercises([]);
      setPatientNotes('');
    } finally {
      setLoadingToday(false);
    }
  }, [pacienteIdFromQuery, user, paciente, selectedHojeDate]);

  const loadWeekSessionMarkers = useCallback(async () => {
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;

    const week = getCurrentWeekDates();
    const startDate = toLocalYYYYMMDD(week[0]);
    const endDate = toLocalYYYYMMDD(week[6]);

    try {
      const sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
        activeOnly: true,
      });
      setWeekDatesWithSessions(new Set(sessions.map((s) => s.scheduledDate).filter(Boolean)));

      const byDate = new Map<string, TrainingSession[]>();
      for (const session of sessions) {
        if (!session.scheduledDate) continue;
        const list = byDate.get(session.scheduledDate) ?? [];
        list.push(session);
        byDate.set(session.scheduledDate, list);
      }

      const progressos: Record<string, number> = {};
      await Promise.all(
        [...byDate.entries()].map(async ([dateStr, daySessions]) => {
          let totalExercises = 0;
          let doneExercises = 0;
          for (const session of daySessions) {
            if (!session.id) continue;
            try {
              const exercises = await trainingSessionService.getSessionExercises(session.id);
              totalExercises += exercises.length;
              doneExercises += exercises.filter((ex) => ex.status === 'done').length;
            } catch {
              // Ignorar sessão individual com falha
            }
          }
          progressos[dateStr] =
            totalExercises > 0 ? Math.round((doneExercises / totalExercises) * 100) : 0;
        })
      );
      setWeekProgressByDate(progressos);
    } catch (error) {
      console.error('Erro ao carregar marcadores da semana:', error);
      setWeekDatesWithSessions(new Set());
      setWeekProgressByDate({});
    }
  }, [pacienteIdFromQuery, user, paciente]);

  // Carregar sessão do dia selecionado ao montar e ao mudar para a tab "Hoje"
  // IMPORTANTE: Aguardar paciente estar carregado em modo personal trainer
  useEffect(() => {
    if (activeTab !== 'hoje') return;
    
    // Em modo personal trainer, aguardar paciente estar carregado
    if (isPersonalTrainerMode && !paciente) {
      console.log('[useEffect] Aguardando paciente carregar antes de buscar treinos do dia...');
      return;
    }
    
    loadTodaySession();
  }, [activeTab, loadTodaySession, isPersonalTrainerMode, paciente]);

  // Marcadores Seg–Dom: quais dias da semana atual têm treino
  useEffect(() => {
    if (isPersonalTrainerMode && !paciente) return;
    if (!paciente?.userId && !pacienteIdFromQuery && !user?.uid) return;
    loadWeekSessionMarkers();
  }, [loadWeekSessionMarkers, isPersonalTrainerMode, paciente, pacienteIdFromQuery, user]);

  // Recarregar treinos quando o paciente for carregado (importante para modo personal trainer)
  useEffect(() => {
    if (!paciente) {
      console.log('[useEffect] Paciente ainda não carregado');
      return;
    }
    
    console.log('[useEffect] Paciente carregado, recarregando treinos:', {
      nome: paciente.nome,
      userId: paciente.userId,
      id: paciente.id,
      pacienteIdFromQuery,
      activeTab
    });
    
    // Recarregar sessão de hoje se estiver na tab "Hoje"
    if (activeTab === 'hoje') {
      console.log('[useEffect] Recarregando sessão de hoje com userId:', paciente.userId);
      loadTodaySession();
    }
    // Recarregar calendário se estiver na tab "Cronograma"
    if (activeTab === 'cronograma') {
      console.log('[useEffect] Recarregando calendário com userId:', paciente.userId);
      loadCalendarSessions();
    }
    // Recarregar histórico se estiver na tab "Histórico"
    if (activeTab === 'historico') {
      console.log('[useEffect] Recarregando histórico com userId:', paciente.userId);
      loadHistorico();
    }
  }, [paciente, activeTab, loadTodaySession, loadCalendarSessions, loadHistorico, pacienteIdFromQuery]);

  // Quando embedded com pacienteProp, usar o paciente passado (não carregar)
  useEffect(() => {
    if (pacienteProp) {
      setPaciente(pacienteProp);
    }
  }, [pacienteProp]);

  // Carregar paciente quando pacienteIdFromQuery ou user mudarem (não quando embedded com pacienteProp)
  useEffect(() => {
    if (pacienteProp) return; // Modo embedded: usar paciente passado
    if (!pacienteIdFromQuery && !user) return;
    loadPaciente();
  }, [pacienteIdFromQuery, user, isPersonalTrainerMode, loadPaciente, pacienteProp]);

  // Modo Personal Trainer: carregar médico do aluno para o menu superior
  useEffect(() => {
    if (!isPersonalTrainerMode) {
      setMedicoResponsavel(null);
      return;
    }
    if (!paciente) return;

    if (paciente.medicoResponsavelId) {
      MedicoService.getMedicoById(paciente.medicoResponsavelId)
        .then(setMedicoResponsavel)
        .catch(() => setMedicoResponsavel(null));
    } else {
      setMedicoResponsavel(null);
    }
  }, [isPersonalTrainerMode, paciente?.id, paciente?.medicoResponsavelId]);

  // Modo cliente: carregar personal vinculado + avaliação (header do app fullscreen)
  useEffect(() => {
    if (isPersonalTrainerMode || isProfessionalEmbed || embedded) {
      setPersonalVinculado(null);
      setAgregadoPersonalVinculado(null);
      return;
    }
    if (!paciente?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const vinculoSnap = await getDocs(
          query(
            collection(db, COL_PACIENTE_PERSONAL_TRAINER),
            where('pacienteId', '==', paciente.id),
            where('status', '==', 'ativo')
          )
        );
        if (cancelled) return;
        if (vinculoSnap.empty) {
          setPersonalVinculado(null);
          setAgregadoPersonalVinculado(null);
          return;
        }
        const personalTrainerId = String(vinculoSnap.docs[0].data().personalTrainerId || '');
        if (!personalTrainerId) {
          setPersonalVinculado(null);
          setAgregadoPersonalVinculado(null);
          return;
        }
        const personal = await PersonalTrainerService.getPersonalTrainerByUserId(personalTrainerId);
        if (cancelled) return;
        if (!personal) {
          setPersonalVinculado(null);
          setAgregadoPersonalVinculado(null);
          return;
        }
        const id = personal.id || personal.userId || personalTrainerId;
        setPersonalVinculado({
          id,
          nome: personal.nome || 'Personal',
          isVerificado: personal.isVerificado,
          fotoPerfilUrl: personal.fotoPerfilUrl,
          instagramUsuario: personal.instagramUsuario,
          telefone: personal.telefone,
          telefoneDdi: personal.telefoneDdi,
          registroNumero: personal.registroNumero,
          cidades: personal.cidades,
          nomeLocal: personal.nomeLocal,
          endereco: personal.endereco,
          numero: personal.numero,
        });
        const agregado = await ClassificacaoProfissionalService.getAgregado('personal', id);
        if (!cancelled) setAgregadoPersonalVinculado(agregado);
      } catch (error) {
        console.error('Erro ao carregar personal vinculado:', error);
        if (!cancelled) {
          setPersonalVinculado(null);
          setAgregadoPersonalVinculado(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPersonalTrainerMode, isProfessionalEmbed, embedded, paciente?.id]);

  useEffect(() => {
    const needsLinkedLibrary =
      fromMetaadminEmbedded || professionalReadOnly;
    if (!needsLinkedLibrary) {
      setLibraryPersonalTrainerId(null);
      return;
    }
    const pacienteId = String(paciente?.id || pacienteProp?.id || '').trim();
    if (!pacienteId) {
      setLibraryPersonalTrainerId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const vinculoSnap = await getDocs(
          query(
            collection(db, COL_PACIENTE_PERSONAL_TRAINER),
            where('pacienteId', '==', pacienteId),
            where('status', '==', 'ativo')
          )
        );
        if (cancelled) return;
        const personalTrainerId = String(vinculoSnap.docs[0]?.data()?.personalTrainerId || '').trim();
        setLibraryPersonalTrainerId(personalTrainerId || null);
      } catch (error) {
        console.error('Erro ao carregar personal da biblioteca:', error);
        if (!cancelled) setLibraryPersonalTrainerId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    fromMetaadminEmbedded,
    professionalReadOnly,
    paciente?.id,
    pacienteProp?.id,
  ]);

  // Carregar sessões do calendário
  useEffect(() => {
    if (activeTab !== 'cronograma') return;
    
    // Em modo personal trainer, aguardar paciente estar carregado
    if (isPersonalTrainerMode && !paciente) {
      console.log('[useEffect] Aguardando paciente carregar antes de buscar calendário...');
      return;
    }
    
    loadCalendarSessions();
    if (paciente) {
      loadAplicacoesCalendario();
      loadInjetaveisCalendario();
      loadPagamentosCalendario();
    }
  }, [activeTab, mesCalendario, semanaCalendario, visualizacaoCalendario, paciente, loadCalendarSessions, isPersonalTrainerMode]);

  // Carregar histórico
  useEffect(() => {
    if (activeTab !== 'historico') return;
    loadHistorico();
  }, [activeTab, loadHistorico]);

  // Carregar preferências de lembrete
  useEffect(() => {
    if (activeTab !== 'config') return;
    loadReminderPrefs();
  }, [activeTab, loadReminderPrefs]);

  // Carregar filtros para Criar Treino
  useEffect(() => {
    const patientId = pacienteIdFromQuery || user?.uid || null;
    if (!patientId || activeTab !== 'criar') return;
    loadFilters();
    loadSavedSessionsCriar();
  }, [pacienteIdFromQuery, user, activeTab, loadSavedSessionsCriar]);

  // Buscar exercícios quando filtros mudarem
  useEffect(() => {
    if (!user || activeTab !== 'criar') return;
    const timeoutId = setTimeout(() => {
      searchExercises();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTarget, selectedEquipment, selectedBodyPart]);
  useEffect(() => {
    if (activeTab !== 'criar') return;
    if (!selectedBodyPart) {
      setBodyPartCatalogExercises([]);
      return;
    }
    let cancelled = false;
    const loadBodyPartCatalog = async () => {
      try {
        const res = await fetch(
          `/api/exercisedb/byBodyPart?bodyPart=${encodeURIComponent(selectedBodyPart)}&page=1&limit=${EXERCISE_FETCH_LIMIT}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setBodyPartCatalogExercises(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) setBodyPartCatalogExercises([]);
      }
    };
    loadBodyPartCatalog();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedBodyPart]);
  useEffect(() => {
    if (!selectedTarget) return;
    const stillAvailable = availableTargetsByBodyPart.some(
      (target) => normFilterValue(target) === normFilterValue(selectedTarget)
    );
    if (!stillAvailable) {
      setSelectedTarget('');
      setSelectedEquipment('');
    }
  }, [availableTargetsByBodyPart, selectedTarget, normFilterValue]);
  useEffect(() => {
    if (!selectedEquipment) return;
    const stillAvailable = availableEquipmentsByFilters.some(
      (equipment) => normFilterValue(equipment) === normFilterValue(selectedEquipment)
    );
    if (!stillAvailable) {
      setSelectedEquipment('');
    }
  }, [availableEquipmentsByFilters, selectedEquipment, normFilterValue]);

  // Carregar exercícios quando selecionar uma sessão diferente
  const handleSelectTodaySession = async (sessionId: string) => {
    setSelectedTodaySessionId(sessionId);
    const session = todaySessions.find((s) => s.id === sessionId);
    if (session) {
      setPatientNotes(session.patientNotes || '');
      const exercises = await trainingSessionService.getSessionExercises(sessionId);
      setTodayExercises(withResolvedGifUrls(exercises));
    }
  };

  const loadAplicacoesCalendario = () => {
    if (!paciente?.planoTerapeutico) {
      setAplicacoesCalendario([]);
      return;
    }

    const planoTerapeutico = paciente.planoTerapeutico;
    if (!planoTerapeutico.startDate || !planoTerapeutico.injectionDayOfWeek) {
      setAplicacoesCalendario([]);
      return;
    }

    const diasSemana: { [key: string]: number } = {
      dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
    };

    const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
    const startDateValue = planoTerapeutico.startDate;
    const primeiraDose = startDateValue instanceof Date 
      ? new Date(startDateValue)
      : new Date(startDateValue as any);
    primeiraDose.setHours(0, 0, 0, 0);
    
    while (primeiraDose.getDay() !== diaDesejado) {
      primeiraDose.setDate(primeiraDose.getDate() + 1);
    }

    const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
    const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
    const evolucao = paciente.evolucaoSeguimento || [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const aplicacoes: Array<{ data: Date; semana: number; dose: number; status: string }> = [];
    
    // Determinar período baseado na visualização
    let dataInicio: Date;
    let dataFim: Date;
    
    if (visualizacaoCalendario === 'semana') {
      dataInicio = new Date(semanaCalendario);
      dataInicio.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
      dataInicio.setHours(0, 0, 0, 0);
      
      dataFim = new Date(dataInicio);
      dataFim.setDate(dataInicio.getDate() + 6);
      dataFim.setHours(23, 59, 59, 999);
    } else {
      const ano = mesCalendario.getFullYear();
      const mes = mesCalendario.getMonth();
      dataInicio = new Date(ano, mes, 1);
      dataFim = new Date(ano, mes + 1, 0);
      dataFim.setHours(23, 59, 59, 999);
    }
    
    for (let semana = 0; semana < numeroSemanas; semana++) {
      const semanaNum = semana + 1;
      if (semanasCanceladas.includes(semanaNum)) continue;

      const dataDose = new Date(primeiraDose);
      dataDose.setDate(primeiraDose.getDate() + (semana * 7));

      if (dataDose >= dataInicio && dataDose <= dataFim) {
        const registro = evolucao.find((e: any) => {
          if (!e.dataRegistro) return false;
          const dataReg = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro);
          dataReg.setHours(0, 0, 0, 0);
          const diff = Math.abs((dataReg.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
          return diff <= 1;
        });

        let status = 'futura';
        if (dataDose.getTime() === hoje.getTime()) {
          status = 'hoje';
        } else if (dataDose < hoje) {
          status = registro ? 'tomada' : 'perdida';
        }

        const dose = registro?.doseAplicada?.quantidade || planoTerapeutico.currentDoseMg || 2.5;
        aplicacoes.push({ data: dataDose, semana: semanaNum, dose, status });
      }
    }

    setAplicacoesCalendario(aplicacoes);
  };

  const loadInjetaveisCalendario = () => {
    if (!paciente?.planoTerapeutico?.injetaveisAplicacoes?.length) {
      setInjetaveisCalendario([]);
      return;
    }

    let dataInicio: Date;
    let dataFim: Date;

    if (visualizacaoCalendario === 'semana') {
      dataInicio = new Date(semanaCalendario);
      dataInicio.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
      dataInicio.setHours(0, 0, 0, 0);

      dataFim = new Date(dataInicio);
      dataFim.setDate(dataInicio.getDate() + 6);
      dataFim.setHours(23, 59, 59, 999);
    } else {
      const ano = mesCalendario.getFullYear();
      const mes = mesCalendario.getMonth();
      dataInicio = new Date(ano, mes, 1);
      dataFim = new Date(ano, mes + 1, 0);
      dataFim.setHours(23, 59, 59, 999);
    }

    const items = listarInjetaveisPlanejadosNoPeriodo(paciente, dataInicio, dataFim).map((item) => ({
      data: item.data,
      protocoloNome: item.protocoloNome,
      semana: item.semana,
      observacao: item.observacao,
      realizado: item.realizado,
      aplicacaoId: item.aplicacaoId,
    }));
    setInjetaveisCalendario(items);
  };

  const loadPagamentosCalendario = async () => {
    if (!user || !paciente?.id) return;
    try {
      const { query, collection, where, getDocs } = await import('firebase/firestore');
      
      // Determinar período baseado na visualização
      let dataInicio: Date;
      let dataFim: Date;
      
      if (visualizacaoCalendario === 'semana') {
        dataInicio = new Date(semanaCalendario);
        dataInicio.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
        dataInicio.setHours(0, 0, 0, 0);
        
        dataFim = new Date(dataInicio);
        dataFim.setDate(dataInicio.getDate() + 6);
        dataFim.setHours(23, 59, 59, 999);
      } else {
        const ano = mesCalendario.getFullYear();
        const mes = mesCalendario.getMonth();
        dataInicio = new Date(ano, mes, 1);
        dataFim = new Date(ano, mes + 1, 0);
        dataFim.setHours(23, 59, 59, 999);
      }

      const pagamentos: Array<{ data: Date; tipo: 'nutri' | 'personal'; valor: number; parcela?: number }> = [];

      // Buscar pagamentos com nutricionista (onde pacienteId == paciente.id)
      try {
        const nutriQuery = query(
          collection(db, 'pagamentos_nutricionista_paciente'),
          where('pacienteId', '==', paciente.id)
        );
        const nutriSnap = await getDocs(nutriQuery);
        nutriSnap.forEach((doc) => {
          const data = doc.data();
          if (data.parcelas && Array.isArray(data.parcelas)) {
            data.parcelas.forEach((parcela: any) => {
              if (parcela.dataVencimento) {
                const dataVenc = parcela.dataVencimento?.toDate 
                  ? parcela.dataVencimento.toDate() 
                  : new Date(parcela.dataVencimento);
                if (dataVenc >= dataInicio && dataVenc <= dataFim) {
                  pagamentos.push({
                    data: dataVenc,
                    tipo: 'nutri',
                    valor: parcela.valor || 0,
                    parcela: parcela.numero,
                  });
                }
              }
            });
          }
        });
      } catch (e) {
        // Pode não ter nutricionista vinculado ou não ter pagamentos
        console.log('Sem pagamentos de nutricionista:', e);
      }

      // Buscar pagamentos com personal trainer (onde pacienteId == paciente.id)
      try {
        const personalQuery = query(
          collection(db, 'pagamentos_personal_trainer_paciente'),
          where('pacienteId', '==', paciente.id)
        );
        const personalSnap = await getDocs(personalQuery);
        personalSnap.forEach((doc) => {
          const data = doc.data();
          if (data.parcelas && Array.isArray(data.parcelas)) {
            data.parcelas.forEach((parcela: any) => {
              if (parcela.dataVencimento) {
                const dataVenc = parcela.dataVencimento?.toDate 
                  ? parcela.dataVencimento.toDate() 
                  : new Date(parcela.dataVencimento);
                if (dataVenc >= dataInicio && dataVenc <= dataFim) {
                  pagamentos.push({
                    data: dataVenc,
                    tipo: 'personal',
                    valor: parcela.valor || 0,
                    parcela: parcela.numero,
                  });
                }
              }
            });
          }
        });
      } catch (e) {
        // Pode não ter personal trainer vinculado ou não ter pagamentos
        console.log('Sem pagamentos de personal trainer:', e);
      }

      setPagamentosCalendario(pagamentos);
    } catch (error) {
      console.error('Erro ao carregar pagamentos do calendário:', error);
    }
  };

  const loadFilters = async () => {
    try {
      const [targetsRes, equipmentsRes, bodyPartsRes] = await Promise.all([
        fetch('/api/exercisedb/targets').then((r) => r.json()),
        fetch('/api/exercisedb/equipments').then((r) => r.json()),
        fetch('/api/exercisedb/bodyparts').then((r) => r.json()),
      ]);
      setTargets(targetsRes);
      setEquipments(equipmentsRes);
      setBodyParts(bodyPartsRes);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  };

  const searchExercises = async () => {
    setLoadingExercises(true);
    try {
      // Busca base + refinamento local: garante que os 3 filtros funcionem juntos.
      let url = '/api/exercises?limit=20';
      if (searchQuery.trim()) {
        url = `/api/exercisedb/search?name=${encodeURIComponent(searchQuery.trim())}&page=1&limit=${EXERCISE_FETCH_LIMIT}`;
      } else if (selectedBodyPart) {
        url = `/api/exercisedb/byBodyPart?bodyPart=${encodeURIComponent(selectedBodyPart)}&page=1&limit=${EXERCISE_FETCH_LIMIT}`;
      } else if (selectedTarget) {
        url = `/api/exercisedb/byTarget?target=${encodeURIComponent(selectedTarget)}&page=1&limit=${EXERCISE_FETCH_LIMIT}`;
      } else if (selectedEquipment) {
        url = `/api/exercisedb/byEquipment?equipment=${encodeURIComponent(selectedEquipment)}&page=1&limit=${EXERCISE_FETCH_LIMIT}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const exercises = Array.isArray(data) ? data : [];
        // A API não retorna gifUrl diretamente, então construímos a URL
        const normalizedExercises = exercises.map((ex: any) => ({
          ...ex,
          gifUrl: getExerciseGifUrl(ex.id, EXERCISE_GIF_RESOLUTION),
        }));
        const queryNorm = normFilterValue(searchQuery);
        const filteredExercises = normalizedExercises.filter((ex: any) => {
          if (selectedBodyPart && normFilterValue(ex.bodyPart) !== normFilterValue(selectedBodyPart)) return false;
          if (selectedTarget && normFilterValue(ex.target) !== normFilterValue(selectedTarget)) return false;
          if (selectedEquipment && normFilterValue(ex.equipment) !== normFilterValue(selectedEquipment)) return false;
          if (queryNorm && !normFilterValue(ex.name).includes(queryNorm)) return false;
          return true;
        });
        setExercisesResults(filteredExercises);
      }
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleMarkExercise = async (exerciseId: string, status: 'done' | 'skipped' | null) => {
    if (!selectedTodaySessionId) return;
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem registrar a execução.');
      return;
    }

    setSavingStatus(true);
    try {
      if (status === null) {
        const exerciseRef = doc(db, 'trainingSessions', selectedTodaySessionId, 'exercises', exerciseId);
        await updateDoc(exerciseRef, {
          status: deleteField(),
          completedAt: deleteField(),
        });
      } else {
        await trainingSessionService.markExercise(selectedTodaySessionId, exerciseId, status);
      }

      // Atualização otimista: altera só o exercício no estado, sem recarregar a lista.
      // Mantém o scroll e evita "refresh" da página.
      const now = new Date().toISOString();
      setTodayExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                status: status ?? undefined,
                completedAt: status ? now : undefined,
              }
            : ex
        )
      );
    } catch (error) {
      console.error('Erro ao marcar exercício:', error);
      alert('Erro ao salvar. Tente novamente.');
      await loadTodaySession();
    } finally {
      setSavingStatus(false);
    }
  };

  const handleMarkCalendarExercise = async (sessionId: string, exerciseId: string, status: 'done' | 'skipped' | null) => {
    if (blockProfessionalMutations) return;
    setSavingStatus(true);
    try {
      if (status === null) {
        const exerciseRef = doc(db, 'trainingSessions', sessionId, 'exercises', exerciseId);
        await updateDoc(exerciseRef, { status: deleteField(), completedAt: deleteField() });
      } else {
        await trainingSessionService.markExercise(sessionId, exerciseId, status);
      }
      const updated = await trainingSessionService.getSessionExercises(sessionId);
      setSelectedSessionExercisesDetail(updated);
    } catch (error) {
      console.error('Erro ao marcar exercício:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  };

  // Calcular progresso diário baseado em exercícios feitos
  const calculateDailyProgress = () => {
    if (todayExercises.length === 0) return { done: 0, skipped: 0, total: 0, percentage: 0 };
    
    const done = todayExercises.filter((ex) => ex.status === 'done').length;
    const skipped = todayExercises.filter((ex) => ex.status === 'skipped').length;
    const total = todayExercises.length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    
    return { done, skipped, total, percentage };
  };

  // ETAPA 0 — Helpers para o redesign da aba Hoje (sem mudar UI ainda)
  const todaySelectedSession = useMemo(() => {
    if (!selectedTodaySessionId || todaySessions.length === 0) return null;
    return todaySessions.find((s) => s.id === selectedTodaySessionId) ?? null;
  }, [selectedTodaySessionId, todaySessions]);

  const progress = useMemo(() => calculateDailyProgress(), [todayExercises]);

  // Mantém a borda laranja do dia selecionado em sync ao marcar exercícios
  useEffect(() => {
    if (!selectedHojeDate) return;
    if (todayExercises.length === 0) return;
    const pct = progress.percentage;
    setWeekProgressByDate((prev) =>
      prev[selectedHojeDate] === pct ? prev : { ...prev, [selectedHojeDate]: pct }
    );
  }, [selectedHojeDate, todayExercises.length, progress.percentage]);

  const nextExercise = useMemo(() => {
    const next = todayExercises.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
    return next ?? null;
  }, [todayExercises]);

  const todayMuscleGroups = useMemo(
    () => muscleGroupsFromSessionExercises(todayExercises, 4),
    [todayExercises]
  );
  const todayMuscleImageUrl = useMemo(() => {
    if (todayMuscleGroups.length === 0) return '';
    return buildMuscleGroupImageUrl({
      muscles: todayMuscleGroups,
      color: '4CCB7A',
      backgroundColor: '0A1F44',
      transparent: true,
      size: 'medium',
    });
  }, [todayMuscleGroups]);
  useEffect(() => {
    setMuscleImageFailed(false);
  }, [todayMuscleImageUrl]);

  // ETAPA 2 cronograma: progresso e próximo exercício da sessão selecionada no calendário
  const selectedProgress = useMemo(() => {
    const list = selectedSessionExercisesDetail;
    if (list.length === 0) return { doneCount: 0, totalCount: 0, percent: 0 };
    const done = list.filter((ex) => ex.status === 'done').length;
    const total = list.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { doneCount: done, totalCount: total, percent };
  }, [selectedSessionExercisesDetail]);
  const selectedNextExercise = useMemo(() => {
    const next = selectedSessionExercisesDetail.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
    return next ?? null;
  }, [selectedSessionExercisesDetail]);

  const historicoProgress = useMemo(() => {
    const list = selectedSessionExercises;
    if (list.length === 0) return { doneCount: 0, totalCount: 0, percent: 0 };
    const done = list.filter((ex) => ex.status === 'done').length;
    const total = list.length;
    return { doneCount: done, totalCount: total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [selectedSessionExercises]);
  const historicoNextExercise = useMemo(() => selectedSessionExercises.find((ex) => ex.status !== 'done' && ex.status !== 'skipped') ?? null, [selectedSessionExercises]);
  const historicoSessionsRealizadas = useMemo(
    () =>
      historicoSessions.filter(
        (session) =>
          session.status === 'done' ||
          session.status === 'skipped' ||
          (session.id ? Boolean(historicoExerciseStatusMap[session.id]) : false)
      ),
    [historicoSessions, historicoExerciseStatusMap]
  );
  const historicoSessionsFiltradas = useMemo(() => {
    const parseSessionDate = (rawDate: string) => {
      const [y, m, d] = rawDate.split('-').map(Number);
      if (!y || !m || !d) return new Date(rawDate);
      return new Date(y, m - 1, d);
    };
    const sameDate = (sessionDate: Date, targetDate: Date) =>
      sessionDate.getFullYear() === targetDate.getFullYear() &&
      sessionDate.getMonth() === targetDate.getMonth() &&
      sessionDate.getDate() === targetDate.getDate();

    const selectedDate = diaHistoricoSelecionado;
    const isInCurrentWeek = (date: Date) => {
      const weekStart = new Date(semanaHistoricoCalendario);
      weekStart.setDate(semanaHistoricoCalendario.getDate() - semanaHistoricoCalendario.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return date >= weekStart && date <= weekEnd;
    };
    const isInCurrentMonth = (date: Date) =>
      date.getFullYear() === mesHistoricoCalendario.getFullYear() &&
      date.getMonth() === mesHistoricoCalendario.getMonth();

    return historicoSessionsRealizadas
      .filter((session) => {
        const sessionDate = parseSessionDate(session.scheduledDate);
        if (selectedDate) return sameDate(sessionDate, selectedDate);
        if (visualizacaoHistoricoCalendario === 'semana') return isInCurrentWeek(sessionDate);
        return isInCurrentMonth(sessionDate);
      })
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  }, [
    historicoSessionsRealizadas,
    diaHistoricoSelecionado,
    visualizacaoHistoricoCalendario,
    semanaHistoricoCalendario,
    mesHistoricoCalendario,
  ]);
  const historicoPeriodoLabel = useMemo(() => {
    if (diaHistoricoSelecionado) {
      return diaHistoricoSelecionado.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
    if (visualizacaoHistoricoCalendario === 'semana') {
      const weekStart = new Date(semanaHistoricoCalendario);
      weekStart.setDate(semanaHistoricoCalendario.getDate() - semanaHistoricoCalendario.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('pt-BR')} - ${weekEnd.toLocaleDateString('pt-BR')}`;
    }
    return mesHistoricoCalendario.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [diaHistoricoSelecionado, visualizacaoHistoricoCalendario, semanaHistoricoCalendario, mesHistoricoCalendario]);
  const savedSessionsCriarGrouped = useMemo(() => {
    const toDateSafe = (value: unknown) => {
      if (value instanceof Date) return value;
      if (typeof value === 'string' || typeof value === 'number') return new Date(value);
      return new Date();
    };
    const statusRank: Record<string, number> = { done: 3, skipped: 2, scheduled: 1 };
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        sessions: TrainingSession[];
        isRecurring: boolean;
      }
    >();

    savedSessionsCriar.forEach((session) => {
      const createdAt = toDateSafe(session.createdAt);
      const createdMinute = Number.isNaN(createdAt.getTime())
        ? 'na'
        : `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')} ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`;
      const recurrenceGroupId = session.recurrenceGroupId;
      const key =
        recurrenceGroupId ||
        `${session.createdById || 'anon'}|${(session.title || '').trim().toLowerCase()}|${createdMinute}`;
      const current = groups.get(key);
      if (!current) {
        groups.set(key, {
          key,
          title: session.title,
          sessions: [session],
          isRecurring: false,
        });
      } else {
        current.sessions.push(session);
      }
    });

    return Array.from(groups.values())
      .map((group) => {
        const sessions = [...group.sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        const count = sessions.length;
        const minDate = sessions[0]?.scheduledDate;
        const maxDate = sessions[count - 1]?.scheduledDate;
        const dateLabel =
          count > 1 && minDate && maxDate
            ? `${new Date(minDate).toLocaleDateString('pt-BR')} - ${new Date(maxDate).toLocaleDateString('pt-BR')}`
            : minDate
            ? new Date(minDate).toLocaleDateString('pt-BR')
            : 'Sem data';
        const strongestStatus = sessions
          .map((session) => session.status)
          .sort((a, b) => (statusRank[b] || 0) - (statusRank[a] || 0))[0] ?? 'scheduled';
        return {
          ...group,
          sessions,
          count,
          isRecurring: count > 1,
          dateLabel,
          status: strongestStatus,
          active: sessions.some(isTrainingSessionActive),
        };
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        const aDate = a.sessions[a.sessions.length - 1]?.scheduledDate || '';
        const bDate = b.sessions[b.sessions.length - 1]?.scheduledDate || '';
        return bDate.localeCompare(aDate);
      });
  }, [savedSessionsCriar]);

  const runExercisesList = useMemo(() => {
    if (!activeRunSession) return [];
    return activeRunSession.id === selectedTodaySessionId ? todayExercises : selectedSessionExercisesDetail;
  }, [activeRunSession, selectedTodaySessionId, todayExercises, selectedSessionExercisesDetail]);
  const currentRunExercise = useMemo(() => runExercisesList.find((ex) => ex.id === activeRunExerciseId) ?? null, [runExercisesList, activeRunExerciseId]);
  const hostRunQueue = useMemo(
    () => (currentRunExercise ? buildHostRunQueueForExercise(currentRunExercise) : []),
    [currentRunExercise]
  );
  const currentHostStep = useMemo(
    () => getHostQueuePendingStep(hostRunQueue, runExecution, runIntercalationExecutions),
    [hostRunQueue, runExecution, runIntercalationExecutions]
  );
  const currentIntercalation = useMemo(() => {
    if (currentHostStep?.kind !== 'intercalated' || !currentRunExercise) return null;
    return (
      (currentRunExercise.prescription?.intercalations || []).find(
        (item) => item.id === currentHostStep.intercalationId
      ) ?? null
    );
  }, [currentHostStep, currentRunExercise]);
  const runDisplayExercise = currentIntercalation
    ? {
        name: currentIntercalation.name,
        gifUrl: currentIntercalation.gifUrl,
        exerciseId: currentIntercalation.exerciseId,
        target: currentIntercalation.target,
        bodyPart: currentIntercalation.bodyPart,
        equipment: currentIntercalation.equipment,
        trainerNote: currentIntercalation.trainerNote,
        id: currentIntercalation.id,
      }
    : currentRunExercise;
  const runTrainerNote =
    currentIntercalation?.trainerNote ||
    (runExecution && currentRunExercise && runExecution.exerciseDocId === currentRunExercise.id
      ? runExecution.prescribedTrainerNote
      : undefined) ||
    currentRunExercise?.trainerNote;
  const gymMediaPatientUserId =
    String(paciente?.userId || (!isPersonalTrainerMode ? user?.uid : '') || '').trim();
  const gymMediaPacienteId = String(paciente?.id || pacienteIdFromQuery || user?.uid || '').trim();
  const gymMediaExerciseId = String(
    runDisplayExercise?.exerciseId || currentRunExercise?.exerciseId || ''
  ).trim();

  useEffect(() => {
    if (!isWorkoutRunning || !gymMediaPatientUserId || !gymMediaExerciseId) {
      setRunGymMedia(null);
      return;
    }
    return exerciseGymMediaService.subscribe(
      gymMediaPatientUserId,
      gymMediaExerciseId,
      setRunGymMedia
    );
  }, [isWorkoutRunning, gymMediaPatientUserId, gymMediaExerciseId]);

  const handleGymMediaFile = useCallback(
    async (file: File) => {
      if (blockProfessionalMutations || !gymMediaPacienteId || !gymMediaExerciseId) return;
      setGymMediaUploading(true);
      setGymMediaError(null);
      try {
        const media = await uploadExerciseGymMediaClient({
          file,
          pacienteId: gymMediaPacienteId,
          exerciseId: gymMediaExerciseId,
        });
        setRunGymMedia(media);
      } catch (error) {
        setGymMediaError(
          error instanceof Error ? error.message : 'Não foi possível salvar a foto real.'
        );
      } finally {
        setGymMediaUploading(false);
      }
    },
    [blockProfessionalMutations, gymMediaExerciseId, gymMediaPacienteId]
  );

  const handleGymMediaRemove = useCallback(async () => {
    if (blockProfessionalMutations || !gymMediaPacienteId || !gymMediaExerciseId) return;
    setGymMediaError(null);
    try {
      await deleteExerciseGymMediaClient({
        pacienteId: gymMediaPacienteId,
        exerciseId: gymMediaExerciseId,
      });
      setRunGymMedia(null);
    } catch (error) {
      setGymMediaError(
        error instanceof Error ? error.message : 'Não foi possível remover a foto real.'
      );
      throw error;
    }
  }, [blockProfessionalMutations, gymMediaExerciseId, gymMediaPacienteId]);
  const hostRunVisualSteps = useMemo(() => {
    return hostRunQueue.map((step) => {
      const execution = stepExecution(step, runExecution, runIntercalationExecutions);
      const series = execution?.series.find((item) => item.seriesId === step.seriesId);
      return {
        key: step.kind === 'main' ? `main-${step.seriesId}` : `int-${step.intercalationId}`,
        label: step.kind === 'main' ? `S${step.seriesOrder}` : `⇄${step.labelOrder}`,
        status: (series?.status ?? 'pending') as 'pending' | 'done' | 'skipped',
        isCurrent: currentHostStep === step,
        accent: step.kind === 'intercalated',
      };
    });
  }, [hostRunQueue, runExecution, runIntercalationExecutions, currentHostStep]);

  // Detalhes ricos: só busca quando o paciente abre "Detalhes"
  useEffect(() => {
    if (!runDetailsSheetOpen || !currentRunExercise?.exerciseId) return;
    const exerciseId = currentRunExercise.exerciseId;
    const cached = runExerciseDetailsCacheRef.current.get(exerciseId);
    if (cached) {
      setRunExerciseDetails(cached);
      return;
    }
    let cancelled = false;
    setLoadingRunDetails(true);
    setRunExerciseDetails(null);
    (async () => {
      try {
        const res = await fetch(`/api/exercisedb/exercise?id=${encodeURIComponent(exerciseId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as Exercise;
        if (cancelled || !data?.id) return;
        runExerciseDetailsCacheRef.current.set(exerciseId, data);
        setRunExerciseDetails(data);
      } catch {
        // silencioso
      } finally {
        if (!cancelled) setLoadingRunDetails(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runDetailsSheetOpen, currentRunExercise?.exerciseId]);

  // Traduz descrição/instruções para PT quando os detalhes EN chegam
  useEffect(() => {
    if (!runDetailsSheetOpen || !runExerciseDetails?.id) return;
    const exerciseId = runExerciseDetails.id;
    const cached = runDetailsTranslateCacheRef.current.get(exerciseId);
    if (cached) {
      setRunDetailsTranslated(cached);
      return;
    }
    const description = runExerciseDetails.description?.trim() || '';
    const instructions = (runExerciseDetails.instructions || []).filter((s) => s.trim());
    if (!description && instructions.length === 0) {
      setRunDetailsTranslated({ descriptionPt: null, instructionsPt: [] });
      return;
    }
    let cancelled = false;
    setLoadingRunDetailsTranslate(true);
    setRunDetailsTranslated(null);
    (async () => {
      try {
        const res = await fetch('/api/exercisedb/translate-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, instructions }),
        });
        if (!res.ok) throw new Error('translate failed');
        const data = (await res.json()) as {
          descriptionPt?: string | null;
          instructionsPt?: string[];
        };
        if (cancelled) return;
        const payload = {
          descriptionPt: data.descriptionPt || null,
          instructionsPt: Array.isArray(data.instructionsPt) ? data.instructionsPt : [],
        };
        runDetailsTranslateCacheRef.current.set(exerciseId, payload);
        setRunDetailsTranslated(payload);
      } catch {
        if (cancelled) return;
        // Fallback: mostra original se a tradução falhar
        const fallback = {
          descriptionPt: description || null,
          instructionsPt: instructions,
        };
        setRunDetailsTranslated(fallback);
      } finally {
        if (!cancelled) setLoadingRunDetailsTranslate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runDetailsSheetOpen, runExerciseDetails?.id, runExerciseDetails?.description, runExerciseDetails?.instructions]);

  // Ao trocar de exercício no carrossel, fecha o sheet de detalhes
  useEffect(() => {
    setRunDetailsSheetOpen(false);
    setRunNotesSheetOpen(false);
    setRunGymMediaSheetOpen(false);
    setRunDetailsTranslated(null);
    setGymMediaError(null);
    setShowRunGymMediaPreview(false);
  }, [activeRunExerciseId, gymMediaExerciseId]);

  // Personal (metapersonal) executa junto com o paciente; médico/nutri no embed ficam só leitura.
  const runExecutionReadOnly = blockProfessionalMutations;

  useEffect(() => {
    if (!isWorkoutRunning || !activeRunSession?.id || !currentRunExercise?.id) {
      setRunExecution(null);
      setRunIntercalationExecutions({});
      setLoadingRunExecution(false);
      setRunExecutionError(false);
      return;
    }
    const sessionId = activeRunSession.id;
    const exercise = currentRunExercise;
    const exerciseDocId = String(exercise.id || '').trim();
    const occurrences = exercise.prescription?.intercalations || [];
    let cancelled = false;
    setRunExecution(null);
    setRunIntercalationExecutions({});
    setRunExecutionError(false);
    setLoadingRunExecution(true);
    (async () => {
      try {
        let execution: TrainingExerciseExecution | null = null;
        if (runExecutionReadOnly) {
          execution = await TrainingExerciseExecutionService.get(sessionId, exerciseDocId);
          if (!execution) {
            execution = createExerciseExecutionFromPrescription({
              exerciseDocId,
              exerciseId: exercise.exerciseId,
              prescription: exercise.prescription,
              trainerNote: exercise.trainerNote,
            });
          }
        } else {
          execution = await TrainingExerciseExecutionService.getOrCreate(sessionId, exercise);
        }
        const intercalations: Record<string, TrainingExerciseExecution> = {};
        for (const occurrence of occurrences) {
          const seed = createIntercalationExecution(occurrence);
          intercalations[occurrence.id] = runExecutionReadOnly
            ? (await TrainingExerciseExecutionService.get(sessionId, occurrence.id)) ?? seed
            : await TrainingExerciseExecutionService.getOrCreateFromSeed(sessionId, seed);
        }
        if (!cancelled) {
          setRunExecution(execution);
          setRunIntercalationExecutions(intercalations);
          setRunExecutionError(false);
        }
      } catch (error) {
        console.error('Erro ao carregar execução do exercício:', error);
        if (!cancelled) {
          setRunExecution(null);
          setRunIntercalationExecutions({});
          setRunExecutionError(true);
        }
      } finally {
        if (!cancelled) setLoadingRunExecution(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isWorkoutRunning,
    activeRunSession?.id,
    currentRunExercise?.id,
    currentRunExercise?.exerciseId,
    runExecutionReadOnly,
  ]);

  useEffect(() => {
    if (!isWorkoutRunning || !activeRunSession?.id) return;
    const sessionId = activeRunSession.id;
    return TrainingExerciseExecutionService.subscribeBySession(sessionId, (items) => {
      if (savingRunSeriesRef.current || persistingPrescriptionRef.current) return;
      const exercise = runExercisesRef.current.find(
        (item) => item.id === activeRunExerciseIdRef.current
      );
      if (!exercise?.id) return;
      const byId = Object.fromEntries(items.map((item) => [item.exerciseDocId, item]));
      const host = byId[exercise.id];
      if (host) setRunExecution(host);
      setRunIntercalationExecutions((prev) => {
        const next = { ...prev };
        for (const occurrence of exercise.prescription?.intercalations || []) {
          if (byId[occurrence.id]) next[occurrence.id] = byId[occurrence.id];
        }
        return next;
      });
    });
  }, [isWorkoutRunning, activeRunSession?.id]);

  useEffect(() => {
    if (!isWorkoutRunning || !activeRunSession?.id) return;
    const sessionId = activeRunSession.id;
    return trainingSessionService.subscribeSessionExercises(sessionId, (exercises) => {
      if (sessionId === selectedTodaySessionId) {
        setTodayExercises(exercises);
        return;
      }
      setSelectedSessionExercisesDetail(exercises);
    });
  }, [isWorkoutRunning, activeRunSession?.id, selectedTodaySessionId]);

  const persistRunExerciseStatus = useCallback(
    async (exerciseDocId: string, status: 'done' | 'skipped') => {
      const sessionId = activeRunSession?.id;
      if (!sessionId) return;
      await trainingSessionService.markExercise(sessionId, exerciseDocId, status);
      const now = new Date().toISOString();
      const patch = (ex: TrainingSessionExercise) =>
        ex.id === exerciseDocId ? { ...ex, status, completedAt: now } : ex;
      if (sessionId === selectedTodaySessionId) {
        setTodayExercises((prev) => prev.map(patch));
      } else {
        setSelectedSessionExercisesDetail((prev) => prev.map(patch));
      }
    },
    [activeRunSession?.id, selectedTodaySessionId]
  );

  const applyLocalExercisePrescription = useCallback((exercise: TrainingSessionExercise) => {
    const exerciseDocId = String(exercise.id || '').trim();
    if (!exerciseDocId) return;
    const apply = (list: TrainingSessionExercise[]) =>
      list.map((item) =>
        item.id === exerciseDocId ? { ...item, prescription: exercise.prescription } : item
      );
    setTodayExercises(apply);
    setSelectedSessionExercisesDetail(apply);
  }, []);

  const persistRunSeriesPrescription = useCallback(
    async (
      patch: SeriesPrescriptionPatch,
      seriesId?: string,
      stepOverride?: HostRunStep | null,
      options?: { skipExecution?: boolean }
    ) => {
      if (!activeRunSession?.id || !currentRunExercise || runExecutionReadOnly) return;
      const queue = buildHostRunQueueForExercise(currentRunExercise);
      const resolvedSeriesId =
        String(seriesId || stepOverride?.seriesId || currentHostStep?.seriesId || '').trim();
      if (!resolvedSeriesId) return;
      const step =
        stepOverride ||
        queue.find((item) => item.seriesId === resolvedSeriesId) ||
        currentHostStep;
      persistingPrescriptionRef.current = true;
      try {
        const currentSaved = await trainingSessionService.updateCurrentSessionSeriesPrescription({
          sessionId: activeRunSession.id,
          exercise: currentRunExercise,
          seriesId: resolvedSeriesId,
          patch,
        });
        if (currentSaved) applyLocalExercisePrescription(currentSaved);

        const skipExecution = options?.skipExecution || savingRunSeriesRef.current;
        const intercalationId = step?.kind === 'intercalated' ? step.intercalationId : null;
        const currentExecution = intercalationId
          ? runIntercalationExecutions[intercalationId] || null
          : runExecution?.series.some((item) => item.seriesId === resolvedSeriesId)
            ? runExecution
            : null;
        if (!skipExecution && currentExecution && !savingRunSeriesRef.current) {
          const latest = await TrainingExerciseExecutionService.get(
            activeRunSession.id,
            currentExecution.exerciseDocId
          );
          const source = latest || currentExecution;
          const nextExecution = updatePendingExecutedSeriesPrescription(
            source,
            resolvedSeriesId,
            {
              prescribedReps: patch.reps,
              prescribedLoadKg: patch.loadKg,
              prescribedRestSec: patch.restSec,
            }
          );
          if (nextExecution && !savingRunSeriesRef.current) {
            if (intercalationId) {
              setRunIntercalationExecutions((prev) => ({
                ...prev,
                [intercalationId]: nextExecution,
              }));
            } else {
              setRunExecution(nextExecution);
            }
            await TrainingExerciseExecutionService.save(activeRunSession.id, nextExecution);
          }
        }

        const target = step ? buildSeriesPrescriptionTarget(currentRunExercise, step) : null;
        if (!target) return;
        const result = await trainingSessionService.propagateSeriesPrescriptionToUpcoming({
          patientId: activeRunSession.patientId,
          currentSessionId: activeRunSession.id,
          currentScheduledDate: activeRunSession.scheduledDate,
          recurrenceGroupId: activeRunSession.recurrenceGroupId,
          target,
          patch,
        });
        if (result.currentExercise) {
          applyLocalExercisePrescription(result.currentExercise);
        }
      } catch (error) {
        console.error('Erro ao gravar prescrição da série:', error);
      } finally {
        persistingPrescriptionRef.current = false;
      }
    },
    [
      activeRunSession,
      applyLocalExercisePrescription,
      currentHostStep,
      currentRunExercise,
      runExecution,
      runExecutionReadOnly,
      runIntercalationExecutions,
    ]
  );

  const handleRunSeriesPrescriptionChange = useCallback(
    (seriesId: string, reps: number, loadKg: number | null, restSec: number) => {
      if (runExecutionReadOnly) return;
      const patch = { reps, loadKg, restSec };
      persistSeriesPrescriptionPendingRef.current = { seriesId, patch };
      if (persistSeriesPrescriptionTimerRef.current) {
        clearTimeout(persistSeriesPrescriptionTimerRef.current);
      }
      persistSeriesPrescriptionTimerRef.current = setTimeout(() => {
        persistSeriesPrescriptionTimerRef.current = null;
        const pending = persistSeriesPrescriptionPendingRef.current;
        persistSeriesPrescriptionPendingRef.current = null;
        if (!pending) return;
        void persistRunSeriesPrescription(pending.patch, pending.seriesId);
      }, 180);
    },
    [persistRunSeriesPrescription, runExecutionReadOnly]
  );

  const advanceRunToNext = useCallback(() => {
    const list = runExercisesRef.current ?? [];
    if (list.length === 0) {
      setActiveRunExerciseId(null);
      return;
    }
    const currentIdx = list.findIndex((ex) => ex.id === activeRunExerciseId);
    const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % list.length;
    setActiveRunExerciseId(list[nextIdx]?.id ?? null);
    setRestSecondsLeft(null);
    setIsRestRunning(false);
  }, [activeRunExerciseId]);

  const selectRunExercise = useCallback((exerciseId: string) => {
    setActiveRunExerciseId(exerciseId);
    setRestSecondsLeft(null);
    setIsRestRunning(false);
  }, []);

  const handleCompleteRunSeries = useCallback(
    async (
      seriesId: string,
      actualReps: number,
      actualLoadKg: number | null,
      actualRestSec = 0
    ) => {
      if (
        !activeRunSession?.id ||
        !currentRunExercise?.id ||
        !runExecution ||
        runExecutionReadOnly ||
        savingRunSeriesRef.current
      ) {
        return;
      }
      const exerciseDocId = currentRunExercise.id;
      const queue = buildHostRunQueueForExercise(currentRunExercise);
      const step = getHostQueuePendingStep(queue, runExecution, runIntercalationExecutions);
      savingRunSeriesRef.current = true;
      setSavingRunSeries(true);
      try {
        let nextHost = runExecution;
        let nextIntercalations = runIntercalationExecutions;
        if (step?.kind === 'intercalated') {
          const occ = (currentRunExercise.prescription?.intercalations || []).find(
            (item) => item.id === step.intercalationId
          );
          const current =
            runIntercalationExecutions[step.intercalationId] ||
            (occ ? createIntercalationExecution(occ) : null);
          if (!current) {
            alert('Exercício intercalado não encontrado.');
            return;
          }
          const result = completeExecutedSeries(current, seriesId, {
            actualReps,
            actualLoadKg,
          });
          if (!result.ok) {
            alert(result.message);
            return;
          }
          await TrainingExerciseExecutionService.save(activeRunSession.id, result.execution);
          nextIntercalations = {
            ...runIntercalationExecutions,
            [step.intercalationId]: result.execution,
          };
          if (activeRunExerciseIdRef.current === exerciseDocId) {
            setRunIntercalationExecutions(nextIntercalations);
          }
        } else {
          const result = completeExecutedSeries(runExecution, seriesId, {
            actualReps,
            actualLoadKg,
          });
          if (!result.ok) {
            alert(result.message);
            return;
          }
          await TrainingExerciseExecutionService.save(activeRunSession.id, result.execution);
          nextHost = result.execution;
          if (activeRunExerciseIdRef.current === exerciseDocId) {
            setRunExecution(result.execution);
          }
        }
        const markStatus = getHostQueueMarkStatus(queue, nextHost, nextIntercalations);
        if (markStatus) {
          await persistRunExerciseStatus(exerciseDocId, markStatus);
        } else if (queue.every((item) => item.kind === 'main')) {
          const mark = getMarkExerciseStatusFromExecution(nextHost);
          if (mark) await persistRunExerciseStatus(exerciseDocId, mark);
        }
        const nextPending = getHostQueuePendingStep(queue, nextHost, nextIntercalations);
        const restSec = Number.isFinite(actualRestSec)
          ? Math.min(600, Math.max(0, Math.round(actualRestSec)))
          : 0;
        if (persistSeriesPrescriptionTimerRef.current) {
          clearTimeout(persistSeriesPrescriptionTimerRef.current);
          persistSeriesPrescriptionTimerRef.current = null;
        }
        persistSeriesPrescriptionPendingRef.current = null;
        if (shouldStartRestTimer(restSec, Boolean(nextPending))) {
          restAdvanceModeRef.current = 'series';
          setRestAdvanceMode('series');
          setRestTotalSec(restSec);
          setRestSecondsLeft(restSec);
          setIsRestRunning(true);
        }
        void persistRunSeriesPrescription(
          { reps: actualReps, loadKg: actualLoadKg, restSec },
          seriesId,
          step,
          { skipExecution: true }
        );
      } catch (error) {
        console.error('Erro ao registrar série:', error);
        alert('Não foi possível registrar esta série. Tente novamente.');
      } finally {
        savingRunSeriesRef.current = false;
        setSavingRunSeries(false);
      }
    },
    [
      activeRunSession?.id,
      currentRunExercise,
      persistRunExerciseStatus,
      persistRunSeriesPrescription,
      runExecution,
      runExecutionReadOnly,
      runIntercalationExecutions,
    ]
  );

  const handleSkipRunSeries = useCallback(
    async (seriesId: string) => {
      if (
        !activeRunSession?.id ||
        !currentRunExercise?.id ||
        !runExecution ||
        runExecutionReadOnly ||
        savingRunSeriesRef.current
      ) {
        return;
      }
      const exerciseDocId = currentRunExercise.id;
      const queue = buildHostRunQueueForExercise(currentRunExercise);
      const step = getHostQueuePendingStep(queue, runExecution, runIntercalationExecutions);
      savingRunSeriesRef.current = true;
      setSavingRunSeries(true);
      try {
        let nextHost = runExecution;
        let nextIntercalations = runIntercalationExecutions;
        if (step?.kind === 'intercalated') {
          const current = runIntercalationExecutions[step.intercalationId];
          if (!current) return;
          const next = skipExecutedSeries(current, seriesId);
          await TrainingExerciseExecutionService.save(activeRunSession.id, next);
          nextIntercalations = { ...runIntercalationExecutions, [step.intercalationId]: next };
          if (activeRunExerciseIdRef.current === exerciseDocId) {
            setRunIntercalationExecutions(nextIntercalations);
          }
        } else {
          const next = skipExecutedSeries(runExecution, seriesId);
          await TrainingExerciseExecutionService.save(activeRunSession.id, next);
          nextHost = next;
          if (activeRunExerciseIdRef.current === exerciseDocId) {
            setRunExecution(next);
          }
        }
        const markStatus = getHostQueueMarkStatus(queue, nextHost, nextIntercalations);
        if (markStatus) {
          await persistRunExerciseStatus(exerciseDocId, markStatus);
        } else if (queue.every((item) => item.kind === 'main')) {
          const mark = getMarkExerciseStatusFromExecution(nextHost);
          if (mark) await persistRunExerciseStatus(exerciseDocId, mark);
        }
      } catch (error) {
        console.error('Erro ao pular série:', error);
        alert('Não foi possível registrar esta série. Tente novamente.');
      } finally {
        savingRunSeriesRef.current = false;
        setSavingRunSeries(false);
      }
    },
    [
      activeRunSession?.id,
      currentRunExercise,
      persistRunExerciseStatus,
      runExecution,
      runExecutionReadOnly,
      runIntercalationExecutions,
    ]
  );

  const handleRedoRunExercise = useCallback(async () => {
    if (
      !activeRunSession?.id ||
      !currentRunExercise?.id ||
      !runExecution ||
      runExecutionReadOnly ||
      savingRunSeriesRef.current
    ) {
      return;
    }
    const exerciseDocId = currentRunExercise.id;
    savingRunSeriesRef.current = true;
    setSavingRunSeries(true);
    try {
      const next = resetHostQueueExecutions(
        runExecution,
        runIntercalationExecutions,
        currentRunExercise.prescription?.intercalations || []
      );
      await TrainingExerciseExecutionService.save(activeRunSession.id, next.host);
      for (const execution of Object.values(next.intercalations)) {
        await TrainingExerciseExecutionService.save(activeRunSession.id, execution);
      }
      await trainingSessionService.unmarkExercise(activeRunSession.id, exerciseDocId);
      const patch = (ex: TrainingSessionExercise) =>
        ex.id === exerciseDocId ? { ...ex, status: undefined, completedAt: undefined } : ex;
      if (activeRunSession.id === selectedTodaySessionId) {
        setTodayExercises((prev) => prev.map(patch));
      } else {
        setSelectedSessionExercisesDetail((prev) => prev.map(patch));
      }
      if (activeRunExerciseIdRef.current === exerciseDocId) {
        setRunExecution(next.host);
        setRunIntercalationExecutions(next.intercalations);
      }
      setRestSecondsLeft(null);
      setIsRestRunning(false);
    } catch (error) {
      console.error('Erro ao refazer exercício:', error);
      alert('Não foi possível refazer este exercício. Tente novamente.');
    } finally {
      savingRunSeriesRef.current = false;
      setSavingRunSeries(false);
    }
  }, [
    activeRunSession?.id,
    currentRunExercise,
    runExecution,
    runExecutionReadOnly,
    runIntercalationExecutions,
    selectedTodaySessionId,
  ]);

  const handleRunPulei = useCallback(async () => {
    if (!activeRunSession?.id || !activeRunExerciseId || runExecutionReadOnly) return;
    const exerciseDocId = activeRunExerciseId;
    setSavingStatus(true);
    try {
      let execution = runExecution;
      if (!execution || execution.exerciseDocId !== exerciseDocId) {
        const exercise = runExercisesList.find((ex) => ex.id === exerciseDocId);
        if (exercise) {
          execution = await TrainingExerciseExecutionService.getOrCreate(
            activeRunSession.id,
            exercise
          );
        }
      }
      if (execution) {
        const exercise = runExercisesList.find((ex) => ex.id === exerciseDocId);
        const queue = exercise ? buildHostRunQueueForExercise(exercise) : [];
        const skipped = skipRemainingHostQueue(queue, execution, runIntercalationExecutions);
        await TrainingExerciseExecutionService.save(activeRunSession.id, skipped.host);
        for (const item of Object.values(skipped.intercalations)) {
          await TrainingExerciseExecutionService.save(activeRunSession.id, item);
        }
        if (activeRunExerciseIdRef.current === exerciseDocId) {
          setRunExecution(skipped.host);
          setRunIntercalationExecutions(skipped.intercalations);
        }
        const markStatus =
          getHostQueueMarkStatus(queue, skipped.host, skipped.intercalations) ?? 'skipped';
        await persistRunExerciseStatus(exerciseDocId, markStatus);
      } else {
        await persistRunExerciseStatus(exerciseDocId, 'skipped');
      }
      setRestSecondsLeft(null);
      setIsRestRunning(false);
    } catch (error) {
      console.error('Erro ao marcar exercício:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  }, [
    activeRunSession?.id,
    activeRunExerciseId,
    persistRunExerciseStatus,
    runExecution,
    runExecutionReadOnly,
    runIntercalationExecutions,
    runExercisesList,
  ]);

  const notesSectionRef = useRef<HTMLDivElement>(null);
  const sessionDetailRef = useRef<HTMLDivElement>(null);
  const historicoDetailRef = useRef<HTMLDivElement>(null);
  const scrollToSessionDetail = () => sessionDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToHistoricoDetail = () => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-historico-detail]');
    const visible = Array.from(nodes).find((node) => node.getClientRects().length > 0);
    (visible || historicoDetailRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const runExercisesRef = useRef<TrainingSessionExercise[]>([]);
  const inferRecurringConfigFromSessions = useCallback(
    (sessions: TrainingSession[]) => inferRecurringConfigFromSessionsShared(sessions),
    []
  );
  const generateSessionDates = (startDate: string): string[] =>
    generateTrainingSessionDates({
      startDate,
      sessionType,
      recurrenceFrequency,
      weeksCount,
      timesPerWeek,
      selectedDaysOfWeek,
    });

  const handleCreateSession = async () => {
    // Usar userId do paciente se disponível (sessões são criadas com userId)
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId || !newSessionTitle || !newSessionDate || selectedExercises.length === 0) {
      alert('Preencha título, data e adicione pelo menos um exercício.');
      return;
    }
    
    // Em modo personal trainer, permitir criar treinos
    if (isPersonalTrainerMode && authorizationError) {
      alert('Você não tem permissão para criar treinos para este paciente.');
      return;
    }
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem criar ou editar treinos.');
      return;
    }
    if (selectedExercises.some((ex) => validateTrainingPrescription(ex.prescription).ok === false)) {
      alert('Cada exercício precisa de pelo menos uma série com repetições válidas.');
      return;
    }

    // Validações para treino recorrente
    if (sessionType === 'recurring') {
      if (recurrenceFrequency === 'custom' && selectedDaysOfWeek.length === 0) {
        alert('Selecione pelo menos um dia da semana para treino personalizado.');
        return;
      }
    }
    if (editingSessionIds.length > 0) {
      const confirmed = confirm(
        `Salvar alterações deste treino${editingSessionIds.length > 1 ? ' recorrente' : ''}? Isso vai substituir ${editingSessionIds.length} registro(s).`
      );
      if (!confirmed) return;
    }

    setCreatingSession(true);
    try {
      const exercisesDataForDate = () =>
        selectedExercises.map((ex) => {
          const exerciseDbId = resolveExerciseDbId(ex);
          const cloned = clonePrescriptionWithNewIds(
            normalizeTrainingExercisePrescription(ex.prescription)
          );
          const exerciseData: any = {
            source: 'exercisedb' as const,
            exerciseId: exerciseDbId || ex.id,
            name: ex.name,
            bodyPart: ex.bodyPart,
            target: ex.target,
            equipment: ex.equipment,
            prescription: serializeTrainingPrescription(cloned),
          };
          const trainerNote = sanitizeTrainerNote(ex.trainerNote);
          if (trainerNote) exerciseData.trainerNote = trainerNote;
          exerciseData.gifUrl = resolveExerciseGifUrl(
            { id: exerciseDbId || ex.id, exerciseId: exerciseDbId, gifUrl: ex.gifUrl },
            EXERCISE_GIF_RESOLUTION
          );
          return exerciseData;
        });

      // Gerar datas das sessões
      const sessionDates = generateSessionDates(newSessionDate);
      
      if (sessionDates.length === 0) {
        alert('Erro ao gerar datas. Verifique as configurações.');
        setCreatingSession(false);
        return;
      }

      console.log('[DEBUG] Criando', sessionDates.length, 'sessões com datas:', sessionDates);

      // Criar todas as sessões
      const recurrenceGroupId =
        sessionType === 'recurring'
          ? editingRecurrenceGroupId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          : undefined;
      for (const date of sessionDates) {
        await trainingSessionService.createSessionWithExercises(
          {
            patientId: patientId,
            createdBy: isPersonalTrainerMode || fromMetapersonal ? 'personal_trainer' : 'patient',
            createdById: user?.uid || '',
            scheduledDate: date,
            title: newSessionTitle,
            status: 'scheduled',
            published: true,
            active: true,
            ...(recurrenceGroupId ? { recurrenceGroupId } : {}),
          },
          exercisesDataForDate()
        );
      }

      if (editingSessionIds.length > 0) {
        for (const id of editingSessionIds) {
          await trainingSessionService.deleteSession(id);
        }
      }
      
      console.log('[DEBUG] Sessão criada com sucesso');

      const pacienteDocId = String(paciente?.id || pacienteProp?.id || '').trim();
      if (
        pacienteDocId &&
        !fromMetaadminEmbedded &&
        !professionalReadOnly &&
        (fromMetapersonalEmbedded || isPersonalTrainerMode || fromMetapersonal)
      ) {
        notifyPacienteTreinoPersonalClient(pacienteDocId);
      }

      // Limpar formulário
      setNewSessionTitle('');
      setNewSessionDate('');
      setSessionType('single');
      setRecurrenceFrequency('weekly');
      setWeeksCount(4);
      setTimesPerWeek(3);
      setSelectedDaysOfWeek([]);
      setSelectedExercises([]);
      setSearchQuery('');
      setSelectedTarget('');
      setSelectedEquipment('');
      setSelectedBodyPart('');
      setEditingSessionIds([]);
      setEditingRecurrenceGroupId(null);
      setIsWorkoutDraftDirty(false);
      setExpandedExerciseIds([]);
      setIntercalationPick(null);

      alert(
        editingSessionIds.length > 0
          ? `Treino atualizado com sucesso! ${sessionDates.length} ${sessionDates.length === 1 ? 'sessão' : 'sessões'} ${sessionType === 'recurring' ? 'republicadas' : 'atualizada'}.`
          : `Treino criado com sucesso! ${sessionDates.length} ${sessionDates.length === 1 ? 'sessão' : 'sessões'} ${sessionType === 'recurring' ? 'agendadas' : 'criada'}.`
      );
      
      // Recarregar treino do dia selecionado se alguma data criada for a selecionada
      const hojeStr = toLocalYYYYMMDD(new Date());
      if (sessionDates.includes(selectedHojeDate) || sessionDates.includes(hojeStr)) {
        await loadTodaySession();
      }
      await loadWeekSessionMarkers();
      await loadSavedSessionsCriar();
      setCriarTreinoSheetOpen(false);
      
      const pacienteNoApp =
        !embedded && !isPersonalTrainerMode && !isProfessionalEmbed;
      setActiveTab(pacienteNoApp ? 'historico' : 'cronograma');
      if (!pacienteNoApp) loadCalendarSessions();
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      alert('Erro ao criar treino. Tente novamente.');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleViewSessionDetail = async (session: TrainingSession) => {
    const todayStr = toLocalYYYYMMDD(new Date());
    if (session.scheduledDate > todayStr) {
      setFutureSessionToast('Treino agendado — disponível no dia');
      setTimeout(() => setFutureSessionToast(null), 3000);
      return;
    }
    setSelectedSessionForDetail(session);
    if (session.id) {
      const exercises = await trainingSessionService.getSessionExercises(session.id);
      setSelectedSessionExercisesDetail(exercises);
    }
    scrollToSessionDetail();
  };

  const handleViewHistoricoSession = async (session: TrainingSession) => {
    setSelectedSessionDetail(session);
    if (session.id) {
      const [exercises, executions] = await Promise.all([
        trainingSessionService.getSessionExercises(session.id),
        TrainingExerciseExecutionService.listBySession(session.id),
      ]);
      setSelectedSessionExercises(exercises);
      const byDoc: Record<string, TrainingExerciseExecution> = {};
      for (const item of executions) {
        byDoc[item.exerciseDocId] = item;
      }
      setSelectedHistoricoExecutions(byDoc);
    } else {
      setSelectedSessionExercises([]);
      setSelectedHistoricoExecutions({});
    }
    scrollToHistoricoDetail();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem cancelar treinos.');
      return;
    }
    if (!confirm('Tem certeza que deseja cancelar este treino? Esta ação não pode ser desfeita.')) {
      return;
    }
    setDeletingSession(true);
    try {
      await trainingSessionService.deleteSession(sessionId);
      await loadCalendarSessions();
      await loadTodaySession();
      await loadWeekSessionMarkers();
      await loadSavedSessionsCriar();
      setSelectedSessionForDetail(null);
      setSelectedSessionExercisesDetail([]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
      }
      alert('Treino cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      alert('Erro ao cancelar treino. Tente novamente.');
    } finally {
      setDeletingSession(false);
    }
  };

  const handleEditSavedSession = async (session: TrainingSession, allSessionsInGroup?: TrainingSession[]) => {
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem editar treinos.');
      return;
    }
    if (!session.id) return;
    try {
      const exercises = await trainingSessionService.getSessionExercises(session.id);
      const sessionsForInference = allSessionsInGroup && allSessionsInGroup.length > 0 ? allSessionsInGroup : [session];
      const recurrenceConfig = inferRecurringConfigFromSessions(sessionsForInference);
      setSessionType(recurrenceConfig.sessionType);
      setRecurrenceFrequency(recurrenceConfig.recurrenceFrequency);
      setWeeksCount(recurrenceConfig.weeksCount);
      setTimesPerWeek(recurrenceConfig.timesPerWeek);
      setSelectedDaysOfWeek(recurrenceConfig.selectedDaysOfWeek);
      setNewSessionTitle(session.title || '');
      const startDate = [...sessionsForInference]
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]?.scheduledDate || session.scheduledDate || '';
      setNewSessionDate(startDate);
      const drafts = exercises.map((exercise) => {
        const exerciseDbId = resolveExerciseDbId(exercise);
        return toSelectedExerciseDraft({
          id: exerciseDbId,
          name: exercise.name,
          bodyPart: exercise.bodyPart,
          target: exercise.target,
          equipment: exercise.equipment,
          secondaryMuscles: [],
          instructions: [],
          gifUrl: resolveExerciseGifUrl(exercise, EXERCISE_GIF_RESOLUTION),
          prescription: normalizeTrainingExercisePrescription(exercise.prescription),
          trainerNote: exercise.trainerNote,
        });
      });
      setSelectedExercises(drafts);
      setExpandedExerciseIds(drafts.map((item) => item.draftId));
      setIsWorkoutDraftDirty(false);
      const validIds = sessionsForInference.map((s) => s.id).filter(Boolean) as string[];
      setEditingSessionIds(validIds);
      setEditingRecurrenceGroupId(session.recurrenceGroupId ?? null);
      setCriarTab('novo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Erro ao abrir treino para edição:', error);
      alert('Não foi possível abrir o treino para edição.');
    }
  };

  const handleDeleteSavedSession = async (sessionId: string) => {
    await handleDeleteSession(sessionId);
    await loadSavedSessionsCriar();
  };

  const handleDeleteSavedGroup = async (sessions: TrainingSession[]) => {
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem excluir séries.');
      return;
    }
    const validIds = sessions.map((session) => session.id).filter(Boolean) as string[];
    if (validIds.length === 0) return;
    if (!confirm(`Deseja excluir esta série recorrente com ${validIds.length} treinos?`)) {
      return;
    }
    setDeletingSession(true);
    try {
      for (const id of validIds) {
        await trainingSessionService.deleteSession(id);
      }
      await loadSavedSessionsCriar();
      await loadCalendarSessions();
      await loadTodaySession();
      await loadWeekSessionMarkers();
      await loadHistorico();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
      }
      alert('Série recorrente excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir série recorrente:', error);
      alert('Erro ao excluir a série. Tente novamente.');
    } finally {
      setDeletingSession(false);
    }
  };

  const handleToggleSavedGroupActive = async (
    group: { key: string; sessions: TrainingSession[] },
    nextActive: boolean
  ) => {
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem ativar ou desativar treinos.');
      return;
    }
    const ids = group.sessions.map((session) => session.id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    setTogglingSavedGroupKey(group.key);
    try {
      await trainingSessionService.setSessionsActive(ids, nextActive);
      setSavedSessionsCriar((prev) =>
        prev.map((session) =>
          session.id && ids.includes(session.id) ? { ...session, active: nextActive } : session
        )
      );
      await Promise.all([loadTodaySession(), loadWeekSessionMarkers(), loadCalendarSessions()]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('oftware:patient-training-calendar-changed'));
      }
    } catch (error) {
      console.error('Erro ao ativar/desativar treino:', error);
      alert('Não foi possível atualizar o treino. Tente novamente.');
    } finally {
      setTogglingSavedGroupKey(null);
    }
  };

  const handleDeleteExercise = async (sessionId: string, exerciseDocId: string) => {
    if (blockProfessionalMutations) {
      alert('Somente o paciente ou o personal trainer podem remover exercícios.');
      return;
    }
    if (!confirm('Tem certeza que deseja remover este exercício do treino?')) {
      return;
    }
    setDeletingExercise(exerciseDocId);
    try {
      // Deletar exercício da subcollection usando o ID do documento
      await deleteDoc(doc(db, 'trainingSessions', sessionId, 'exercises', exerciseDocId));
      
      // Recarregar exercícios
      const updatedExercises = await trainingSessionService.getSessionExercises(sessionId);
      setSelectedSessionExercisesDetail(updatedExercises);
      alert('Exercício removido com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar exercício:', error);
      alert('Erro ao remover exercício. Tente novamente.');
    } finally {
      setDeletingExercise(null);
    }
  };

  const handleSaveReminderPrefs = async () => {
    // Usar userId do paciente se disponível (preferências são salvas com userId)
    const patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId || !reminderPrefs) return;
    
    // Em modo personal trainer, não permitir alterar preferências de lembrete do paciente
    if (isPersonalTrainerMode) {
      alert('Personal Trainers não podem alterar preferências de lembrete do paciente.');
      return;
    }
    
    setSavingReminder(true);
    try {
      await trainingSessionService.saveReminderPrefs(patientId, {
        enabled: reminderPrefs.enabled,
        time: reminderPrefs.time,
        daysOfWeek: reminderPrefs.daysOfWeek,
      });
      alert('Preferências salvas!');
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingReminder(false);
    }
  };

  const addExerciseToSession = (exercise: Exercise) => {
    if (blockProfessionalMutations) return;
    if (intercalationPick) {
      const gifUrl = resolveExerciseGifUrl(exercise, EXERCISE_GIF_RESOLUTION);
      setSelectedExercises((prev) =>
        prev.map((ex) => {
          if (ex.draftId !== intercalationPick.draftId) return ex;
          const occurrence = createIntercalatedOccurrence({
            afterSeriesId: intercalationPick.afterSeriesId,
            slotOrder: (ex.prescription.intercalations || []).filter(
              (item) => item.afterSeriesId === intercalationPick.afterSeriesId
            ).length,
            exercise,
            gifUrl,
          });
          return {
            ...ex,
            prescription: {
              ...ex.prescription,
              intercalations: insertIntercalatedOccurrence(
                ex.prescription.series,
                ex.prescription.intercalations,
                occurrence
              ),
            },
          };
        })
      );
      setIntercalationPick(null);
      setIsWorkoutDraftDirty(true);
      return;
    }
    if (catalogExerciseIsAdded(selectedExercises, exercise.id)) {
      return;
    }
    const gifUrl = resolveExerciseGifUrl(exercise, EXERCISE_GIF_RESOLUTION);
    const draft = toSelectedExerciseDraft({
      ...exercise,
      gifUrl,
      prescription: { series: createDefaultTrainingSeries() },
    });
    setSelectedExercises([...selectedExercises, draft]);
    setExpandedExerciseIds((prev) => [...prev, draft.draftId]);
    setIsWorkoutDraftDirty(true);
  };

  const removeExerciseFromSession = (draftId: string) => {
    setSelectedExercises(selectedExercises.filter((e) => e.draftId !== draftId));
    setExpandedExerciseIds((prev) => prev.filter((id) => id !== draftId));
    if (intercalationPick?.draftId === draftId) setIntercalationPick(null);
    setIsWorkoutDraftDirty(true);
  };

  const updateExerciseSeries = (draftId: string, series: TrainingExerciseSeries[]) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.draftId !== draftId) return ex;
        const intercalations = sanitizeIntercalations(ex.prescription.intercalations, series);
        return {
          ...ex,
          prescription: {
            series,
            ...(intercalations.length > 0 ? { intercalations } : {}),
          },
        };
      })
    );
    setIsWorkoutDraftDirty(true);
  };

  const updateExerciseIntercalations = (
    draftId: string,
    intercalations: TrainingIntercalatedOccurrence[]
  ) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.draftId !== draftId) return ex;
        const next = sanitizeIntercalations(intercalations, ex.prescription.series);
        return {
          ...ex,
          prescription: {
            ...ex.prescription,
            ...(next.length > 0 ? { intercalations: next } : { intercalations: undefined }),
          },
        };
      })
    );
    setIsWorkoutDraftDirty(true);
  };

  const pickIntercalationForExercise = (draftId: string, afterSeriesId: string) => {
    if (blockProfessionalMutations) return;
    setIntercalationPick({ draftId, afterSeriesId });
    setCriarTreinoSheetOpen(false);
  };

  const repeatIntercalationForExercise = (
    draftId: string,
    afterSeriesId: string,
    source: TrainingIntercalatedOccurrence
  ) => {
    if (blockProfessionalMutations) return;
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.draftId !== draftId) return ex;
        return {
          ...ex,
          prescription: {
            ...ex.prescription,
            intercalations: repeatIntercalatedOccurrence(
              ex.prescription.series,
              ex.prescription.intercalations,
              afterSeriesId,
              source
            ),
          },
        };
      })
    );
    setIsWorkoutDraftDirty(true);
  };

  const updateExerciseTrainerNote = (draftId: string, trainerNote: string) => {
    setSelectedExercises(
      selectedExercises.map((ex) =>
        ex.draftId === draftId ? { ...ex, trainerNote } : ex
      )
    );
    setIsWorkoutDraftDirty(true);
  };

  const duplicateExerciseInSession = (draftId: string) => {
    if (blockProfessionalMutations) return;
    const index = selectedExercises.findIndex((item) => item.draftId === draftId);
    const next = insertDuplicatedExercise(selectedExercises, draftId);
    const copy = index >= 0 ? next[index + 1] : undefined;
    setSelectedExercises(next);
    if (copy) {
      setExpandedExerciseIds((prev) => [...prev, copy.draftId]);
    }
    setIsWorkoutDraftDirty(true);
  };

  const reorderExercisesInSession = (fromIndex: number, toIndex: number) => {
    if (blockProfessionalMutations) return;
    setSelectedExercises(reorderSelectedExercises(selectedExercises, fromIndex, toIndex));
    setIsWorkoutDraftDirty(true);
  };

  const importFromWorkoutTemplate = (
    template: PersonalWorkoutTemplate,
    mode: ImportWorkoutMode
  ): boolean => {
    const result = importWorkoutTemplateToDraft(template);
    if (!result.ok) return false;
    const next = mergeClonedDraftsIntoWorkout(selectedExercises, result.drafts, mode);
    setSelectedExercises(next);
    setIsWorkoutDraftDirty(true);
    setNewSessionTitle((prev) => suggestedSessionTitleFromTemplate(prev, template.nome));
    const importedIds = result.drafts.map((item) => item.draftId);
    setExpandedExerciseIds((prev) =>
      mode === 'replace' ? importedIds : [...prev, ...importedIds]
    );
    return true;
  };

  const toggleExerciseExpanded = (draftId: string) => {
    setExpandedExerciseIds((prev) =>
      prev.includes(draftId) ? prev.filter((id) => id !== draftId) : [...prev, draftId]
    );
  };

  const openWorkoutPrint = useCallback(
    async (session: TrainingSession | null | undefined, exercises?: TrainingSessionExercise[]) => {
      if (!session) return;
      setLoadingWorkoutPrint(true);
      try {
        let list = exercises && exercises.length > 0 ? exercises : undefined;
        if (!list && session.id) {
          list = await trainingSessionService.getSessionExercises(session.id);
        }
        if (!list || list.length === 0) {
          alert('Este treino ainda não tem exercícios para imprimir.');
          return;
        }
        const patientName =
          pacienteProp?.dadosIdentificacao?.nomeCompleto ||
          pacienteProp?.nome ||
          paciente?.dadosIdentificacao?.nomeCompleto ||
          paciente?.nome ||
          'Paciente';
        const trainerName = personalVinculado?.nome || loggedPersonalName || undefined;
        setWorkoutPrintData(
          buildWorkoutPrintData({
            patientName,
            trainerName,
            session,
            exercises: list,
          })
        );
        setWorkoutPrintOpen(true);
      } catch (error) {
        console.error('Erro ao preparar impressão do treino:', error);
        alert('Não foi possível preparar o treino para impressão.');
      } finally {
        setLoadingWorkoutPrint(false);
      }
    },
    [paciente, pacienteProp, personalVinculado?.nome, loggedPersonalName]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!user) return null;

  // Modo paciente: aguardar carregamento do paciente antes de decidir bloqueio ou conteúdo
  // Quando embedded com pacienteProp, usar esse valor (já disponível)
  const effectivePaciente = pacienteProp ?? paciente;
  if (!isPersonalTrainerMode && !effectivePaciente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Mostrar erro de autorização se houver
  if (authorizationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-lg border border-white/10 bg-[#0A1F44]/90 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] p-6 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#E8EDED] mb-2">
            Acesso Negado
          </h2>
          <p className="text-[#E8EDED]/75 mb-4">
            {authorizationError}
          </p>
          <button
            onClick={() => router.push('/metapersonal')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-full"
          >
            Voltar para /metapersonal
          </button>
        </div>
      </div>
    );
  }

  // Paciente não vinculado ao médico: bloquear Personal (modo paciente apenas; embeds profissionais usam pacienteProp)
  if (
    !isPersonalTrainerMode &&
    !isProfessionalEmbed &&
    effectivePaciente &&
    !effectivePaciente.medicoResponsavelId
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-lg border border-white/10 bg-[#0A1F44]/90 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] p-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
            <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-[#E8EDED] mb-2">
            Vínculo com médico necessário
          </h2>
          <p className="text-[#E8EDED]/75 mb-6">
            Para acessar as páginas Nutri e Personal, você precisa primeiro ser vinculado a um médico. 
            Acesse a seção Médicos no menu para buscar e solicitar vínculo com um médico da sua região.
          </p>
          <button
            onClick={() => router.push('/meta')}
            className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-full font-medium"
          >
            Ir para página inicial
          </button>
        </div>
      </div>
    );
  }

  const hoje = new Date();
  const hojeStr = toLocalYYYYMMDD(hoje);
  const weekDates = getCurrentWeekDates(hoje);
  const isSelectedHojeToday = selectedHojeDate === hojeStr;
  const selectedWeekIndex = weekDates.findIndex((d) => toLocalYYYYMMDD(d) === selectedHojeDate);
  const selectedDayLabel =
    selectedWeekIndex >= 0
      ? WEEKDAY_LABELS[selectedWeekIndex]
      : isSelectedHojeToday
        ? 'Hoje'
        : selectedHojeDate;
  const treinoDiaTitulo = isSelectedHojeToday ? 'Treino de hoje' : `Treino de ${selectedDayLabel.toLowerCase()}`;
  const handleSelectWeekDay = (dateStr: string) => {
    setSelectedHojeDate(dateStr);
    if (activeTab !== 'hoje') setActiveTab('hoje');
  };
  const handleAbrirCriarTreino = () => {
    setCriarTab('novo');
    setNewSessionDate(selectedHojeDate);
    setActiveTab('criar');
  };

  const nomePaciente = paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || 'Paciente';
  const primeiroNomePaciente = (
    user?.displayName ||
    paciente?.dadosIdentificacao?.nomeCompleto ||
    paciente?.nome
  )
    ? getMetaHomeFirstName(
        user?.displayName,
        paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome
      )
    : '';
  /** App fullscreen do cliente em /meta/personal (não embutido no Metapersonal/Metaadmin). */
  const isPatientAppShell = !embedded && !isPersonalTrainerMode && !isProfessionalEmbed;
  const isAppFullscreen =
    metaadminFullscreen ||
    isPatientAppShell ||
    (!embedded && (isPersonalTrainerMode || fromMetapersonal));
  // Embed desktop no Editar Paciente: preenche o container. Fullscreen mobile: fixed como metapersonal.
  // Com suppressAppHeader o container pai já é fixed (PacienteModalHeader + conteúdo).
  const fillParentShell = (embedded && !metaadminFullscreen) || (metaadminFullscreen && suppressAppHeader);
  const showAppHeader = (!embedded || metaadminFullscreen) && !suppressAppHeader;
  /**
   * Mesma tela nova do /meta/personal no mobile.
   * Metaadmin, Metapersonal e Metanutri compartilham esse chrome; no desktop seguem o menu lateral.
   */
  const modernMobileChrome = isPatientAppShell || isProfessionalEmbed;
  /** Desktop: menu lateral. No mobile profissional a grade antiga fica oculta (chrome novo). */
  const useEmbedDesktopNav = fillParentShell || isProfessionalEmbed;
  const canMutateWorkoutLibrary =
    fromMetapersonal && !fromMetaadminEmbedded && !professionalReadOnly;
  const canViewWorkoutLibrary = canMutateWorkoutLibrary || fromMetaadminEmbedded || professionalReadOnly;
  const libraryOwnerUid = canMutateWorkoutLibrary
    ? user?.uid || null
    : libraryPersonalTrainerId;
  const openImportTemplateModal = () => {
    if (!canMutateWorkoutLibrary) return;
    if (!user?.uid) {
      alert('Faça login para acessar a biblioteca.');
      return;
    }
    setImportTemplateOpen(true);
  };
  const openSaveAsTemplateModal = () => {
    if (!canMutateWorkoutLibrary) return;
    if (!user?.uid) {
      alert('Faça login para salvar na biblioteca.');
      return;
    }
    if (selectedExercises.length < 1) {
      alert('Adicione pelo menos um exercício antes de salvar como modelo.');
      return;
    }
    setSaveAsTemplateOpen(true);
  };
  const workoutLibraryDraftActions = canMutateWorkoutLibrary ? (
    <WorkoutLibraryDraftActions
      canSaveAsTemplate={selectedExercises.length > 0}
      disabled={blockProfessionalMutations}
      onImport={openImportTemplateModal}
      onSaveAsTemplate={openSaveAsTemplateModal}
    />
  ) : null;
  const isCriarDesktopBuilder =
    activeTab === 'criar' && (criarTab === 'novo' || criarTab === 'biblioteca');
  const requestCriarTab = (next: 'novo' | 'salvos' | 'biblioteca') => {
    if (next === criarTab) return;
    if (criarTab === 'novo' && isWorkoutDraftDirty) {
      const ok = confirm('Há alterações não salvas neste treino. Deseja sair mesmo assim?');
      if (!ok) return;
    }
    if (criarTab === 'biblioteca' && isLibraryDraftDirty) {
      const ok = confirm('Há alterações não salvas neste plano da biblioteca. Deseja sair mesmo assim?');
      if (!ok) return;
    }
    if (next === 'salvos') setCriarTreinoSheetOpen(false);
    if (next !== 'biblioteca') setIsLibraryDraftDirty(false);
    setCriarTab(next);
  };
  const canSaveWorkoutDraft =
    !creatingSession &&
    !blockProfessionalMutations &&
    Boolean(newSessionTitle) &&
    Boolean(newSessionDate) &&
    selectedExercises.length > 0 &&
    !(
      sessionType === 'recurring' &&
      recurrenceFrequency === 'custom' &&
      selectedDaysOfWeek.length === 0
    );
  const criarCatalogPanel = (layout: 'grid' | 'list') => (
    <ExerciseCatalogPanel
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      selectedBodyPart={selectedBodyPart}
      selectedTarget={selectedTarget}
      selectedEquipment={selectedEquipment}
      criarFiltroPastaAtiva={criarFiltroPastaAtiva}
      onFiltroPastaAtivaChange={setCriarFiltroPastaAtiva}
      bodyParts={bodyParts}
      availableTargets={availableTargetsByBodyPart}
      availableEquipments={availableEquipmentsByFilters}
      onBodyPartChange={(value) => {
        setSelectedBodyPart(value);
        setSelectedTarget('');
        setSelectedEquipment('');
        setSearchQuery('');
        setExercisesResults([]);
        if (value) setCriarFiltroPastaAtiva('target');
      }}
      onTargetChange={(value) => {
        setSelectedTarget(value);
        setSelectedEquipment('');
        if (value) setCriarFiltroPastaAtiva('equipment');
      }}
      onEquipmentChange={setSelectedEquipment}
      exercises={exercisesResults}
      loading={loadingExercises}
      selectedExercises={selectedExercises}
      onAdd={addExerciseToSession}
      readOnly={blockProfessionalMutations}
      layout={layout}
      pickMode={intercalationPick ? 'intercalate' : 'main'}
      onCancelPick={() => setIntercalationPick(null)}
    />
  );
  const renderCriarSessionMeta = () => (
    <>
      <input
        type="text"
        value={newSessionTitle}
        onChange={(e) => {
          setNewSessionTitle(e.target.value);
          setIsWorkoutDraftDirty(true);
        }}
        className="w-full h-10 px-3 text-sm rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 focus:ring-2 focus:ring-[#4CCB7A]/35 focus:border-[#4CCB7A]/50 outline-none"
        placeholder="Título do treino"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setSessionType('single');
            setIsWorkoutDraftDirty(true);
          }}
          className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
            sessionType === 'single'
              ? 'bg-[#4CCB7A] text-[#0A1F44]'
              : 'bg-white/10 text-[#E8EDED]/80'
          }`}
        >
          Único
        </button>
        <button
          type="button"
          onClick={() => {
            setSessionType('recurring');
            setIsWorkoutDraftDirty(true);
          }}
          className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
            sessionType === 'recurring'
              ? 'bg-[#4CCB7A] text-[#0A1F44]'
              : 'bg-white/10 text-[#E8EDED]/80'
          }`}
        >
          Recorrente
        </button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="min-w-0">
          <label className="block text-[10px] font-medium text-[#E8EDED]/55 mb-1">
            {sessionType === 'single' ? 'Data' : 'Início'}
          </label>
          <input
            type="date"
            value={newSessionDate}
            onChange={(e) => {
              setNewSessionDate(e.target.value);
              setIsWorkoutDraftDirty(true);
            }}
            min={hojeStr}
            className="block w-full min-w-0 h-9 px-2 text-sm rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] focus:ring-2 focus:ring-[#4CCB7A]/35 outline-none [color-scheme:dark] appearance-none"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>
        {sessionType === 'recurring' && (
          <div className="text-[10px] text-[#E8EDED]/55 pb-2 whitespace-nowrap">
            {weeksCount} sem.
          </div>
        )}
      </div>
      {sessionType === 'recurring' && (
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="grid grid-cols-3 gap-1">
            {([
              ['daily', 'Diário'],
              ['weekly', 'Semanal'],
              ['custom', 'Custom'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setRecurrenceFrequency(key);
                  if (key !== 'custom') setSelectedDaysOfWeek([]);
                  setIsWorkoutDraftDirty(true);
                }}
                className={`h-8 rounded-md text-[11px] font-semibold ${
                  recurrenceFrequency === key
                    ? 'bg-[#4CCB7A] text-[#0A1F44]'
                    : 'bg-white/10 text-[#E8EDED]/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {recurrenceFrequency === 'custom' && (
            <div className="flex flex-wrap gap-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const newDays = selectedDaysOfWeek.includes(index)
                      ? selectedDaysOfWeek.filter((d) => d !== index)
                      : [...selectedDaysOfWeek, index];
                    setSelectedDaysOfWeek(newDays);
                    setIsWorkoutDraftDirty(true);
                  }}
                  className={`h-8 min-w-[2.25rem] px-1.5 rounded-md text-[10px] font-semibold ${
                    selectedDaysOfWeek.includes(index)
                      ? 'bg-[#4CCB7A] text-[#0A1F44]'
                      : 'bg-white/10 text-[#E8EDED]/80'
                  }`}
                >
                  {dia}
                </button>
              ))}
            </div>
          )}
          {recurrenceFrequency === 'weekly' && (
            <select
              value={timesPerWeek}
              onChange={(e) => {
                setTimesPerWeek(parseInt(e.target.value));
                setIsWorkoutDraftDirty(true);
              }}
              className="w-full h-9 px-2 text-xs rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <option key={num} value={num}>
                  {num}x / semana
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="12"
              value={weeksCount}
              onChange={(e) => {
                setWeeksCount(parseInt(e.target.value));
                setIsWorkoutDraftDirty(true);
              }}
              className="flex-1"
            />
            <span className="text-[11px] font-semibold text-[#E8EDED] tabular-nums w-14 text-right">
              {weeksCount} sem.
            </span>
          </div>
        </div>
      )}
    </>
  );
  const abasPersonal = [
    { id: 'hoje', label: 'Hoje', shortLabel: 'Hoje', icon: Dumbbell },
    { id: 'cronograma', label: 'Cronograma', shortLabel: 'Crono', icon: Calendar },
    { id: 'criar', label: '+ Criar', shortLabel: 'Criar', icon: Plus },
    { id: 'historico', label: 'Histórico', shortLabel: 'Hist.', icon: History },
    { id: 'estatisticas', label: 'Estatísticas', shortLabel: 'Stats', icon: BarChart3 },
    { id: 'config', label: 'Configurações', shortLabel: 'Config', icon: Settings },
  ] as const satisfies ReadonlyArray<{ id: Tab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }> }>;

  const abasNavegacaoMobile = abasPersonal.filter(
    (aba) => aba.id !== 'cronograma' && aba.id !== 'config'
  );
  const abasMenu = isPatientAppShell ? abasNavegacaoMobile : abasPersonal;
  const legacyTabGridClass = isProfessionalEmbed
    ? 'hidden'
    : isPatientAppShell
      ? 'hidden lg:block'
      : useEmbedDesktopNav
        ? 'lg:hidden'
        : '';

  const handleFecharAppPersonal = () => {
    if (fromMetaadminEmbedded || metaadminFullscreen) {
      onCloseMetaadmin?.();
      return;
    }
    if (isPersonalTrainerMode || fromMetapersonal) {
      router.push('/metapersonal');
      return;
    }
    router.push('/meta');
  };

  const appShell = (
    <div
      className={`personal-dark-scroll w-full bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44] text-[#E8EDED] ${
        fillParentShell
          ? 'flex flex-col min-h-[70dvh] h-full'
          : isAppFullscreen || fromMetapersonal || metaadminFullscreen
            ? 'fixed inset-0 z-[200] flex flex-col h-[100dvh] overflow-hidden'
            : 'min-h-screen'
      }`}
    >
      {/* Header */}
      {showAppHeader && (
      <header className={`relative shrink-0 z-40 backdrop-blur-sm ${
        isPatientAppShell
          ? 'bg-transparent lg:bg-[#0A1F44]/95 lg:border-b lg:border-white/10'
          : 'bg-[#0A1F44]/95 border-b border-white/10'
      }`}>
        <div className="w-full px-4 py-3">
          {isPatientAppShell ? (
            <>
              <div className="flex items-start justify-between gap-3 lg:hidden pt-[max(0.15rem,env(safe-area-inset-top))]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-light leading-tight text-white min-h-[1.25rem]">
                    {dayGreeting ?? '\u00a0'}
                  </p>
                  <h1 className="truncate text-[1.65rem] font-bold leading-tight text-white">
                    {primeiroNomePaciente || '\u00a0'}
                  </h1>
                  <p className="sr-only">
                    {personalVinculado?.nome
                      ? `Personal ${personalVinculado.nome}${personalVinculado.isVerificado ? ', verificado' : ''}.`
                      : 'Personal não vinculado.'}
                    {agregadoPersonalVinculado && agregadoPersonalVinculado.count > 0
                      ? ` Avaliação ${agregadoPersonalVinculado.media.toFixed(1)} de 5, ${agregadoPersonalVinculado.count} avaliações.`
                      : ' Seu personal compartilhado.'}
                  </p>
                </div>
                <PersonalPatientHeaderActions
                  photoUrl={user?.photoURL}
                  personal={personalVinculado}
                  rating={agregadoPersonalVinculado}
                  patientId={paciente?.id || null}
                  userId={user?.uid || null}
                  patientName={
                    paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || null
                  }
                  onClose={handleFecharAppPersonal}
                  onOpenSettings={() => setActiveTab('config')}
                />
              </div>
              <div className="hidden lg:flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Dumbbell className="w-6 h-6 text-[#4CCB7A] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h1 className="text-base font-semibold text-[#E8EDED] truncate">
                        {personalVinculado?.nome || 'Personal'}
                      </h1>
                      {personalVinculado?.isVerificado === true ? (
                        <ShieldCheck className="h-4 w-4 text-[#4CCB7A] flex-shrink-0" />
                      ) : personalVinculado ? (
                        <Shield className="h-4 w-4 text-red-400 flex-shrink-0" />
                      ) : null}
                    </div>
                    {agregadoPersonalVinculado && agregadoPersonalVinculado.count > 0 ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={11}
                            className={
                              s <= Math.round(agregadoPersonalVinculado.media)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-white/25'
                            }
                          />
                        ))}
                        <span className="text-[10px] text-[#E8EDED]/55 ml-0.5 tabular-nums">
                          {agregadoPersonalVinculado.media.toFixed(1)} ({agregadoPersonalVinculado.count})
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#E8EDED]/45 mt-0.5">Seu personal compartilhado</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFecharAppPersonal}
                  className="flex-shrink-0 p-2 text-[#E8EDED]/65 hover:text-[#E8EDED] rounded-lg hover:bg-white/10"
                  aria-label="Fechar e voltar ao Home"
                >
                  <X size={24} />
                </button>
              </div>
            </>
          ) : metaadminFullscreen || (fromMetaadminEmbedded && showAppHeader) ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Dumbbell className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <h1 className="text-lg font-semibold text-[#E8EDED] truncate">{nomePaciente}</h1>
                </div>
                <button
                  type="button"
                  onClick={handleFecharAppPersonal}
                  className="flex-shrink-0 p-2 text-[#E8EDED]/65 hover:text-[#E8EDED] rounded-lg hover:bg-white/10"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
              {metaadminHeaderExtra ? (
                <div className="min-w-0">{metaadminHeaderExtra}</div>
              ) : null}
            </div>
          ) : fromMetapersonal && patientBrowserTabs ? (
            <MetapersonalPersonalPatientTabBar
              tabs={patientBrowserTabs.tabs}
              activeId={patientBrowserTabs.activeId}
              onSelect={patientBrowserTabs.onSelect}
              onClose={patientBrowserTabs.onClose}
              onAdd={patientBrowserTabs.onAdd}
              onCloseAll={patientBrowserTabs.onCloseAll}
            />
          ) : fromMetapersonal ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Dumbbell className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <h1 className="text-lg font-semibold text-[#E8EDED] truncate">
                  {nomePaciente}
                </h1>
              </div>
              <button
                type="button"
                onClick={handleFecharAppPersonal}
                className="flex-shrink-0 p-2 text-[#E8EDED]/65 hover:text-[#E8EDED] rounded-lg hover:bg-white/10"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Dumbbell className="w-6 h-6 text-[#4CCB7A] flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-[#E8EDED] truncate">Personal</h1>
                  {isPersonalTrainerMode && paciente && (
                    <p className="text-xs text-[#E8EDED]/65 truncate">Aluno: {paciente.nome}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleFecharAppPersonal}
                className="flex-shrink-0 p-2 text-[#E8EDED]/65 hover:text-[#E8EDED] rounded-lg hover:bg-white/10"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>
          )}
        </div>
      </header>
      )}

      <div
        className={`flex-1 min-h-0 w-full flex ${
          useEmbedDesktopNav ? 'flex-col lg:flex-row' : 'flex-col'
        }`}
      >
        {/* Menu lateral — desktop no embed do modal do paciente */}
        {useEmbedDesktopNav && (
          <aside className="hidden lg:flex w-52 xl:w-56 flex-shrink-0 flex-col border-r border-white/10 bg-[#071833]/90">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E8EDED]/40">
                Personal Trainer
              </p>
            </div>
            <nav
              className="flex-1 py-2 px-2.5 space-y-1 overflow-y-auto"
              aria-label="Seções Personal"
            >
              {abasMenu.map((aba) => {
                const ativo = activeTab === aba.id;
                const TabIcon = aba.icon;
                return (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setActiveTab(aba.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      ativo
                        ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] ring-1 ring-[#4CCB7A]/35'
                        : 'text-[#E8EDED]/70 hover:bg-white/5 hover:text-[#E8EDED]'
                    }`}
                  >
                    <TabIcon
                      className={`w-[18px] h-[18px] flex-shrink-0 ${
                        ativo ? 'text-[#4CCB7A]' : 'text-[#E8EDED]/45'
                      }`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="truncate text-left">{aba.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Coluna de conteúdo */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden min-w-0">
          <div
            className={`flex-1 min-h-0 w-full overscroll-y-contain ${
              isOverlayModalOpen ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
      {(isPersonalTrainerMode || isProfessionalEmbed) && (paciente?.id || pacienteIdFromQuery) && (
        <div className={`shrink-0 ${isCriarDesktopBuilder ? 'lg:hidden' : ''}`}>
        <ProfessionalPersonalToolsBar
          key={`tools-${paciente?.id || pacienteIdFromQuery}`}
          patientId={(paciente?.id || pacienteIdFromQuery)!}
          viewerRole={resolvedProfessionalRole}
          userId={user?.uid ?? null}
          patientName={paciente?.nome || nomePaciente || null}
          dark
        />
        </div>
      )}

      {modernMobileChrome && (
        <div className="lg:hidden w-full px-3 pt-1 pb-2">
          <div
            role="tablist"
            aria-label="Dias da semana"
            className="grid grid-cols-7 gap-1 w-full"
          >
            {weekDates.map((date, index) => {
              const dateStr = toLocalYYYYMMDD(date);
              const dayNum = String(date.getDate()).padStart(2, '0');
              const ativo = selectedHojeDate === dateStr;
              const isToday = dateStr === hojeStr;
              const temTreino = weekDatesWithSessions.has(dateStr);
              const progressoDia = weekProgressByDate[dateStr] ?? 0;
              return (
                <button
                  key={dateStr}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  aria-label={`${WEEKDAY_LABELS[index]} ${dayNum}${isToday ? ' (hoje)' : ''}${weekDayStatusLabel(temTreino, progressoDia)}`}
                  title={`${WEEKDAY_LABELS[index]} ${dayNum}${progressoDia > 0 ? ` · ${progressoDia}%` : temTreino ? ' · agendado' : ''}`}
                  onClick={() => handleSelectWeekDay(dateStr)}
                  className="min-w-0 w-full flex flex-col items-center gap-1 py-0.5"
                >
                  <span
                    className={`text-[11px] font-medium leading-none ${
                      ativo ? 'text-[#4CCB7A]' : 'text-[#E8EDED]/55'
                    }`}
                  >
                    {WEEKDAY_CIRCLE_LETTERS[index]}
                  </span>
                  <span
                    className={`relative flex aspect-square w-full max-w-10 items-center justify-center rounded-full border text-[13px] font-semibold tabular-nums leading-none transition-colors ${
                      ativo
                        ? 'border-[#4CCB7A] bg-[#12352a]/80 text-[#4CCB7A] shadow-[0_0_14px_rgba(76,203,122,0.45)]'
                        : 'border-[#3B6EA5]/55 bg-transparent text-[#E8EDED]/90'
                    }`}
                  >
                    {progressoDia > 0 && (
                      <CalendarDayProgressBorder percent={progressoDia} selected={ativo} circular dense />
                    )}
                    <span className="relative z-[1]">{dayNum}</span>
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      ativo && temTreino && progressoDia === 0 ? 'bg-[#4CCB7A]' : weekDayDotClass(temTreino, progressoDia)
                    }`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs — no app do paciente ficam na barra inferior no mobile; desktop e demais perfis mantêm este menu */}
      <div className={`w-full px-0 pt-0 pb-3 ${legacyTabGridClass}`}>
        <div className="border border-white/10 border-x-0 bg-[#0A1F44]/80 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] overflow-hidden rounded-none">
          <div className="border-b border-white/10">
            <div
              role="tablist"
              aria-label="Seções Personal"
              className={`grid gap-1 p-2 ${abasMenu.length > 4 ? 'grid-cols-6' : 'grid-cols-4'}`}
            >
              {abasMenu.map((aba) => {
                const ativo = activeTab === aba.id;
                const TabIcon = aba.icon;
                return (
                  <button
                    key={aba.id}
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    onClick={() => setActiveTab(aba.id)}
                    className={`min-w-0 w-full flex flex-col items-center justify-center rounded-xl border text-center transition-all ${
                      ativo
                        ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 shadow-[0_8px_24px_-8px_rgba(76,203,122,0.45)] ring-2 ring-[#4CCB7A]/35'
                        : 'border-white/10 bg-white/[0.04] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                    }`}
                  >
                    <div className="flex items-center justify-center px-2 pt-2.5 pb-1.5">
                      <TabIcon
                        className={`w-4 h-4 shrink-0 ${ativo ? 'text-[#4CCB7A]' : 'text-[#E8EDED]/45'}`}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                    <div className="px-1 pb-2.5 space-y-0.5">
                      <p
                        className={`text-[9px] sm:text-[11px] font-semibold leading-tight text-center line-clamp-2 ${
                          ativo ? 'text-[#E8EDED]' : 'text-[#E8EDED]/75'
                        }`}
                      >
                        {aba.shortLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bolinhas Seg–Dom: preenchem a horizontal; clique abre o treino daquele dia */}
          <div className="p-2 pt-1">
            <div
              role="tablist"
              aria-label="Dias da semana"
              className="grid grid-cols-7 gap-1 w-full"
            >
              {weekDates.map((date, index) => {
                const dateStr = toLocalYYYYMMDD(date);
                const dayNum = String(date.getDate()).padStart(2, '0');
                const ativo = selectedHojeDate === dateStr;
                const isToday = dateStr === hojeStr;
                const temTreino = weekDatesWithSessions.has(dateStr);
                const progressoDia = weekProgressByDate[dateStr] ?? 0;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    aria-label={`${WEEKDAY_LABELS[index]} ${dayNum}${isToday ? ' (hoje)' : ''}${temTreino ? ', com treino' : ''}${progressoDia > 0 ? `, ${progressoDia}% concluído` : ''}`}
                    title={`${WEEKDAY_LABELS[index]} ${dayNum}${progressoDia > 0 ? ` · ${progressoDia}%` : ''}`}
                    onClick={() => handleSelectWeekDay(dateStr)}
                    className={`relative min-w-0 w-full flex flex-col items-center justify-center rounded-xl border py-2 px-0.5 text-center transition-all gap-0.5 ${
                      ativo
                        ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 shadow-[0_8px_24px_-8px_rgba(76,203,122,0.45)] ring-2 ring-[#4CCB7A]/35'
                        : 'border-white/10 bg-white/[0.04] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                    }`}
                  >
                    {progressoDia > 0 && (
                      <CalendarDayProgressBorder percent={progressoDia} selected={ativo} />
                    )}
                    <span
                      className={`relative z-[1] text-sm sm:text-base font-semibold leading-none ${
                        ativo ? 'text-[#4CCB7A]' : isToday ? 'text-[#E8EDED]' : 'text-[#E8EDED]/75'
                      }`}
                    >
                      {WEEKDAY_LETTERS[index]}
                    </span>
                    <span
                      className={`relative z-[1] text-[9px] sm:text-[10px] font-medium leading-tight ${
                        ativo ? 'text-[#E8EDED]' : 'text-[#E8EDED]/65'
                      }`}
                    >
                      {WEEKDAY_SHORT[index]}
                    </span>
                    <span
                      className={`relative z-[1] text-[11px] sm:text-xs font-semibold tabular-nums leading-none ${
                        ativo ? 'text-[#4CCB7A]' : isToday ? 'text-[#E8EDED]' : 'text-[#E8EDED]/75'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {temTreino && (
                      <span
                        className={`relative z-[1] w-1 h-1 rounded-full ${
                          ativo ? 'bg-[#4CCB7A]' : 'bg-[#4CCB7A]/70'
                        }`}
                        aria-hidden
                      />
                    )}
                    {!temTreino && <span className="relative z-[1] w-1 h-1" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Faixa de dias — desktop embed (menu lateral já cuida das seções) */}
      {useEmbedDesktopNav && (
        <div className={`hidden w-full px-4 pt-3 pb-1 shrink-0 sticky top-0 z-20 bg-[#0A1F44] ${isCriarDesktopBuilder ? '' : 'lg:block'}`}>
          <div className="rounded-xl border border-white/10 bg-[#0A1F44]/70 p-2">
            <div
              role="tablist"
              aria-label="Dias da semana"
              className="grid grid-cols-7 gap-1.5 w-full"
            >
              {weekDates.map((date, index) => {
                const dateStr = toLocalYYYYMMDD(date);
                const dayNum = String(date.getDate()).padStart(2, '0');
                const ativo = selectedHojeDate === dateStr;
                const isToday = dateStr === hojeStr;
                const temTreino = weekDatesWithSessions.has(dateStr);
                const progressoDia = weekProgressByDate[dateStr] ?? 0;
                return (
                  <button
                    key={`desk-${dateStr}`}
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    aria-label={`${WEEKDAY_LABELS[index]} ${dayNum}${isToday ? ' (hoje)' : ''}${temTreino ? ', com treino' : ''}${progressoDia > 0 ? `, ${progressoDia}% concluído` : ''}`}
                    title={`${WEEKDAY_LABELS[index]} ${dayNum}${progressoDia > 0 ? ` · ${progressoDia}%` : ''}`}
                    onClick={() => handleSelectWeekDay(dateStr)}
                    className={`relative min-w-0 w-full flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 text-center transition-all gap-0.5 ${
                      ativo
                        ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 ring-2 ring-[#4CCB7A]/35'
                        : 'border-white/10 bg-white/[0.04] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                    }`}
                  >
                    {progressoDia > 0 && (
                      <CalendarDayProgressBorder percent={progressoDia} selected={ativo} />
                    )}
                    <span
                      className={`relative z-[1] text-base font-semibold leading-none ${
                        ativo ? 'text-[#4CCB7A]' : isToday ? 'text-[#E8EDED]' : 'text-[#E8EDED]/75'
                      }`}
                    >
                      {WEEKDAY_LETTERS[index]}
                    </span>
                    <span
                      className={`relative z-[1] text-[10px] font-medium leading-tight ${
                        ativo ? 'text-[#E8EDED]' : 'text-[#E8EDED]/65'
                      }`}
                    >
                      {WEEKDAY_SHORT[index]}
                    </span>
                    <span
                      className={`relative z-[1] text-xs font-semibold tabular-nums leading-none ${
                        ativo ? 'text-[#4CCB7A]' : isToday ? 'text-[#E8EDED]' : 'text-[#E8EDED]/75'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {temTreino ? (
                      <span
                        className={`relative z-[1] w-1 h-1 rounded-full ${
                          ativo ? 'bg-[#4CCB7A]' : 'bg-[#4CCB7A]/70'
                        }`}
                        aria-hidden
                      />
                    ) : (
                      <span className="relative z-[1] w-1 h-1" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo — full width no Metapersonal */}
      <main
        className={`w-full px-4 py-6 pb-8 ${
          modernMobileChrome ? 'max-lg:pt-3 max-lg:pb-28' : ''
        } ${
          useEmbedDesktopNav
            ? isCriarDesktopBuilder
              ? 'lg:px-4 lg:py-3 lg:pb-8 lg:max-w-none'
              : 'lg:px-6 lg:max-w-5xl lg:mx-auto'
            : ''
        }`}
      >
        {activeTab === 'hoje' && (
          <Surface className={`rounded-2xl ${modernMobileChrome ? 'max-lg:bg-transparent [&>div:first-child]:max-lg:hidden' : ''}`}>
            <div className="space-y-4">
            {loadingToday ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CCB7A]" />
              </div>
            ) : (
              <div className={modernMobileChrome ? 'space-y-5 lg:space-y-6' : 'space-y-6'}>
                {modernMobileChrome && (
                  <div className="lg:hidden">
                    <PersonalEditWorkoutCard onClick={handleAbrirCriarTreino} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAbrirCriarTreino}
                  className={`w-full px-4 py-3 bg-[#4CCB7A] text-[#0A1F44] text-sm font-semibold rounded-xl shadow-sm hover:bg-[#45b86d] transition-colors flex items-center justify-center gap-2 ${modernMobileChrome ? 'hidden lg:flex' : ''}`}
                >
                  <Plus className="w-4 h-4" />
                  Edite seu Treino
                </button>

                {todaySessions.length > 0 && selectedTodaySessionId && todaySelectedSession && (
                  <div className="space-y-4">
                    {modernMobileChrome && (
                      <div className="lg:hidden">
                        <PersonalTodayHeroCard
                          dayTitle={treinoDiaTitulo}
                          status={todaySelectedSession.status}
                          title={todaySelectedSession.title}
                          exerciseCount={progress.total}
                          doneCount={progress.done}
                          percentage={progress.percentage}
                          progressCaption={isSelectedHojeToday ? 'Hoje' : selectedDayLabel}
                          muscleImageUrl={todayMuscleImageUrl && !muscleImageFailed ? todayMuscleImageUrl : null}
                          muscleAlt={`Músculos do dia: ${todayMuscleGroups.join(', ')}`}
                          onMuscleError={() => setMuscleImageFailed(true)}
                          startCompleted={nextExercise === null}
                          startDisabled={nextExercise === null && todayExercises.length === 0}
                          startLabel={
                            nextExercise === null
                              ? 'Treino concluído'
                              : isPersonalTrainerMode
                                ? progress.percentage > 0
                                  ? 'Acompanhar treino'
                                  : 'Iniciar treino'
                                : 'Iniciar treino'
                          }
                          startSubtitle={
                            nextExercise === null
                              ? 'Você concluiu esta sessão'
                              : progress.percentage > 0
                                ? isPersonalTrainerMode
                                  ? 'Acompanhe a sessão do aluno'
                                  : 'Continue de onde parou'
                                : 'Vamos lá! Boa sessão de treino 💪'
                          }
                          onStart={() =>
                            startWorkout(
                              todaySelectedSession,
                              nextExercise === null
                                ? todayExercises[0]?.id ?? null
                                : nextExercise?.id ??
                                  todayExercises.find((ex) => ex.status !== 'done' && ex.status !== 'skipped')?.id ??
                                  todayExercises[0]?.id ??
                                  null
                            )
                          }
                          onPrint={() => void openWorkoutPrint(todaySelectedSession, todayExercises)}
                          printDisabled={loadingWorkoutPrint || todayExercises.length === 0}
                          printLoading={loadingWorkoutPrint}
                        />
                      </div>
                    )}
                    {/* ETAPA 1 v2 — Hero full-bleed: Card glass + Progress Capsule + CTA único */}
                    <Card variant="glass" className={`p-6 space-y-4 border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED] ${modernMobileChrome ? 'hidden lg:block' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1 space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm text-[#E8EDED]/70">{treinoDiaTitulo}</p>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${
                              todaySelectedSession.status === 'done'
                                ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] ring-[#4CCB7A]/35'
                                : todaySelectedSession.status === 'skipped'
                                ? 'bg-red-500/15 text-red-300 ring-red-400/30'
                                : 'bg-white/10 text-[#E8EDED]/75 ring-white/10'
                            }`}>
                              {todaySelectedSession.status === 'done' ? 'Concluído' : todaySelectedSession.status === 'skipped' ? 'Pulado' : 'Agendado'}
                            </span>
                          </div>
                          <h2 className="text-2xl font-semibold leading-tight text-[#E8EDED]">
                            {todaySelectedSession.title}
                          </h2>
                          <p className="text-sm text-[#E8EDED]/70">
                            {progress.total} exercícios • {progress.percentage}% • {progress.done}/{progress.total}
                          </p>
                          {/* Progress Capsule: pill com track + fill em gradiente + texto à direita */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-300"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-[#E8EDED]/70 tabular-nums">
                              {isSelectedHojeToday ? 'Hoje' : selectedDayLabel}: {progress.percentage}%
                            </span>
                          </div>
                        </div>
                        {todayMuscleImageUrl && !muscleImageFailed ? (
                          <div className="w-[88px] sm:w-[120px] shrink-0 self-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={todayMuscleImageUrl}
                              alt={`Músculos do dia: ${todayMuscleGroups.join(', ')}`}
                              className="w-full h-auto object-contain drop-shadow-[0_8px_24px_rgba(76,203,122,0.25)]"
                              loading="lazy"
                              onError={() => setMuscleImageFailed(true)}
                            />
                          </div>
                        ) : null}
                      </div>
                      {nextExercise === null ? (
                        <PrimaryCTA
                          onClick={() =>
                            startWorkout(todaySelectedSession, todayExercises[0]?.id ?? null)
                          }
                          disabled={todayExercises.length === 0}
                        >
                          <CheckCircle className="w-5 h-5" />
                          Treino concluído
                        </PrimaryCTA>
                      ) : (
                        <PrimaryCTA
                          onClick={() =>
                            startWorkout(
                              todaySelectedSession,
                              nextExercise?.id ??
                                todayExercises.find((ex) => ex.status !== 'done' && ex.status !== 'skipped')?.id ??
                                todayExercises[0]?.id ??
                                null
                            )
                          }
                        >
                          <Play className="w-5 h-5" />
                          {isPersonalTrainerMode
                            ? progress.percentage > 0
                              ? 'Acompanhar treino'
                              : 'Iniciar treino'
                            : 'Iniciar treino'}
                        </PrimaryCTA>
                      )}
                      <button
                        type="button"
                        onClick={() => void openWorkoutPrint(todaySelectedSession, todayExercises)}
                        disabled={loadingWorkoutPrint || todayExercises.length === 0}
                        className="w-full py-2.5 px-4 rounded-xl font-semibold text-[#E8EDED] bg-white/5 hover:bg-white/10 ring-1 ring-white/15 border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loadingWorkoutPrint ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                        Imprimir treino
                      </button>
                    </Card>

                    {/* ETAPA 4 v2 — Seletor de sessões: segmented pills sticky (blur + hairline) */}
                    {todaySessions.length > 1 && (
                      <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-[#0A1F44]/85 backdrop-blur-md border-b border-white/10">
                        <div className="overflow-x-auto pb-1 -mx-1 scrollbar-thin">
                          <div className="flex gap-2 min-w-0 w-max max-w-full">
                            {todaySessions.map((session) => {
                              const isSelected = selectedTodaySessionId === session.id;
                              return (
                                <button
                                  key={session.id}
                                  onClick={() => handleSelectTodaySession(session.id!)}
                                  className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all text-left ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] text-[#0A1F44] shadow-[0_10px_24px_-12px_rgba(76,203,122,0.55)] ring-1 ring-[#4CCB7A]/35'
                                      : 'bg-white/5 text-[#E8EDED]/75 hover:bg-white/10 ring-1 ring-transparent'
                                  }`}
                                >
                                  <span className="block">{session.title}</span>
                                  <span className="block text-xs mt-0.5 opacity-80">
                                    {[
                                      session.scheduledDate ? (session.scheduledDate === toLocalYYYYMMDD(new Date()) ? 'Hoje' : session.scheduledDate) : null,
                                      session.status === 'done' ? 'Concluído' : session.status === 'skipped' ? 'Pulado' : session.status === 'scheduled' ? 'Agendado' : null,
                                    ].filter(Boolean).join(' • ')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 3 v2 — Ver todos: lista premium com expand inline (hairline, accent bar, 1 expand por vez) */}
                    <Card variant="solid" className={`overflow-hidden p-0 border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED] shadow-[0_16px_32px_-16px_rgba(76,203,122,0.3)] ${modernMobileChrome ? 'max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none' : ''}`}>
                      {modernMobileChrome && (
                        <div className="lg:hidden">
                          <PersonalExerciseListHeader
                            expanded={showAllExercises}
                            onToggle={() => setShowAllExercises((v) => !v)}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAllExercises((v) => !v)}
                        className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left font-semibold text-[#E8EDED] hover:bg-white/5 transition-colors ${modernMobileChrome ? 'hidden lg:flex' : ''}`}
                      >
                        <span>Ver todos os exercícios</span>
                        <ChevronRight
                          className={`w-5 h-5 flex-shrink-0 transition-transform ${showAllExercises ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {showAllExercises && (
                        <div className={`border-t border-white/10 ${modernMobileChrome ? 'max-lg:overflow-hidden max-lg:rounded-b-[22px] max-lg:border max-lg:border-t-0 max-lg:border-[rgba(145,180,230,0.20)] max-lg:bg-[#0B2042]' : ''}`}>
                          {todayExercises.map((exercise, index) => {
                            const isDone = exercise.status === 'done';
                            const isSkipped = exercise.status === 'skipped';
                            const rowId = exercise.id ?? `idx-${index}`;
                            const isExpanded = expandedExerciseId === rowId;
                            return (
                              <div key={rowId}>
                                <div
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${
                                    isDone ? 'border-l-2 border-l-[#4CCB7A]' : isSkipped ? 'border-l-2 border-l-red-400' : 'border-l-2 border-l-transparent'
                                  }`}
                                  onClick={() => setExpandedExerciseId(isExpanded ? null : rowId)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => e.key === 'Enter' && setExpandedExerciseId(isExpanded ? null : rowId)}
                                >
                                  {exercise.gifUrl && (
                                    <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
                                      <img src={exercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#E8EDED] truncate">
                                      {translateExerciseName(exercise.name)}
                                    </p>
                                    <p className="text-xs text-[#E8EDED]/65 tabular-nums">
                                      {formatTrainingSeriesSummary(exercise.prescription)}
                                    </p>
                                    <WorkoutSequencePreview exercise={exercise} />
                                  </div>
                                  {(isDone || isSkipped) && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                      isDone ? 'bg-[#4CCB7A]/15 text-[#4CCB7A]' : 'bg-red-500/15 text-red-300'
                                    }`}>
                                      {isDone ? 'Feito' : 'Pulei'}
                                    </span>
                                  )}
                                  <ChevronRight className={`w-4 h-4 flex-shrink-0 text-[#E8EDED]/55 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-1 border-t border-white/10 bg-white/[0.03]">
                                    <div className="flex gap-2 flex-wrap mb-3">
                                      <span className={`${ui.pill} bg-[#4CCB7A]/15 text-[#4CCB7A] ring-[#4CCB7A]/35`}>{translateTarget(exercise.target)}</span>
                                      {exercise.equipment && exercise.equipment !== 'body weight' && (
                                        <span className={`${ui.pill} bg-white/10 text-[#E8EDED]/75 ring-white/10`}>{translateEquipment(exercise.equipment)}</span>
                                      )}
                                    </div>
                                    {!isDone && !isSkipped ? (
                                      <div className="flex gap-2">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); exercise.id && handleMarkExercise(exercise.id, 'done'); }} disabled={savingStatus} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold ${ui.btnSuccess} disabled:opacity-50`}>
                                          <CheckCircle className="w-4 h-4" /> Feito
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); exercise.id && handleMarkExercise(exercise.id, 'skipped'); }} disabled={savingStatus} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold ${ui.btnDanger} disabled:opacity-50`}>
                                          <XCircle className="w-4 h-4" /> Pulei
                                        </button>
                                      </div>
                                    ) : (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); exercise.id && handleMarkExercise(exercise.id, null); }} disabled={savingStatus} className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold ${ui.btnGhost} disabled:opacity-50`}>
                                        <X className="w-4 h-4" /> Desfazer
                                      </button>
                                    )}
                                  </div>
                                )}
                                {index < todayExercises.length - 1 && <div className="border-t border-white/10" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                {/* ETAPA 5 v2 — Notas: mobile = card compacto + bottom sheet; desktop = inline */}
                <div ref={notesSectionRef} className="scroll-mt-4">
                  {isMobile || isPatientAppShell ? (
                    <>
                      {(isPatientAppShell || isProfessionalEmbed) && (
                        <div className="lg:hidden">
                          <PersonalNotesHeader onEdit={() => setNotesSheetOpen(true)} />
                        </div>
                      )}
                      <Card variant="glass" className={`p-4 border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED] ${isPatientAppShell || (isProfessionalEmbed && isMobile) ? 'hidden lg:block' : ''}`}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-[#E8EDED]">Observações</h3>
                          <button type="button" onClick={() => setNotesSheetOpen(true)} className="text-sm font-medium text-[#4CCB7A] hover:underline">
                            Editar
                          </button>
                        </div>
                        <p className="text-sm text-[#E8EDED]/70 line-clamp-2 min-h-[2.5rem]">
                          {patientNotes.trim() || 'Nenhuma observação.'}
                        </p>
                      </Card>
                      {notesSheetOpen && (
                        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 dark:bg-black/60" onClick={() => setNotesSheetOpen(false)}>
                          <div className="bg-[#0A1F44] rounded-t-2xl border border-white/10 max-h-[85vh] flex flex-col text-[#E8EDED]" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-[#E8EDED]">Observações do treino</h3>
                              <button type="button" onClick={() => setNotesSheetOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-[#E8EDED]/70">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                              <textarea
                                value={patientNotes}
                                onChange={(e) => setPatientNotes(e.target.value)}
                                className="w-full px-3 py-2.5 border border-white/15 rounded-xl bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 min-h-[120px] outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 focus:border-[#4CCB7A]/50"
                                rows={5}
                                placeholder="Como foi o treino? (energia, cargas, dor, observações)"
                              />
                            </div>
                            <div className="p-4 border-t border-white/10">
                              <button
                                onClick={async () => {
                                  if (!selectedTodaySessionId) return;
                                  setSavingNotes(true);
                                  try {
                                    await trainingSessionService.updateSession(selectedTodaySessionId, { patientNotes });
                                    alert('Observações salvas com sucesso!');
                                    setNotesSheetOpen(false);
                                  } catch (error) {
                                    console.error('Erro ao salvar observações:', error);
                                    alert('Erro ao salvar observações. Tente novamente.');
                                  } finally {
                                    setSavingNotes(false);
                                  }
                                }}
                                disabled={savingNotes}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${ui.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {savingNotes ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4" /> Salvar</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card variant="solid" className="p-4 sm:p-6 space-y-4 border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED]">
                      <h3 className="text-xl font-semibold text-[#E8EDED]">Observações do treino</h3>
                      <textarea
                        value={patientNotes}
                        onChange={(e) => setPatientNotes(e.target.value)}
                        className="w-full px-3 py-2.5 border border-white/15 rounded-xl bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 focus:ring-2 focus:ring-[#4CCB7A]/35 focus:border-[#4CCB7A]/50 transition-colors"
                        rows={3}
                        placeholder="Como foi o treino? (energia, cargas, dor, observações)"
                      />
                      <button
                        onClick={async () => {
                          if (!selectedTodaySessionId) return;
                          setSavingNotes(true);
                          try {
                            await trainingSessionService.updateSession(selectedTodaySessionId, { patientNotes });
                            alert('Observações salvas com sucesso!');
                          } catch (error) {
                            console.error('Erro ao salvar observações:', error);
                            alert('Erro ao salvar observações. Tente novamente.');
                          } finally {
                            setSavingNotes(false);
                          }
                        }}
                        disabled={savingNotes}
                        className={`min-w-[140px] px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 ${ui.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {savingNotes ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4" /> Salvar observações</>}
                      </button>
                    </Card>
                  )}
                </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </Surface>
        )}

        {activeTab === 'cronograma' && (
          <div className="space-y-6">
            {futureSessionToast && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium bg-[#0A1F44]/85 text-[#E8EDED] border border-white/10 shadow-[0_8px_20px_-12px_rgba(76,203,122,0.45)] text-center">
                {futureSessionToast}
              </div>
            )}
            {/* Controles do calendário */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 space-y-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
              {/* Toggle Mês/Semana */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#E8EDED]">
                  Visualização
                </h3>
                <div className="flex items-center gap-1 bg-white/[0.06] rounded-xl p-1 ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => setVisualizacaoCalendario('mes')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      visualizacaoCalendario === 'mes'
                        ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-[0_8px_18px_-10px_rgba(76,203,122,0.7)]'
                        : 'text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualizacaoCalendario('semana')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      visualizacaoCalendario === 'semana'
                        ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-[0_8px_18px_-10px_rgba(76,203,122,0.7)]'
                        : 'text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]'
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>

              {/* Toggles para mostrar eventos */}
              <div>
                <h3 className="text-sm font-semibold text-[#E8EDED] mb-3">
                  Mostrar no calendário
                </h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTreinosToggle}
                      onChange={(e) => setShowTreinosToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#E8EDED]/85">Treinos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAplicacoesToggle}
                      onChange={(e) => setShowAplicacoesToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#E8EDED]/85">Aplicações</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInjetaveisToggle}
                      onChange={(e) => setShowInjetaveisToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#E8EDED]/85">Injetáveis</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPagamentosToggle}
                      onChange={(e) => setShowPagamentosToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#E8EDED]/85">Pagamentos</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Calendário */}
            {visualizacaoCalendario === 'mes' ? (
            <CalendarioComponent
              mesCalendario={mesCalendario}
              setMesCalendario={setMesCalendario}
              diaSelecionado={diaSelecionado}
              setDiaSelecionado={setDiaSelecionado}
              sessoes={showTreinosToggle ? sessoesCalendario : []}
              aplicacoes={showAplicacoesToggle ? aplicacoesCalendario : []}
              injetaveis={showInjetaveisToggle ? injetaveisCalendario : []}
              pagamentos={showPagamentosToggle ? pagamentosCalendario : []}
              aplicacaoSelecionada={aplicacaoSelecionada}
              setAplicacaoSelecionada={setAplicacaoSelecionada}
              pagamentoSelecionado={pagamentoSelecionado}
              setPagamentoSelecionado={setPagamentoSelecionado}
              onSessionClick={handleViewSessionDetail}
            />
            ) : (
              <CalendarioSemanalComponent
                semanaCalendario={semanaCalendario}
                setSemanaCalendario={setSemanaCalendario}
                diaSelecionado={diaSelecionado}
                setDiaSelecionado={setDiaSelecionado}
                sessoes={showTreinosToggle ? sessoesCalendario : []}
                aplicacoes={showAplicacoesToggle ? aplicacoesCalendario : []}
                injetaveis={showInjetaveisToggle ? injetaveisCalendario : []}
                pagamentos={showPagamentosToggle ? pagamentosCalendario : []}
                aplicacaoSelecionada={aplicacaoSelecionada}
                setAplicacaoSelecionada={setAplicacaoSelecionada}
                pagamentoSelecionado={pagamentoSelecionado}
                setPagamentoSelecionado={setPagamentoSelecionado}
                onSessionClick={handleViewSessionDetail}
              />
            )}

            {/* ETAPA 0 — Apenas mensagem quando nada selecionado; detalhe no modal overlay */}
            <div ref={sessionDetailRef} className="scroll-mt-4">
              {!selectedSessionForDetail && (
                <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-6 text-center shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                  <p className="text-sm text-[#E8EDED]/75">Selecione um treino no calendário para ver os detalhes.</p>
                </div>
              )}
            </div>

            {/* Modal overlay do treino (Cronograma) — ETAPA 1: bottom-sheet mobile / centralizado desktop */}
            {selectedSessionForDetail && (
              <div
                className="fixed inset-0 z-[80] flex items-stretch justify-center p-0 bg-black/60"
                onClick={(e) => e.target === e.currentTarget && (setSelectedSessionForDetail(null), setSelectedSessionExercisesDetail([]))}
              >
                <div
                  className="w-full h-screen bg-[#0A1F44] border-0 shadow-2xl flex flex-col overflow-hidden text-[#E8EDED]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header do modal: título + data + X + chips + mini progresso */}
                  <div className="bg-[#0A1F44]/95 backdrop-blur-sm border-b border-white/10 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-semibold text-[#E8EDED] truncate">{selectedSessionForDetail.title}</h2>
                        <p className="text-sm text-[#E8EDED]/70 mt-0.5">
                          {new Date(selectedSessionForDetail.scheduledDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <button type="button" onClick={() => { setSelectedSessionForDetail(null); setSelectedSessionExercisesDetail([]); }} className="p-2 rounded-full hover:bg-white/10 text-[#E8EDED]/75 flex-shrink-0" aria-label="Fechar">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-white/10 ${
                        selectedSessionForDetail.status === 'done' ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                          : selectedSessionForDetail.status === 'skipped' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-white/10 text-[#E8EDED]/85'
                      }`}>
                        {selectedSessionForDetail.status === 'done' ? 'Feito' : selectedSessionForDetail.status === 'skipped' ? 'Pulou' : 'Agendado'}
                      </span>
                      <span className="text-xs text-[#E8EDED]/65">{selectedProgress.totalCount} exercícios • {selectedProgress.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all" style={{ width: `${selectedProgress.percent}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => void openWorkoutPrint(selectedSessionForDetail, selectedSessionExercisesDetail)}
                      disabled={loadingWorkoutPrint || selectedSessionExercisesDetail.length === 0}
                      className="w-full py-2 px-3 rounded-xl text-sm font-semibold text-[#E8EDED] bg-white/5 hover:bg-white/10 border border-white/15 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingWorkoutPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      Imprimir treino
                    </button>
                  </div>

                  {/* Conteúdo rolável: Timer Bar (ETAPA 2–4), Próximo, Ver todos */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {/* Timer Bar: estado A (não iniciado) ou B (em andamento) ou descanso */}
                    <div className="rounded-xl border border-white/10 bg-[#06152e]/80 p-4 space-y-3">
                      <p className="text-sm font-medium text-[#E8EDED]/85">Treino em andamento</p>
                      {restFinishedBadge ? (
                        <div className="py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium text-center">Descanso finalizado</div>
                      ) : restSecondsLeft != null ? (
                        <WorkoutRunRestTimer
                          compact
                          secondsLeft={restSecondsLeft}
                          totalSeconds={restTotalSec ?? restSecondsLeft}
                          running={isRestRunning}
                          logoSrc={restLogoSrc}
                          logoAlt={restLogoAlt}
                          onTogglePause={() => setIsRestRunning((r) => !r)}
                          onSkip={() => {
                            setIsRestRunning(false);
                            setRestSecondsLeft(null);
                            const list = runExercisesRef.current;
                            const next = list?.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
                            setActiveRunExerciseId(next?.id ?? null);
                          }}
                        />
                      ) : isWorkoutRunning && activeRunSession?.id === selectedSessionForDetail?.id ? (
                        <div className="space-y-3">
                          <div className="text-2xl font-mono font-bold text-[#E8EDED] tabular-nums text-center">
                            {String(Math.floor(workoutElapsedSec / 60)).padStart(2, '0')}:{String(workoutElapsedSec % 60).padStart(2, '0')}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => setWorkoutPaused((p) => !p)} className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${ui.btnGhost}`}>
                              {workoutPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                              {workoutPaused ? 'Continuar' : 'Pausar'}
                            </button>
                            <button type="button" onClick={() => setWorkoutElapsedSec(0)} className={`py-2 px-3 rounded-lg text-sm font-semibold ${ui.btnGhost}`}>Reset</button>
                            <button type="button" onClick={() => setRestSoundEnabled((e) => !e)} className="p-2 rounded-lg hover:bg-white/10 text-[#E8EDED]/70" title={restSoundEnabled ? 'Desligar som' : 'Ligar som'}>
                              {restSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </button>
                          </div>
                          <p className="text-xs text-[#E8EDED]/60">Descanso padrão (próximo Feito):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[30, 45, 60, 90, 120].map((sec) => (
                              <button key={sec} type="button" onClick={() => setRestDefaultSec(sec)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${restDefaultSec === sec ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/15'}`}>
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-[#E8EDED]/60">Descanso padrão: {restDefaultSec}s</p>
                          <div className="flex gap-2 flex-wrap">
                            {[30, 45, 60, 90, 120].map((sec) => (
                              <button key={sec} type="button" onClick={() => setRestDefaultSec(sec)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${restDefaultSec === sec ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/15'}`}>
                                {sec}s
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => { setActiveTab('hoje'); setSelectedSessionForDetail(null); setSelectedSessionExercisesDetail([]); }} className="w-full py-2 px-3 rounded-xl text-sm font-medium bg-white/10 text-[#E8EDED] hover:bg-white/15 transition-colors border border-white/15">
                            Abrir em Hoje
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Próximo exercício */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#E8EDED] mb-3">Próximo exercício</h3>
                      {selectedSessionExercisesDetail.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-[#06152e]/80 p-6">
                          <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-white/10 rounded w-3/4" />
                            <div className="h-20 bg-white/10 rounded" />
                          </div>
                          <p className="text-sm text-[#E8EDED]/65 mt-2">Carregando exercícios...</p>
                        </div>
                      ) : !selectedNextExercise ? (
                        <div className="rounded-2xl border border-white/10 bg-[#06152e]/80 p-6 text-center">
                          <p className="text-[#E8EDED]/75">Treino concluído 🎉</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-[#06152e]/80 p-4 overflow-hidden">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {selectedNextExercise.gifUrl && (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-white/10">
                                <img src={selectedNextExercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              <h4 className="font-semibold text-[#E8EDED]">{translateExerciseName(selectedNextExercise.name)}</h4>
                              <div className="flex gap-2 flex-wrap">
                                <span className={`${ui.pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>{translateTarget(selectedNextExercise.target)}</span>
                                {selectedNextExercise.equipment && selectedNextExercise.equipment !== 'body weight' && (
                                  <span className={`${ui.pill} bg-white/10 text-[#E8EDED]/85`}>{translateEquipment(selectedNextExercise.equipment)}</span>
                                )}
                              </div>
                              {selectedNextExercise.prescription && (
                                <p className="text-sm text-[#E8EDED]/70">
                                  {formatTrainingSeriesSummary(selectedNextExercise.prescription)}
                                  {` • ${getEffectiveRestSec(selectedNextExercise.prescription)}s descanso`}
                                </p>
                              )}
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!selectedSessionForDetail?.id || !selectedNextExercise?.id) return;
                                    await handleMarkCalendarExercise(selectedSessionForDetail.id, selectedNextExercise.id, 'done');
                                    if (timerAutoStart) {
                                      const restSec = getEffectiveRestSec(selectedNextExercise.prescription);
                                      setRestTotalSec(restSec);
                                      setRestSecondsLeft(restSec);
                                      setIsRestRunning(true);
                                    }
                                  }}
                                  disabled={savingStatus}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold ${ui.btnSuccess} disabled:opacity-50`}
                                >
                                  <CheckCircle className="w-4 h-4" /> Feito
                                </button>
                                <button type="button" onClick={() => selectedSessionForDetail.id && selectedNextExercise.id && handleMarkCalendarExercise(selectedSessionForDetail.id, selectedNextExercise.id, 'skipped')} disabled={savingStatus} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold ${ui.btnDanger} disabled:opacity-50`}>
                                  <XCircle className="w-4 h-4" /> Pulei
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ver todos os exercícios (accordion) */}
                    <div className="rounded-2xl border border-white/10 bg-[#06152e]/80 overflow-hidden p-0">
                      <button type="button" onClick={() => setShowAllCalendarExercises((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left font-semibold text-[#E8EDED] hover:bg-white/10 transition-colors">
                        <span>Ver todos os exercícios</span>
                        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${showAllCalendarExercises ? 'rotate-90' : ''}`} />
                      </button>
                      {showAllCalendarExercises && (
                        <div className={ui.hairline}>
                          {selectedSessionExercisesDetail.map((exercise, index) => (
                            <div key={exercise.id ?? index} className={`px-4 py-3 flex items-center gap-3 ${index > 0 ? ui.hairline : ''} ${exercise.status === 'done' ? 'border-l-2 border-l-green-500' : exercise.status === 'skipped' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'}`}>
                              {exercise.gifUrl && (
                                <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
                                  <img src={exercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#E8EDED] truncate">{translateExerciseName(exercise.name)}</p>
                                <p className="text-xs text-[#E8EDED]/60">{formatTrainingSeriesSummary(exercise.prescription)}</p>
                                <WorkoutSequencePreview exercise={exercise} />
                              </div>
                              {(exercise.status === 'done' || exercise.status === 'skipped') && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${exercise.status === 'done' ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                  {exercise.status === 'done' ? 'Feito' : 'Pulei'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button onClick={() => selectedSessionForDetail.id && handleDeleteSession(selectedSessionForDetail.id)} disabled={deletingSession} className="w-full py-2.5 px-4 rounded-xl font-semibold text-red-300 border border-red-500/40 bg-red-500/10 hover:bg-red-500/15 disabled:opacity-50 flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> {deletingSession ? 'Cancelando...' : 'Cancelar treino'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'criar' && (
          <div className="space-y-3">
            <div
              className={`grid gap-1.5 rounded-xl border border-white/10 bg-[#0A1F44]/70 p-1.5 ${
                canViewWorkoutLibrary ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <button
                type="button"
                onClick={() => requestCriarTab('novo')}
                className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                  criarTab === 'novo'
                    ? 'bg-[#4CCB7A] text-[#0A1F44]'
                    : 'text-[#E8EDED]/80 hover:bg-white/10'
                }`}
              >
                <span className="hidden sm:inline">Novo Treino</span>
                <span className="sm:hidden">Novo</span>
              </button>
              <button
                type="button"
                onClick={() => requestCriarTab('salvos')}
                className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                  criarTab === 'salvos'
                    ? 'bg-[#4CCB7A] text-[#0A1F44]'
                    : 'text-[#E8EDED]/80 hover:bg-white/10'
                }`}
              >
                <span className="hidden sm:inline">Treinos Salvos</span>
                <span className="sm:hidden">Salvos</span>
              </button>
              {canViewWorkoutLibrary && (
                <button
                  type="button"
                  onClick={() => requestCriarTab('biblioteca')}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    criarTab === 'biblioteca'
                      ? 'bg-[#4CCB7A] text-[#0A1F44]'
                      : 'text-[#E8EDED]/80 hover:bg-white/10'
                  }`}
                >
                  Biblioteca
                </button>
              )}
            </div>

            {criarTab === 'salvos' && (
              <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/90 p-4 space-y-3 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-[#E8EDED]">Treinos salvos</h3>
                    <p className="text-xs text-[#E8EDED]/65">
                      Desative um treino para criar outro sem apagar o anterior.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4CCB7A]/15 text-[#4CCB7A] border border-[#4CCB7A]/35">
                    {savedSessionsCriarGrouped.length}
                  </span>
                </div>
                {loadingSavedSessionsCriar ? (
                  <div className="py-6 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#4CCB7A]" />
                  </div>
                ) : savedSessionsCriarGrouped.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#E8EDED]/70 text-center">
                    Ainda não há treinos salvos para este paciente.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {savedSessionsCriarGrouped.map((group) => {
                      const firstSession = group.sessions[0];
                      const groupActive = group.active;
                      const toggling = togglingSavedGroupKey === group.key;
                      return (
                        <div
                          key={group.key}
                          className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 ${
                            groupActive ? '' : 'opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#E8EDED] truncate">{group.title}</p>
                              <p className="text-xs text-[#E8EDED]/65 mt-0.5">
                                {group.dateLabel}
                                {group.isRecurring ? ` • ${group.count} ocorrências` : ''}
                              </p>
                            </div>
                            <div className="flex items-start gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  group.isRecurring
                                    ? handleDeleteSavedGroup(group.sessions)
                                    : firstSession?.id && handleDeleteSavedSession(firstSession.id)
                                }
                                disabled={deletingSession || blockProfessionalMutations}
                                className="p-1.5 rounded-lg text-red-300/80 hover:text-red-300 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
                                aria-label={group.isRecurring ? 'Deletar série' : 'Deletar treino'}
                              >
                                {deletingSession ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={groupActive}
                                  aria-label={groupActive ? 'Desativar treino' : 'Ativar treino'}
                                  disabled={blockProfessionalMutations || toggling}
                                  onClick={() => void handleToggleSavedGroupActive(group, !groupActive)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4CCB7A] disabled:cursor-not-allowed disabled:opacity-50 ${
                                    groupActive ? 'bg-[#4CCB7A]' : 'bg-white/20'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow mt-1 transition duration-200 ${
                                      groupActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-[11px] font-semibold ${
                                    groupActive ? 'text-[#4CCB7A]' : 'text-[#E8EDED]/55'
                                  }`}
                                >
                                  {toggling ? 'Salvando...' : groupActive ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                !groupActive
                                  ? 'bg-white/5 text-[#E8EDED]/55 border-white/10'
                                  : group.status === 'done'
                                  ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] border-[#4CCB7A]/35'
                                  : group.status === 'skipped'
                                  ? 'bg-red-500/15 text-red-300 border-red-400/30'
                                  : 'bg-white/10 text-[#E8EDED]/75 border-white/15'
                              }`}
                            >
                              {!groupActive
                                ? 'Fora da rotina'
                                : group.status === 'done'
                                ? 'Feito'
                                : group.status === 'skipped'
                                ? 'Pulado'
                                : 'Agendado'}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => firstSession && handleEditSavedSession(firstSession, group.sessions)}
                              className="min-h-[40px] rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/10 text-[#4CCB7A] text-sm font-semibold hover:bg-[#4CCB7A]/15 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void openWorkoutPrint(firstSession)}
                              disabled={loadingWorkoutPrint || !firstSession?.id}
                              className="min-h-[40px] rounded-lg border border-white/20 bg-white/5 text-[#E8EDED] text-sm font-semibold hover:bg-white/10 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              {loadingWorkoutPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                              Imprimir treino
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {criarTab === 'novo' && (
            <div className="space-y-3">
            {editingSessionIds.length > 0 && (
              <div className="rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/10 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
                <p className="text-xs text-[#E8EDED]">
                  Editando {editingSessionIds.length > 1 ? 'série recorrente' : 'treino'}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSessionIds([]);
                    setEditingRecurrenceGroupId(null);
                    setSessionType('single');
                    setRecurrenceFrequency('weekly');
                    setWeeksCount(4);
                    setTimesPerWeek(3);
                    setSelectedDaysOfWeek([]);
                  }}
                  className="px-2.5 py-1 rounded-md border border-white/20 bg-white/10 text-[11px] font-semibold text-[#E8EDED] hover:bg-white/15 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-[#0A1F44]/70 p-3 space-y-2.5 lg:hidden">
              {renderCriarSessionMeta()}
            </div>

            {workoutLibraryDraftActions ? (
              <div className="lg:hidden shrink-0">{workoutLibraryDraftActions}</div>
            ) : null}

            <div className="lg:hidden h-[min(80vh,44rem)] min-h-[28rem] pb-24">
              {criarCatalogPanel('grid')}
            </div>

            <PersonalCreateWorkoutDesktop
              catalog={criarCatalogPanel('list')}
              title={newSessionTitle}
              exercises={selectedExercises}
              expandedIds={expandedExerciseIds}
              gifUrlFor={(exercise) => resolveExerciseGifUrl(exercise, EXERCISE_GIF_RESOLUTION)}
              readOnly={blockProfessionalMutations}
              dirty={isWorkoutDraftDirty}
              saving={creatingSession}
              canSave={canSaveWorkoutDraft}
              saveLabel={editingSessionIds.length > 0 ? 'Atualizar treino' : 'Salvar treino'}
              headerExtra={renderCriarSessionMeta()}
              toolbar={workoutLibraryDraftActions}
              onToggleExpanded={toggleExerciseExpanded}
              onSeriesChange={updateExerciseSeries}
              onIntercalationsChange={updateExerciseIntercalations}
              onPickIntercalation={pickIntercalationForExercise}
              onRepeatIntercalation={repeatIntercalationForExercise}
              onTrainerNoteChange={updateExerciseTrainerNote}
              onDuplicate={duplicateExerciseInSession}
              onRemove={removeExerciseFromSession}
              onReorder={reorderExercisesInSession}
              onSave={() => void handleCreateSession()}
            />

            {/* FAB + sheet no body, acima do shell fullscreen (z-200) */}
            {criarPortalReady &&
              createPortal(
                <>
                  {!criarTreinoSheetOpen && (
                    <div
                      className="fixed z-[220] right-4 lg:hidden"
                      style={{
                        bottom: modernMobileChrome
                          ? 'calc(6rem + env(safe-area-inset-bottom, 0px))'
                          : 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setCriarTreinoSheetOpen(true)}
                        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#4CCB7A] text-[#0A1F44] shadow-[0_10px_28px_-8px_rgba(76,203,122,0.65)] hover:bg-[#45b86d] active:scale-95 transition-transform"
                        aria-label={
                          selectedExercises.length > 0
                            ? `Treino com ${selectedExercises.length} exercício${selectedExercises.length === 1 ? '' : 's'}`
                            : 'Abrir treino selecionado'
                        }
                      >
                        <Save className="w-6 h-6" />
                        {selectedExercises.length > 0 && (
                          <span
                            key={selectedExercises.length}
                            className="absolute -top-1.5 -right-1.5 min-w-[1.375rem] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none flex items-center justify-center shadow-md ring-2 ring-[#0A1F44] tabular-nums"
                            style={{ height: '1.375rem' }}
                          >
                            {selectedExercises.length > 99 ? '99+' : selectedExercises.length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {criarTreinoSheetOpen && (
                    <div
                      className="fixed inset-0 z-[220] flex h-[100dvh] max-h-[100dvh] flex-col justify-end overflow-hidden overscroll-none touch-none"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="criar-treino-sheet-title"
                    >
                      <div
                        className="absolute inset-0 bg-black/50 touch-none"
                        onClick={() => setCriarTreinoSheetOpen(false)}
                        aria-hidden
                      />
                      <div className="relative z-10 flex w-full max-h-[min(82vh,640px)] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0A1F44] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.55)] touch-auto pb-[env(safe-area-inset-bottom,0px)]">
                        <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
                          <h3 id="criar-treino-sheet-title" className="text-sm font-semibold text-[#E8EDED]">
                            Treino
                            <span className="ml-1.5 text-[#4CCB7A] tabular-nums">({selectedExercises.length})</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setCriarTreinoSheetOpen(false)}
                            className="p-1.5 rounded-full text-[#E8EDED]/70 hover:bg-white/10"
                            aria-label="Fechar"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        {workoutLibraryDraftActions ? (
                          <div className="shrink-0 px-3 pt-2">{workoutLibraryDraftActions}</div>
                        ) : null}

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-3 space-y-2">
                          {selectedExercises.length === 0 ? (
                            <p className="text-center py-8 text-xs text-[#E8EDED]/50">
                              Toque em um exercício acima para montar o treino.
                            </p>
                          ) : (
                            selectedExercises.map((exercise, index) => {
                              const gifSrc = resolveExerciseGifUrl(exercise, EXERCISE_GIF_RESOLUTION);
                              return (
                                <div
                                  key={exercise.draftId}
                                  className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden"
                                >
                                  <div className="p-2 space-y-1.5">
                                    <div className="flex items-start gap-1.5">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-[#E8EDED] line-clamp-2 leading-snug">
                                          <span className="text-[#4CCB7A] tabular-nums mr-1">{index + 1}.</span>
                                          {translateExerciseName(exercise.name)}
                                        </p>
                                        {exercise.target && (
                                          <p className="text-[10px] text-[#E8EDED]/45 truncate mt-0.5">
                                            {translateTarget(exercise.target)}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeExerciseFromSession(exercise.draftId)}
                                        className="p-1.5 text-[#E8EDED]/45 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 transition-colors"
                                        aria-label={`Remover ${translateExerciseName(exercise.name)}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <ExerciseSeriesEditor
                                      series={exercise.prescription.series}
                                      onChange={(series) => updateExerciseSeries(exercise.draftId, series)}
                                      intercalations={exercise.prescription.intercalations || []}
                                      onIntercalationsChange={(intercalations) =>
                                        updateExerciseIntercalations(exercise.draftId, intercalations)
                                      }
                                      onPickIntercalation={(afterSeriesId) =>
                                        pickIntercalationForExercise(exercise.draftId, afterSeriesId)
                                      }
                                      onRepeatIntercalation={(afterSeriesId, source) =>
                                        repeatIntercalationForExercise(
                                          exercise.draftId,
                                          afterSeriesId,
                                          source
                                        )
                                      }
                                      hostGifSrc={gifSrc}
                                      readOnly={blockProfessionalMutations}
                                    />
                                    <ExerciseTrainerNoteField
                                      value={exercise.trainerNote || ''}
                                      readOnly={blockProfessionalMutations}
                                      onChange={(note) => updateExerciseTrainerNote(exercise.draftId, note)}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="p-3 border-t border-white/10 bg-[#0A1F44]">
                          <button
                            type="button"
                            onClick={() => void handleCreateSession()}
                            disabled={
                              creatingSession ||
                              !newSessionTitle ||
                              !newSessionDate ||
                              selectedExercises.length === 0 ||
                              (sessionType === 'recurring' &&
                                recurrenceFrequency === 'custom' &&
                                selectedDaysOfWeek.length === 0)
                            }
                            className="w-full h-11 px-3 bg-[#4CCB7A] text-[#0A1F44] rounded-lg hover:bg-[#45b86d] disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <Save className="w-4 h-4" />
                            {creatingSession
                              ? `${editingSessionIds.length > 0 ? 'Atualizando' : 'Publicando'}…`
                              : editingSessionIds.length > 0
                              ? 'Salvar alterações'
                              : sessionType === 'recurring'
                              ? 'Publicar treinos'
                              : 'Publicar treino'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>,
                document.body
              )}
          </div>
          )}

            {canViewWorkoutLibrary && criarTab === 'biblioteca' && (
              <div className="flex flex-col">
                {libraryOwnerUid ? (
                  <PersonalWorkoutTemplatesPanel
                    uid={libraryOwnerUid}
                    readOnly={!canMutateWorkoutLibrary}
                    onDirtyChange={setIsLibraryDraftDirty}
                  />
                ) : (
                  <p className="text-sm text-[#E8EDED]/60 p-4">
                    {canMutateWorkoutLibrary
                      ? 'Faça login para acessar a biblioteca.'
                      : 'Este paciente ainda não tem personal vinculado. A biblioteca aparece quando houver um personal ativo.'}
                  </p>
                )}
              </div>
            )}

            {canMutateWorkoutLibrary && user?.uid ? (
              <>
                <ImportWorkoutTemplateModal
                  open={importTemplateOpen}
                  uid={user.uid}
                  currentExerciseCount={selectedExercises.length}
                  onClose={() => setImportTemplateOpen(false)}
                  onImport={importFromWorkoutTemplate}
                  onGoToLibrary={() => {
                    setImportTemplateOpen(false);
                    requestCriarTab('biblioteca');
                  }}
                />
                <SaveWorkoutAsTemplateModal
                  open={saveAsTemplateOpen}
                  uid={user.uid}
                  suggestedName={newSessionTitle}
                  exercises={selectedExercises}
                  onClose={() => setSaveAsTemplateOpen(false)}
                />
              </>
            ) : null}
          </div>
        )}

        {activeTab === 'historico' && (
          <>
            {modernMobileChrome ? (
              <div className="lg:hidden">
                <PatientTrainingHistory
                  loading={loadingHistorico}
                  sessions={historicoSessionsFiltradas}
                  sessionsInRange={historicoSessionsRealizadas}
                  periodLabel={historicoPeriodoLabel}
                  view={visualizacaoHistoricoCalendario}
                  onViewChange={setVisualizacaoHistoricoCalendario}
                  selectedDay={diaHistoricoSelecionado}
                  onSelectDay={setDiaHistoricoSelecionado}
                  weekAnchor={semanaHistoricoCalendario}
                  onChangeWeek={setSemanaHistoricoCalendario}
                  monthAnchor={mesHistoricoCalendario}
                  onChangeMonth={setMesHistoricoCalendario}
                  selectedSession={selectedSessionDetail}
                  exercises={selectedSessionExercises}
                  executions={selectedHistoricoExecutions}
                  progress={historicoProgress}
                  nextExercise={historicoNextExercise}
                  showAllExercises={showAllHistoricoExercises}
                  onToggleAllExercises={() => setShowAllHistoricoExercises((value) => !value)}
                  onOpenSession={(session) => {
                    void handleViewHistoricoSession(session);
                  }}
                  onClearSelection={() => {
                    setSelectedSessionDetail(null);
                    setSelectedSessionExercises([]);
                    setSelectedHistoricoExecutions({});
                  }}
                  onPrint={() => {
                    if (!selectedSessionDetail) return;
                    void openWorkoutPrint(selectedSessionDetail, selectedSessionExercises);
                  }}
                  printing={loadingWorkoutPrint}
                />
              </div>
            ) : null}
            <div className={modernMobileChrome ? 'hidden space-y-6 lg:block' : 'space-y-6'}>
            <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 space-y-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#E8EDED]">Visualização do histórico</h3>
                <div className="flex items-center gap-1 bg-white/[0.06] rounded-xl p-1 ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => setVisualizacaoHistoricoCalendario('mes')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      visualizacaoHistoricoCalendario === 'mes'
                        ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-[0_8px_18px_-10px_rgba(76,203,122,0.7)]'
                        : 'text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualizacaoHistoricoCalendario('semana')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      visualizacaoHistoricoCalendario === 'semana'
                        ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-[0_8px_18px_-10px_rgba(76,203,122,0.7)]'
                        : 'text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]'
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#E8EDED]/70">
                Toque em um dia no calendário para ver os treinos realizados.
              </p>
            </div>

            {visualizacaoHistoricoCalendario === 'mes' ? (
              <CalendarioComponent
                mesCalendario={mesHistoricoCalendario}
                setMesCalendario={setMesHistoricoCalendario}
                diaSelecionado={diaHistoricoSelecionado}
                setDiaSelecionado={setDiaHistoricoSelecionado}
                sessoes={historicoSessionsRealizadas}
                aplicacoes={[]}
                injetaveis={[]}
                pagamentos={[]}
                aplicacaoSelecionada={historicoAplicacaoSelecionada}
                setAplicacaoSelecionada={setHistoricoAplicacaoSelecionada}
                pagamentoSelecionado={historicoPagamentoSelecionado}
                setPagamentoSelecionado={setHistoricoPagamentoSelecionado}
                onSessionClick={handleViewHistoricoSession}
              />
            ) : (
              <CalendarioSemanalComponent
                semanaCalendario={semanaHistoricoCalendario}
                setSemanaCalendario={setSemanaHistoricoCalendario}
                diaSelecionado={diaHistoricoSelecionado}
                setDiaSelecionado={setDiaHistoricoSelecionado}
                sessoes={historicoSessionsRealizadas}
                aplicacoes={[]}
                injetaveis={[]}
                pagamentos={[]}
                aplicacaoSelecionada={historicoAplicacaoSelecionada}
                setAplicacaoSelecionada={setHistoricoAplicacaoSelecionada}
                pagamentoSelecionado={historicoPagamentoSelecionado}
                setPagamentoSelecionado={setHistoricoPagamentoSelecionado}
                onSessionClick={handleViewHistoricoSession}
              />
            )}

            {loadingHistorico ? (
              <div className="flex justify-center py-12 rounded-2xl border border-white/10 bg-[#0A1F44]/85">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CCB7A]" />
              </div>
            ) : historicoSessionsRealizadas.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-12 text-center shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                <p className="text-[#E8EDED]/75">Nenhum treino realizado no histórico.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#E8EDED]/55">Treinos realizados</p>
                      <p className="text-sm text-[#E8EDED] font-semibold">{historicoPeriodoLabel}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4CCB7A]/15 text-[#4CCB7A] border border-[#4CCB7A]/35">
                      {historicoSessionsFiltradas.length} registros
                    </span>
                  </div>
                </div>

                {historicoSessionsFiltradas.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/80 p-8 text-center text-sm text-[#E8EDED]/70">
                    Nenhum treino realizado no período selecionado.
                  </div>
                ) : (
                  historicoSessionsFiltradas.map((session) => (
                  <div
                    key={session.id}
                    className="relative rounded-xl border border-white/15 bg-gradient-to-br from-[#0f2a5a]/85 via-[#0A1F44]/90 to-[#091936]/95 shadow-[0_16px_32px_-16px_rgba(76,203,122,0.35)] p-4 cursor-pointer hover:border-[#4CCB7A]/40 transition-all"
                    onClick={() => handleViewHistoricoSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[#E8EDED]">{session.title}</h3>
                        <p className="text-sm text-[#E8EDED]/70 mt-1">
                          {new Date(session.scheduledDate).toLocaleDateString('pt-BR')}
                        </p>
                        {session.patientNotes && (
                          <p className="text-sm text-[#E8EDED]/65 mt-1">
                            {session.patientNotes}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          session.status === 'done'
                            ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] border-[#4CCB7A]/35'
                            : session.status === 'skipped'
                            ? 'bg-red-500/15 text-red-300 border-red-400/30'
                            : 'bg-white/10 text-[#E8EDED]/75 border-white/20'
                        }`}
                      >
                        {session.status === 'done'
                          ? 'Feito'
                          : session.status === 'skipped'
                          ? 'Pulou'
                          : 'Agendado'}
                      </span>
                    </div>
                  </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 4 — Detalhe do treino inline (padrão Hoje/Cronograma) — sem modal */}
            <div ref={historicoDetailRef} data-historico-detail className="space-y-4 scroll-mt-4 mt-6">
              {!selectedSessionDetail ? (
                <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-6 text-center shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                  <p className="text-sm text-[#E8EDED]/70">
                    Selecione um treino na lista para ver os detalhes.
                  </p>
                </div>
              ) : (
                <>
                  <Card variant="solid" className="p-6 space-y-4 relative border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSessionDetail(null);
                        setSelectedSessionExercises([]);
                        setSelectedHistoricoExecutions({});
                      }}
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-[#E8EDED]/70"
                      aria-label="Limpar seleção"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-[#E8EDED] pr-10">{selectedSessionDetail.title}</h2>
                    <p className="text-sm text-[#E8EDED]/70">
                      {new Date(selectedSessionDetail.scheduledDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${
                        selectedSessionDetail.status === 'done' ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] ring-[#4CCB7A]/35'
                          : selectedSessionDetail.status === 'skipped' ? 'bg-red-500/15 text-red-300 ring-red-400/30'
                          : 'bg-white/10 text-[#E8EDED]/75 ring-white/10'
                      }`}>
                        {selectedSessionDetail.status === 'done' ? 'Feito' : selectedSessionDetail.status === 'skipped' ? 'Pulou' : 'Agendado'}
                      </span>
                    </div>
                    <p className="text-sm text-[#E8EDED]/70">{historicoProgress.totalCount} exercícios • {historicoProgress.percent}%</p>
                    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all" style={{ width: `${historicoProgress.percent}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => void openWorkoutPrint(selectedSessionDetail, selectedSessionExercises)}
                      disabled={loadingWorkoutPrint || selectedSessionExercises.length === 0}
                      className="w-full py-2.5 px-4 rounded-xl font-semibold text-[#E8EDED] bg-white/5 hover:bg-white/10 ring-1 ring-white/15 border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingWorkoutPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      Imprimir treino
                    </button>
                  </Card>
                  <div>
                    <h3 className="text-lg font-semibold text-[#E8EDED] mb-3">Próximo exercício</h3>
                    {selectedSessionExercises.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-6">
                        <p className="text-sm text-[#E8EDED]/70">Carregando exercícios...</p>
                      </div>
                    ) : !historicoNextExercise ? (
                      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-6 text-center">
                        <p className="text-[#E8EDED]/80">Treino concluído 🎉</p>
                      </div>
                    ) : (
                      <Card variant="solid" className="p-4 border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED]">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {historicoNextExercise.gifUrl && (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-white/10">
                              <img src={historicoNextExercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <h4 className="font-semibold text-[#E8EDED]">{translateExerciseName(historicoNextExercise.name)}</h4>
                            <div className="flex gap-2 flex-wrap">
                              <span className={`${ui.pill} bg-[#4CCB7A]/15 text-[#4CCB7A] ring-[#4CCB7A]/35`}>{translateTarget(historicoNextExercise.target)}</span>
                              {historicoNextExercise.equipment && historicoNextExercise.equipment !== 'body weight' && (
                                <span className={`${ui.pill} bg-white/10 text-[#E8EDED]/75 ring-white/10`}>{translateEquipment(historicoNextExercise.equipment)}</span>
                              )}
                            </div>
                            {historicoNextExercise.prescription && (
                              <p className="text-sm text-[#E8EDED]/70">
                                {formatTrainingSeriesSummary(historicoNextExercise.prescription)}
                                {` • ${getEffectiveRestSec(historicoNextExercise.prescription)}s descanso`}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                  <Card variant="solid" className="overflow-hidden p-0 border border-white/10 bg-[#0A1F44]/90 text-[#E8EDED]">
                    <button type="button" onClick={() => setShowAllHistoricoExercises((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left font-semibold text-[#E8EDED] hover:bg-white/5 transition-colors">
                      <span>Ver todos os exercícios</span>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${showAllHistoricoExercises ? 'rotate-90' : ''}`} />
                    </button>
                    {showAllHistoricoExercises && (
                      <div className="border-t border-white/10">
                        {selectedSessionExercises.map((exercise, index) => (
                          <div key={exercise.id ?? index} className={`px-4 py-3 flex items-center gap-3 ${index > 0 ? 'border-t border-white/10' : ''} ${exercise.status === 'done' ? 'border-l-2 border-l-[#4CCB7A]' : exercise.status === 'skipped' ? 'border-l-2 border-l-red-400' : 'border-l-2 border-l-transparent'}`}>
                            {exercise.gifUrl && (
                              <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
                                <img src={exercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#E8EDED] truncate">{translateExerciseName(exercise.name)}</p>
                              <p className="text-xs text-[#E8EDED]/65">{formatTrainingSeriesSummary(exercise.prescription)}</p>
                              <WorkoutSequencePreview
                                exercise={exercise}
                                hostExecution={
                                  exercise.id ? selectedHistoricoExecutions[exercise.id] || null : null
                                }
                                intercalationExecutions={selectedHistoricoExecutions}
                              />
                              {(exercise.prescription?.intercalations || []).length === 0 ? (
                              <SessionExerciseExecutionDetail
                                execution={
                                  exercise.id ? selectedHistoricoExecutions[exercise.id] || null : null
                                }
                              />
                              ) : null}
                            </div>
                            {(exercise.status === 'done' || exercise.status === 'skipped') && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${exercise.status === 'done' ? 'bg-[#4CCB7A]/15 text-[#4CCB7A]' : 'bg-red-500/15 text-red-300'}`}>
                                {exercise.status === 'done' ? 'Feito' : 'Pulei'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
            </div>
          </>
        )}

        {activeTab === 'estatisticas' &&
          (isPatientAppShell ? (
            <PatientTrainingStats
              patientId={paciente?.userId || pacienteIdFromQuery || user?.uid || null}
            />
          ) : isProfessionalEmbed ? (
            <>
              <div className="lg:hidden">
                <PatientTrainingStats
                  patientId={paciente?.userId || pacienteIdFromQuery || user?.uid || null}
                />
              </div>
              <div className="hidden lg:block">
                <PersonalTrainingStatsPanel
                  patientId={paciente?.userId || pacienteIdFromQuery || user?.uid || null}
                />
              </div>
            </>
          ) : (
            <PersonalTrainingStatsPanel
              patientId={paciente?.userId || pacienteIdFromQuery || user?.uid || null}
            />
          ))}

        {activeTab === 'config' && (
          <div className="space-y-6 max-w-2xl">
            <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
              <h2 className="text-xl font-bold text-[#E8EDED]">Configurações</h2>
              <p className="mt-1 text-sm text-[#E8EDED]/70">
                Ajuste timer e lembretes no mesmo padrão da sua rotina.
              </p>
            </div>

            {/* Seção colapsável — Timer */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/90 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] overflow-hidden">
              <button
                type="button"
                onClick={() => setConfigTimerExpanded((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                aria-expanded={configTimerExpanded}
              >
                <div>
                  <h3 className="text-lg font-semibold text-[#E8EDED]">Timer</h3>
                  <p className="text-xs text-[#E8EDED]/60">Som, descanso e início automático</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-[#E8EDED]/70 transition-transform ${configTimerExpanded ? 'rotate-90' : ''}`} />
              </button>
              {configTimerExpanded && (
                <div className="border-t border-white/10 p-4 space-y-3">
                  <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={restSoundEnabled} onChange={(e) => setRestSoundEnabled(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium text-[#E8EDED]/85 flex items-center gap-2">
                      {restSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      Som do descanso
                    </span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/85 mb-1">Descanso padrão (s)</label>
                    <input type="number" min={10} max={600} value={restDefaultSec} onChange={(e) => setRestDefaultSec(Math.min(600, Math.max(10, Number(e.target.value) || 10)))} className="w-full min-h-[44px] px-3 py-2 border border-white/15 rounded-xl bg-white/10 text-[#E8EDED] outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 focus:border-[#4CCB7A]/50" />
                  </div>
                  <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={timerAutoStart} onChange={(e) => setTimerAutoStart(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium text-[#E8EDED]/85">Iniciar descanso automaticamente ao marcar Feito/Pulei</span>
                  </label>
                </div>
              )}
            </div>

            {/* Seção colapsável — Lembretes */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/90 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] overflow-hidden">
              <button
                type="button"
                onClick={() => setConfigReminderExpanded((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                aria-expanded={configReminderExpanded}
              >
                <div>
                  <h3 className="text-lg font-semibold text-[#E8EDED]">Lembretes</h3>
                  <p className="text-xs text-[#E8EDED]/60">Dias, horário e preferências de envio</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-[#E8EDED]/70 transition-transform ${configReminderExpanded ? 'rotate-90' : ''}`} />
              </button>
              {configReminderExpanded && (
                <div className="border-t border-white/10 p-6 space-y-6">
                  {reminderPrefs ? (
                    <>
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={reminderPrefs.enabled}
                            onChange={(e) =>
                              setReminderPrefs({ ...reminderPrefs, enabled: e.target.checked })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-[#E8EDED]/85">
                            Habilitar lembretes
                          </span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#E8EDED]/85 mb-2">
                          Horário
                        </label>
                        <input
                          type="time"
                          value={reminderPrefs.time}
                          onChange={(e) =>
                            setReminderPrefs({ ...reminderPrefs, time: e.target.value })
                          }
                          className="px-3 py-2 border border-white/15 rounded-lg bg-white/10 text-[#E8EDED] outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 focus:border-[#4CCB7A]/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#E8EDED]/85 mb-2">
                          Dias da semana
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                            <button
                              type="button"
                              key={index}
                              onClick={() => {
                                const days = reminderPrefs.daysOfWeek || [];
                                const newDays = days.includes(index)
                                  ? days.filter((d) => d !== index)
                                  : [...days, index];
                                setReminderPrefs({ ...reminderPrefs, daysOfWeek: newDays });
                              }}
                              className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                                reminderPrefs.daysOfWeek?.includes(index)
                                  ? 'bg-[#4CCB7A] text-[#0A1F44] border-[#4CCB7A]'
                                  : 'bg-white/10 text-[#E8EDED]/80 border-white/15 hover:bg-white/15'
                              }`}
                            >
                              {dia}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveReminderPrefs}
                        disabled={savingReminder}
                        className="px-4 py-2 bg-[#4CCB7A] text-[#0A1F44] rounded-lg hover:bg-[#45b86d] disabled:opacity-50 font-semibold"
                      >
                        {savingReminder ? 'Salvando...' : 'Salvar preferências'}
                      </button>
                    </>
                  ) : (
                    <div>
                      <p className="text-[#E8EDED]/70 mb-4">
                        Configure suas preferências de lembrete.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setReminderPrefs({
                            enabled: false,
                            time: '08:00',
                            daysOfWeek: [],
                          });
                        }}
                        className="px-4 py-2 bg-[#4CCB7A] text-[#0A1F44] rounded-lg hover:bg-[#45b86d] font-semibold"
                      >
                        Criar preferências
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal fullscreen — carrossel de exercícios do treino */}
      {isWorkoutRunning && !selectedSessionForDetail && criarPortalReady &&
        createPortal(
          <div className="fixed inset-0 z-[230] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none touch-none bg-[#06152e] text-[#E8EDED]">
            <header className="shrink-0 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-white/10 bg-[#0A1F44]/95 backdrop-blur-md touch-auto">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#E8EDED]/45">
                  {runExercisesList.length > 0 &&
                  runExercisesList.every((ex) => ex.status === 'done' || ex.status === 'skipped')
                    ? 'Treino concluído'
                    : isPersonalTrainerMode
                      ? 'Acompanhando o aluno'
                      : 'Treino em andamento'}
                </p>
                <h2 className="text-base font-semibold text-[#E8EDED] truncate">
                  {activeRunSession?.title ?? 'Treino'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWorkoutRunning(false);
                  setActiveRunSession(null);
                  setActiveRunExerciseId(null);
                  setRestSecondsLeft(null);
                  setIsRestRunning(false);
                  setRunDetailsSheetOpen(false);
                  setRunNotesSheetOpen(false);
                  setRunGymMediaSheetOpen(false);
                  setRunExecution(null);
                  setRunIntercalationExecutions({});
                }}
                className="p-2 rounded-full hover:bg-white/10 text-[#E8EDED]/70 shrink-0"
                aria-label="Fechar treino"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 touch-auto flex-col overflow-hidden">
              {restSecondsLeft != null ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-y-auto py-4">
                  <WorkoutRunRestTimer
                    secondsLeft={restSecondsLeft}
                    totalSeconds={restTotalSec ?? restSecondsLeft}
                    running={isRestRunning}
                    logoSrc={restLogoSrc}
                    logoAlt={restLogoAlt}
                    nextLabel={
                      currentRunExercise
                        ? restAdvanceMode === 'series'
                          ? currentHostStep?.kind === 'intercalated' || currentIntercalation
                            ? `Em seguida: ${translateExerciseName(runDisplayExercise?.name || currentRunExercise.name)}`
                            : 'Próxima série em seguida'
                          : `Após ${translateExerciseName(currentRunExercise.name)}`
                        : null
                    }
                    onTogglePause={() => setIsRestRunning((r) => !r)}
                    onSkip={() => {
                      setIsRestRunning(false);
                      setRestSecondsLeft(null);
                      if (restAdvanceModeRef.current === 'exercise') {
                        advanceRunToNext();
                      }
                    }}
                  />
                </div>
              ) : !currentRunExercise ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                  <CheckCircle className="w-14 h-14 text-[#4CCB7A]" />
                  <p className="text-xl font-semibold text-[#E8EDED]">Treino concluído 🎉</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkoutRunning(false);
                      setActiveRunSession(null);
                      setActiveRunExerciseId(null);
                      setRunDetailsSheetOpen(false);
                      setRunNotesSheetOpen(false);
                      setRunGymMediaSheetOpen(false);
                      setRunExecution(null);
                      setRunIntercalationExecutions({});
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl font-semibold bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#45b86d]"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  {/* GIF principal — full-bleed com vinheta */}
                  <div className="relative shrink-0">
                    <div className="relative w-full aspect-[5/4] max-h-[34vh] overflow-hidden bg-[#040b18]">
                      {runGymMedia?.kind === 'video' ? (
                        <GymMediaLoopVideo
                          src={runGymMedia.url}
                          playing={showRunGymMediaPreview}
                          className={`absolute inset-0 w-full h-full object-contain bg-black ${
                            showRunGymMediaPreview ? '' : 'invisible'
                          }`}
                        />
                      ) : runGymMedia && showRunGymMediaPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={runGymMedia.url}
                          src={runGymMedia.url}
                          alt="Foto real da máquina na academia"
                          className="absolute inset-0 w-full h-full object-contain bg-black"
                        />
                      ) : null}
                      {!(runGymMedia && showRunGymMediaPreview) &&
                        (runDisplayExercise?.gifUrl || runDisplayExercise?.exerciseId) && (
                          <img
                            key={runDisplayExercise?.id || runDisplayExercise?.exerciseId}
                            src={resolveExerciseGifUrl(runDisplayExercise, EXERCISE_GIF_RESOLUTION)}
                            alt={translateExerciseName(runDisplayExercise?.name || currentRunExercise.name)}
                            className="absolute inset-0 w-full h-full object-contain bg-white"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              const fallback = getExerciseGifUrl(
                                resolveExerciseDbId(runDisplayExercise),
                                EXERCISE_GIF_THUMB_RESOLUTION
                              );
                              if (fallback && img.src !== fallback && !img.dataset.retried) {
                                img.dataset.retried = '1';
                                img.src = fallback;
                                return;
                              }
                              img.style.display = 'none';
                            }}
                          />
                        )}
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06152e] via-[#06152e]/25 to-transparent"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(4,11,24,0.55)_100%)]"
                        aria-hidden
                      />
                      <div className="absolute top-2 left-2 z-20 flex max-w-[calc(100%-6.75rem)] flex-row flex-wrap items-center justify-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRunNotesSheetOpen(false);
                            setRunGymMediaSheetOpen(false);
                            setRunDetailsSheetOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-black/70"
                        >
                          <Info className="h-3.5 w-3.5 text-[#4CCB7A]" />
                          Ajuda
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRunDetailsSheetOpen(false);
                            setRunGymMediaSheetOpen(false);
                            setRunNotesSheetOpen(true);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white ring-1 backdrop-blur-md ${
                            sanitizeTrainerNote(runTrainerNote)
                              ? 'bg-[#4CCB7A]/25 ring-[#4CCB7A]/55 hover:bg-[#4CCB7A]/35'
                              : 'bg-black/55 ring-white/25 hover:bg-black/70'
                          }`}
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-[#4CCB7A]" />
                          Orientações
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRunDetailsSheetOpen(false);
                            setRunNotesSheetOpen(false);
                            setRunGymMediaSheetOpen(true);
                          }}
                          className={`flex h-9 items-center justify-center gap-0.5 rounded-full px-2 ring-1 backdrop-blur-md ${
                            runGymMedia
                              ? 'bg-[#1ED760] text-[#042014] ring-[#B6FFD2] shadow-[0_0_14px_rgba(30,215,96,0.55)] hover:bg-[#3BE878]'
                              : 'bg-black/55 text-white ring-white/25 hover:bg-black/70'
                          }`}
                          aria-label="Adicionar vídeo"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
                          <Video className="h-3.5 w-3.5" />
                        </button>
                        {runGymMedia ? (
                          <button
                            type="button"
                            onClick={() => setShowRunGymMediaPreview((open) => !open)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md ring-1 ring-white/25 hover:bg-black/70"
                            aria-label={
                              showRunGymMediaPreview ? 'Voltar para o GIF do exercício' : 'Ver o vídeo do paciente'
                            }
                          >
                            {showRunGymMediaPreview ? (
                              <ArrowLeft className="w-4 h-4" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {runExercisesList.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = runExercisesList.findIndex((ex) => ex.id === activeRunExerciseId);
                            const prev = (idx <= 0 ? runExercisesList.length : idx) - 1;
                            const ex = runExercisesList[prev];
                            if (ex?.id) selectRunExercise(ex.id);
                          }}
                          className="absolute left-3 top-[38%] -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md ring-1 ring-white/20 hover:bg-black/55"
                          aria-label="Exercício anterior"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={advanceRunToNext}
                          className="absolute right-3 top-[38%] -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md ring-1 ring-white/20 hover:bg-black/55"
                          aria-label="Próximo exercício"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-12 bg-gradient-to-t from-black/80 via-black/45 to-transparent">
                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium tabular-nums text-white/75">
                            Exercício {(runExercisesList.findIndex((ex) => ex.id === activeRunExerciseId) + 1) || 1} de {runExercisesList.length}
                          </p>
                          <h3 className="text-base font-semibold text-white leading-snug tracking-tight truncate drop-shadow">
                            {translateExerciseName(runDisplayExercise?.name || currentRunExercise.name)}
                          </h3>
                          {currentIntercalation ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2F8FA3]">
                              ⇄ Intercalado
                            </p>
                          ) : null}
                        </div>
                        {currentRunExercise.status === 'done' ? (
                          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4CCB7A]/90 text-[#0A1F44]">
                            Feito
                          </span>
                        ) : currentRunExercise.status === 'skipped' ? (
                          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/90 text-white">
                            Pulado
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/25">
                            Pendente
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          currentIntercalation
                            ? 'bg-[#2F8FA3]/90 text-white'
                            : 'bg-[#4CCB7A]/90 text-[#0A1F44]'
                        }`}>
                          {translateTarget(runDisplayExercise?.target || currentRunExercise.target)}
                        </span>
                        {(runDisplayExercise?.bodyPart || currentRunExercise.bodyPart) && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/20">
                            {translateBodyPart(runDisplayExercise?.bodyPart || currentRunExercise.bodyPart)}
                          </span>
                        )}
                        {(runDisplayExercise?.equipment || currentRunExercise.equipment) && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/20">
                            {translateEquipment(runDisplayExercise?.equipment || currentRunExercise.equipment)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumo compacto */}
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-2.5 space-y-2.5">
                    <WorkoutRunSeriesPanel
                      execution={
                        currentHostStep?.kind === 'intercalated'
                          ? runIntercalationExecutions[currentHostStep.intercalationId] ?? null
                          : runExecution?.exerciseDocId === currentRunExercise.id
                            ? runExecution
                            : null
                      }
                      currentSeriesId={currentHostStep?.seriesId}
                      accent={currentHostStep?.kind === 'intercalated'}
                      intercalatedHint={currentHostStep?.kind === 'intercalated'}
                      visualSteps={
                        hostRunQueue.some((step) => step.kind === 'intercalated')
                          ? hostRunVisualSteps
                          : undefined
                      }
                      loading={
                        !runExecutionError &&
                        (loadingRunExecution ||
                          runExecution?.exerciseDocId !== currentRunExercise.id)
                      }
                      saving={savingRunSeries}
                      readOnly={runExecutionReadOnly}
                      onCompleteSeries={handleCompleteRunSeries}
                      onSkipSeries={handleSkipRunSeries}
                      onRedoExercise={handleRedoRunExercise}
                      onPrescriptionChange={handleRunSeriesPrescriptionChange}
                    />
                  </div>

                  {/* Miniaturas do carrossel */}
                  <div className="shrink-0 border-t border-white/10 bg-[#0A1F44]/80 px-3 pt-2.5 pb-2">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin snap-x snap-mandatory">
                      {runExercisesList.map((ex, idx) => {
                        const isActive = ex.id === activeRunExerciseId;
                        const thumb = resolveExerciseGifUrl(ex, EXERCISE_GIF_THUMB_RESOLUTION);
                        return (
                          <button
                            key={ex.id || `${ex.exerciseId}-${idx}`}
                            type="button"
                            onClick={() => ex.id && selectRunExercise(ex.id)}
                            className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden snap-start transition-all ${
                              isActive
                                ? 'ring-2 ring-[#4CCB7A] scale-105 shadow-[0_0_0_1px_rgba(76,203,122,0.35)]'
                                : 'ring-1 ring-white/15 opacity-70 hover:opacity-100'
                            }`}
                            aria-label={translateExerciseName(ex.name)}
                            aria-current={isActive ? 'true' : undefined}
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <Dumbbell className="w-5 h-5 text-white/30" />
                              </div>
                            )}
                            <span className="absolute bottom-0.5 left-0.5 min-w-[1rem] h-4 px-1 rounded bg-black/60 text-[9px] font-bold tabular-nums text-white/90 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {ex.status === 'done' && (
                              <span className="absolute top-0.5 right-0.5 rounded-full bg-[#4CCB7A] p-0.5">
                                <CheckCircle className="w-2.5 h-2.5 text-[#0A1F44]" />
                              </span>
                            )}
                            {ex.status === 'skipped' && (
                              <span className="absolute top-0.5 right-0.5 rounded-full bg-red-500 p-0.5">
                                <XCircle className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="shrink-0 flex gap-2 px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-[#0A1F44]">
                    <button
                      type="button"
                      onClick={handleRunPulei}
                      disabled={
                        savingStatus ||
                        savingRunSeries ||
                        runExecutionReadOnly ||
                        (runExecution?.exerciseDocId === currentRunExercise.id &&
                          !currentHostStep)
                      }
                      className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold ${ui.btnDanger} disabled:opacity-50`}
                    >
                      <XCircle className="w-4 h-4" /> Pulei
                    </button>
                    <button
                      type="button"
                      onClick={advanceRunToNext}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold ${ui.btnGhost}`}
                    >
                      <ChevronRight className="w-4 h-4" /> Próximo
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Sheet Detalhes (PT) — sobre o modal do treino */}
            {runDetailsSheetOpen && currentRunExercise && (
              <div
                className="absolute inset-0 z-20 flex h-full max-h-full flex-col justify-end overflow-hidden overscroll-none touch-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="run-exercise-details-title"
              >
                <div
                  className="absolute inset-0 bg-black/55 touch-none"
                  onClick={() => setRunDetailsSheetOpen(false)}
                  aria-hidden
                />
                <div className="relative z-10 flex max-h-[min(78vh,620px)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0A1F44] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.55)] touch-auto pb-[env(safe-area-inset-bottom,0px)]">
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-[#E8EDED]/45">Ajuda</p>
                      <h3
                        id="run-exercise-details-title"
                        className="truncate text-sm font-semibold text-[#E8EDED]"
                      >
                        {translateExerciseName(currentRunExercise.name)}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRunDetailsSheetOpen(false)}
                      className="rounded-full p-1.5 text-[#E8EDED]/70 hover:bg-white/10"
                      aria-label="Fechar detalhes"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain touch-pan-y p-4">
                    {(loadingRunDetails || loadingRunDetailsTranslate) && (
                      <div className="flex items-center gap-2 py-6 text-sm text-[#E8EDED]/55 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-[#4CCB7A]" />
                        Preparando detalhes em português…
                      </div>
                    )}

                    {!loadingRunDetails && runExerciseDetails && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {translateDifficulty(runExerciseDetails.difficulty) && (
                            <span className={`${ui.pill} bg-amber-400/10 text-amber-200/90 ring-amber-300/25`}>
                              {translateDifficulty(runExerciseDetails.difficulty)}
                            </span>
                          )}
                          {translateCategory(runExerciseDetails.category) && (
                            <span className={`${ui.pill} bg-sky-400/10 text-sky-200/90 ring-sky-300/25`}>
                              {translateCategory(runExerciseDetails.category)}
                            </span>
                          )}
                          <span className={`${ui.pill} bg-[#4CCB7A]/15 text-[#4CCB7A] ring-[#4CCB7A]/35`}>
                            {translateTarget(runExerciseDetails.target || currentRunExercise.target)}
                          </span>
                          {(runExerciseDetails.bodyPart || currentRunExercise.bodyPart) && (
                            <span className={`${ui.pill} bg-white/10 text-[#E8EDED]/75 ring-white/10`}>
                              {translateBodyPart(runExerciseDetails.bodyPart || currentRunExercise.bodyPart)}
                            </span>
                          )}
                          {(runExerciseDetails.equipment || currentRunExercise.equipment) && (
                            <span className={`${ui.pill} bg-white/10 text-[#E8EDED]/75 ring-white/10`}>
                              {translateEquipment(runExerciseDetails.equipment || currentRunExercise.equipment)}
                            </span>
                          )}
                        </div>

                        {runExerciseDetails.secondaryMuscles &&
                          runExerciseDetails.secondaryMuscles.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] uppercase tracking-[0.08em] text-[#E8EDED]/40">
                                Músculos secundários
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {runExerciseDetails.secondaryMuscles.map((muscle) => (
                                  <span
                                    key={muscle}
                                    className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-[#E8EDED]/75 ring-1 ring-white/10"
                                  >
                                    {translateTarget(muscle)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        {!loadingRunDetailsTranslate && runDetailsTranslated?.descriptionPt && (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-[0.08em] text-[#E8EDED]/40">
                              Sobre o exercício
                            </p>
                            <p className="text-sm leading-relaxed text-[#E8EDED]/80">
                              {runDetailsTranslated.descriptionPt}
                            </p>
                          </div>
                        )}

                        {!loadingRunDetailsTranslate &&
                          runDetailsTranslated &&
                          runDetailsTranslated.instructionsPt.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-[0.08em] text-[#E8EDED]/40">
                                Como executar
                              </p>
                              <ol className="space-y-2.5">
                                {runDetailsTranslated.instructionsPt.map((step, idx) => (
                                  <li
                                    key={`${idx}-${step.slice(0, 20)}`}
                                    className="flex gap-2.5 text-sm leading-relaxed text-[#E8EDED]/85"
                                  >
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4CCB7A]/15 text-[10px] font-bold tabular-nums text-[#4CCB7A]">
                                      {idx + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                        {!loadingRunDetailsTranslate &&
                          runDetailsTranslated &&
                          !runDetailsTranslated.descriptionPt &&
                          runDetailsTranslated.instructionsPt.length === 0 && (
                            <p className="py-4 text-center text-sm text-[#E8EDED]/50">
                              Sem descrição adicional para este exercício.
                            </p>
                          )}
                      </>
                    )}

                    {!loadingRunDetails && !runExerciseDetails && (
                      <p className="py-6 text-center text-sm text-[#E8EDED]/50">
                        Não foi possível carregar os detalhes agora.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <WorkoutRunNotesSheet
              open={runNotesSheetOpen && Boolean(currentRunExercise)}
              exerciseName={translateExerciseName(
                runDisplayExercise?.name || currentRunExercise?.name || ''
              )}
              note={runTrainerNote}
              onClose={() => setRunNotesSheetOpen(false)}
            />
            <WorkoutRunGymMediaSheet
              open={runGymMediaSheetOpen && Boolean(currentRunExercise)}
              exerciseName={translateExerciseName(
                runDisplayExercise?.name || currentRunExercise?.name || ''
              )}
              media={runGymMedia}
              canEdit={!blockProfessionalMutations}
              uploading={gymMediaUploading}
              error={gymMediaError}
              onClose={() => setRunGymMediaSheetOpen(false)}
              onPickFile={(file) => void handleGymMediaFile(file)}
              onRemove={handleGymMediaRemove}
            />
          </div>,
          document.body
        )}
      <WorkoutPrintModal
        open={workoutPrintOpen}
        data={workoutPrintData}
        onClose={() => {
          setWorkoutPrintOpen(false);
          setWorkoutPrintData(null);
        }}
      />
          </div>
        </div>
      </div>
      {modernMobileChrome && !keyboardOpen && !isOverlayModalOpen && !notesSheetOpen && (
        <nav
          className="lg:hidden pointer-events-none fixed inset-x-0 bottom-0 z-[210] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          aria-label="Seções Personal"
        >
          <div
            role="tablist"
            className="pointer-events-auto flex w-full max-w-md items-end justify-between rounded-full border border-[#7eb6e8]/45 bg-[#0A1F44]/90 px-1.5 py-1.5 shadow-[0_14px_36px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md"
          >
            {abasNavegacaoMobile.map((aba) => {
              const ativo = activeTab === aba.id;
              const TabIcon = aba.id === 'hoje' ? Home : aba.icon;
              return (
                <button
                  key={aba.id}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setActiveTab(aba.id)}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1 py-0.5"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      ativo
                        ? 'bg-white text-[#0A1F44] shadow-[0_0_16px_rgba(226,240,255,0.55)]'
                        : 'text-[#E8EDED]/80'
                    }`}
                  >
                    <TabIcon
                      className="h-[18px] w-[18px] fill-none"
                      strokeWidth={ativo ? 2.25 : 2}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={`text-[10px] font-medium leading-none ${
                      ativo ? 'text-white' : 'text-[#E8EDED]/65'
                    }`}
                  >
                    {aba.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );

  const gatedShell = (
    <AvaliacaoAtividadeFisicaGate
      isPersonalTrainerMode={isPersonalTrainerMode}
      fromMetapersonal={isProfessionalEmbed}
      patientId={effectivePaciente?.id ?? null}
      userId={user?.uid ?? null}
      patientFullName={
        effectivePaciente?.dadosIdentificacao?.nomeCompleto || effectivePaciente?.nome || null
      }
    >
      {appShell}
    </AvaliacaoAtividadeFisicaGate>
  );

  if ((isAppFullscreen || metaadminFullscreen) && criarPortalReady && !suppressAppHeader) {
    return createPortal(gatedShell, document.body);
  }
  return gatedShell;
}

// Componente de Calendário Semanal
function CalendarioSemanalComponent({
  semanaCalendario,
  setSemanaCalendario,
  diaSelecionado,
  setDiaSelecionado,
  sessoes,
  aplicacoes,
  injetaveis = [],
  pagamentos,
  aplicacaoSelecionada,
  setAplicacaoSelecionada,
  pagamentoSelecionado,
  setPagamentoSelecionado,
  onSessionClick,
}: {
  semanaCalendario: Date;
  setSemanaCalendario: (date: Date) => void;
  diaSelecionado: Date | null;
  setDiaSelecionado: (date: Date | null) => void;
  sessoes: TrainingSession[];
  aplicacoes: Array<{ data: Date; semana: number; dose: number; status: string }>;
  injetaveis?: CalendarioInjetavelItem[];
  pagamentos: Array<{ data: Date; tipo: 'nutri' | 'personal'; valor: number; parcela?: number }>;
  aplicacaoSelecionada: Date | null;
  setAplicacaoSelecionada: (date: Date | null) => void;
  pagamentoSelecionado: Date | null;
  setPagamentoSelecionado: (date: Date | null) => void;
  onSessionClick: (session: TrainingSession) => void;
}) {
  const [progressosDias, setProgressosDias] = useState<Record<string, number>>({});
  const [exercisesPorSessao, setExercisesPorSessao] = useState<Record<string, TrainingSessionExercise[]>>({});
  const [loadingExercisesDia, setLoadingExercisesDia] = useState(false);
  
  // Dia efetivo: selecionado ou hoje (sempre mostrar painel)
  const effectiveDia = diaSelecionado ?? new Date();

  // Carregar exercícios das sessões do dia efetivo
  useEffect(() => {
    const dayToUse = diaSelecionado ?? new Date();
    const dataStr = toLocalYYYYMMDD(dayToUse);
    const utc = dayToUse.toISOString().split('T')[0];
    const isToday = dataStr === toLocalYYYYMMDD(new Date());
    const sessoesDoDia = sessoes.filter(
      (s) => s.scheduledDate === dataStr || (isToday && s.scheduledDate === utc)
    );
    if (sessoesDoDia.length === 0) {
      setExercisesPorSessao({});
      setLoadingExercisesDia(false);
      return;
    }
    setLoadingExercisesDia(true);
    const load = async () => {
      const map: Record<string, TrainingSessionExercise[]> = {};
      for (const s of sessoesDoDia) {
        if (!s.id) continue;
        try {
          const ex = await trainingSessionService.getSessionExercises(s.id);
          map[s.id] = ex;
        } catch {
          map[s.id] = [];
        }
      }
      setExercisesPorSessao(map);
      setLoadingExercisesDia(false);
    };
    load();
  }, [diaSelecionado, sessoes]);
  
  // Calcular progressos dos dias quando sessoes mudarem
  useEffect(() => {
    const calcularProgressos = async () => {
      const progressos: Record<string, number> = {};
      const inicioSemana = new Date(semanaCalendario);
      inicioSemana.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const data = new Date(inicioSemana);
        data.setDate(inicioSemana.getDate() + i);
        const dataStr = toLocalYYYYMMDD(data);
        const utc = data.toISOString().split('T')[0];
        const isToday = dataStr === toLocalYYYYMMDD(new Date());
        const sessoesDoDia = sessoes.filter(
          (s) => s.scheduledDate === dataStr || (isToday && s.scheduledDate === utc)
        );
        
        if (sessoesDoDia.length > 0) {
          let totalExercises = 0;
          let doneExercises = 0;
          
          for (const sessao of sessoesDoDia) {
            if (sessao.id) {
              try {
                const exercises = await trainingSessionService.getSessionExercises(sessao.id);
                totalExercises += exercises.length;
                doneExercises += exercises.filter((ex) => ex.status === 'done').length;
              } catch (error) {
                // Ignorar erros
              }
            }
          }
          
          progressos[dataStr] = totalExercises > 0 ? Math.round((doneExercises / totalExercises) * 100) : 0;
        }
      }
      
      setProgressosDias(progressos);
    };
    
    calcularProgressos();
  }, [sessoes, semanaCalendario]);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dayStart = new Date(effectiveDia);
  dayStart.setHours(0, 0, 0, 0);
  const isFutureDay = dayStart.getTime() > hoje.getTime();

  // Calcular início da semana (domingo)
  const inicioSemana = new Date(semanaCalendario);
  inicioSemana.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  // Gerar array com os 7 dias da semana
  const diasSemana: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dia = new Date(inicioSemana);
    dia.setDate(inicioSemana.getDate() + i);
    diasSemana.push(dia);
  }

  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const mudarSemana = (direcao: 'anterior' | 'proximo') => {
    const novaSemana = new Date(semanaCalendario);
    if (direcao === 'anterior') {
      novaSemana.setDate(novaSemana.getDate() - 7);
    } else {
      novaSemana.setDate(novaSemana.getDate() + 7);
    }
    setSemanaCalendario(novaSemana);
    setDiaSelecionado(null);
  };

  const getSessoesDoDia = (data: Date) => {
    const local = toLocalYYYYMMDD(data);
    const utc = data.toISOString().split('T')[0];
    const isToday = local === toLocalYYYYMMDD(new Date());
    return sessoes.filter(
      (s) => s.scheduledDate === local || (isToday && s.scheduledDate === utc)
    );
  };

  const getAplicacoesDoDia = (data: Date) => {
    return aplicacoes.filter((a) => {
      return (
        a.data.getDate() === data.getDate() &&
        a.data.getMonth() === data.getMonth() &&
        a.data.getFullYear() === data.getFullYear()
      );
    });
  };

  const getPagamentosDoDia = (data: Date) => {
    return pagamentos.filter((p) => {
      return (
        p.data.getDate() === data.getDate() &&
        p.data.getMonth() === data.getMonth() &&
        p.data.getFullYear() === data.getFullYear()
      );
    });
  };

  const getInjetaveisDoDia = (data: Date) => {
    return injetaveis.filter((item) => sameCalendarDay(item.data, data));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[#E8EDED]">
        <button
          type="button"
          onClick={() => mudarSemana('anterior')}
          className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base sm:text-lg font-semibold tracking-tight text-center px-2">
          {diasSemana[0].getDate()}–{diasSemana[6].getDate()} de {meses[diasSemana[0].getMonth()]}{' '}
          {diasSemana[0].getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => mudarSemana('proximo')}
          className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-colors"
          aria-label="Próxima semana"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-2 sm:p-3 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {diasSemana.map((dia, index) => {
            const eHoje = sameCalendarDay(dia, hoje);
            const selecionado = diaSelecionado ? sameCalendarDay(dia, diaSelecionado) : eHoje;
            const sessoesDoDia = getSessoesDoDia(dia);
            const aplicacoesDoDia = getAplicacoesDoDia(dia);
            const injetaveisDoDia = getInjetaveisDoDia(dia);
            const pagamentosDoDia = getPagamentosDoDia(dia);
            const dataStr = toLocalYYYYMMDD(dia);
            const progresso = progressosDias[dataStr] || 0;
            const temTreino = sessoesDoDia.length > 0;
            const temEvento =
              temTreino ||
              aplicacoesDoDia.length > 0 ||
              injetaveisDoDia.length > 0 ||
              pagamentosDoDia.length > 0;

            return (
              <button
                key={index}
                type="button"
                onClick={() => setDiaSelecionado(dia)}
                title={`${diasSemanaNomes[index]} ${dia.getDate()}${progresso > 0 ? ` · ${progresso}%` : temTreino ? ' · treino' : ''}${injetaveisDoDia.length > 0 ? ` · ${injetaveisDoDia.length} injetável(is)` : ''}`}
                className={`relative min-h-[7.25rem] sm:min-h-[8rem] rounded-xl border px-1 py-2.5 flex flex-col items-center gap-1 text-center transition-all ${
                  selecionado
                    ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 shadow-[0_8px_24px_-8px_rgba(76,203,122,0.45)] ring-2 ring-[#4CCB7A]/35'
                    : eHoje
                      ? 'border-[#2F8FA3]/45 bg-[#2F8FA3]/15 hover:border-[#4CCB7A]/40'
                      : temEvento
                        ? 'border-white/15 bg-white/[0.05] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <CalendarDayProgressBorder percent={progresso} selected={selecionado} />
                <span
                  className={`relative z-[1] text-[10px] sm:text-xs font-medium leading-none ${
                    selecionado || eHoje ? 'text-[#4CCB7A]' : 'text-[#E8EDED]/60'
                  }`}
                >
                  {diasSemanaNomes[index]}
                </span>
                <span
                  className={`relative z-[1] text-lg sm:text-xl font-bold tabular-nums leading-none ${
                    selecionado || eHoje ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'
                  }`}
                >
                  {dia.getDate()}
                </span>
                {progresso > 0 && (
                  <span className="relative z-[1] text-[9px] sm:text-[10px] font-semibold tabular-nums text-[#F97316] drop-shadow-[0_0_6px_rgba(249,115,22,0.55)]">
                    {progresso}%
                  </span>
                )}
                <div className="relative z-[1] mt-auto flex flex-wrap gap-1 justify-center items-center min-h-[1.25rem]">
                  {temTreino && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${selecionado ? 'bg-[#4CCB7A]' : 'bg-[#4CCB7A]/70'}`}
                      aria-hidden
                    />
                  )}
                  {aplicacoesDoDia.length > 0 && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-[#F97316]/20 ring-1 ring-[#F97316]/80 shadow-[0_0_10px_rgba(249,115,22,0.55)]"
                      style={{ filter: 'drop-shadow(0 0 5px rgba(249, 115, 22, 0.85))' }}
                      title={aplicacoesDoDia
                        .map((a) => `Aplicação: ${a.dose}mg - Semana ${a.semana}`)
                        .join(', ')}
                    >
                      💉
                    </span>
                  )}
                  <CalendarioInjetavelBadge items={injetaveisDoDia} />
                  {pagamentosDoDia.length > 0 && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-yellow-500/90 text-white"
                      title={pagamentosDoDia
                        .map(
                          (p) =>
                            `Pagamento ${p.tipo === 'nutri' ? 'Nutricionista' : 'Personal'}: R$ ${p.valor.toFixed(2)}${p.parcela ? ` - Parcela ${p.parcela}` : ''}`
                        )
                        .join(', ')}
                    >
                      💰
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia — sempre visível (hoje por padrão) */}
      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 space-y-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#E8EDED]">
            Eventos em {effectiveDia.toLocaleDateString('pt-BR')}
            {!diaSelecionado && <span className="ml-1.5 text-sm font-normal text-[#E8EDED]/60">(hoje)</span>}
          </h3>
          {diaSelecionado && (
            <button
              onClick={() => setDiaSelecionado(null)}
              className="p-1 hover:bg-white/10 rounded"
              aria-label="Voltar para hoje"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {getSessoesDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2">Treinos</h4>
              <div className="space-y-3">
                {getSessoesDoDia(effectiveDia).map((sessao) => {
                  const exs = sessao.id ? (exercisesPorSessao[sessao.id] ?? []) : [];
                  return (
                    <div
                      key={sessao.id}
                      className="relative rounded-xl border border-white/15 bg-gradient-to-br from-[#0f2a5a]/85 via-[#0A1F44]/90 to-[#091936]/95 shadow-[0_16px_32px_-16px_rgba(76,203,122,0.35)] overflow-hidden"
                    >
                      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#4CCB7A]/12 blur-2xl" />
                      <div
                        onClick={() => onSessionClick(sessao)}
                        className="relative z-[1] p-3.5 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A]" />
                            <span className="font-semibold text-[#E8EDED]">{sessao.title}</span>
                            {isFutureDay && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-[#E8EDED]/90">
                                Agendado
                              </span>
                            )}
                          </div>
                          {!isFutureDay && (
                            <div className="text-xs text-[#E8EDED]/65 mt-1">
                              {sessao.status === 'done'
                                ? 'Feito'
                                : sessao.status === 'skipped'
                                ? 'Pulou'
                                : 'Agendado'}
                            </div>
                          )}
                        </div>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04]">
                          <ChevronRight className="w-4 h-4 text-[#E8EDED]/70 shrink-0" />
                        </span>
                      </div>
                      <div className="border-t border-white/10 bg-black/10 px-3 py-2.5">
                        {loadingExercisesDia && exs.length === 0 ? (
                          <p className="text-xs text-[#E8EDED]/60">Carregando exercícios…</p>
                        ) : exs.length === 0 ? (
                          <p className="text-xs text-[#E8EDED]/60">Nenhum exercício</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {exs.map((ex, i) => (
                              <li key={ex.exerciseId || i} className="flex items-center gap-2 text-sm">
                                {isFutureDay ? (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#E8EDED]/50" aria-hidden />
                                ) : (
                                  <span
                                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                      ex.status === 'done'
                                        ? 'bg-green-500 text-white'
                                        : ex.status === 'skipped'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white/15 text-[#E8EDED]/80'
                                    }`}
                                    title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                                  >
                                    {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                                  </span>
                                )}
                                <span className="text-[#E8EDED]/85 truncate">
                                  {translateExerciseName(ex.name)}
                                </span>
                                {ex.prescription && (
                                  <span className="text-xs text-[#E8EDED]/60 shrink-0">
                                    {formatTrainingSeriesSummary(ex.prescription)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {getAplicacoesDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2">Aplicações</h4>
              <div className="space-y-2">
                {getAplicacoesDoDia(effectiveDia).map((aplicacao, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border shadow-[0_12px_24px_-16px_rgba(76,203,122,0.35)] ${
                      aplicacao.status === 'tomada'
                        ? 'bg-green-500/18 border-green-400/40'
                        : aplicacao.status === 'perdida'
                        ? 'bg-red-500/18 border-red-400/40'
                        : aplicacao.status === 'hoje'
                        ? 'bg-[#2F8FA3]/22 border-[#2F8FA3]/50'
                        : 'bg-white/[0.06] border-white/18'
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60 mb-1">Aplicação</div>
                    <div className="font-semibold text-[#E8EDED]">
                      Semana {aplicacao.semana} — {aplicacao.dose} mg
                    </div>
                    <div className="text-xs text-[#E8EDED]/65 mt-1">
                      {aplicacao.status === 'tomada'
                        ? '✓ Tomada'
                        : aplicacao.status === 'perdida'
                        ? '✗ Perdida'
                        : aplicacao.status === 'hoje'
                        ? 'Hoje'
                        : 'Futura'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {getInjetaveisDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2 flex items-center gap-2">
                <Pill className="w-3.5 h-3.5 text-[#F97316]" aria-hidden />
                Injetáveis
              </h4>
              <div className="space-y-2">
                {getInjetaveisDoDia(effectiveDia).map((item) => {
                  const status = statusInjetavelNoDia(item);
                  return (
                    <div
                      key={`${item.aplicacaoId}-${item.semana}`}
                      className={`p-3.5 rounded-xl border shadow-[0_12px_24px_-16px_rgba(249,115,22,0.35)] ${
                        status === 'aplicado'
                          ? 'bg-green-500/18 border-green-400/40'
                          : status === 'pendente'
                            ? 'bg-[#F97316]/18 border-[#F97316]/45'
                            : status === 'hoje'
                              ? 'bg-[#F97316]/22 border-[#F97316]/55'
                              : 'bg-white/[0.06] border-white/18'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60 mb-1">Injetável</div>
                          <div className={`font-semibold text-[#E8EDED] ${item.realizado ? 'line-through opacity-75' : ''}`}>
                            {item.protocoloNome}
                          </div>
                          <div className="text-xs text-[#E8EDED]/65 mt-1">Semana {item.semana}</div>
                          {item.observacao ? (
                            <div className="text-xs text-[#E8EDED]/55 mt-1">{item.observacao}</div>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            status === 'aplicado'
                              ? 'bg-green-500/20 text-green-300'
                              : status === 'pendente' || status === 'hoje'
                                ? 'bg-[#F97316]/20 text-[#F97316]'
                                : 'bg-white/10 text-[#E8EDED]/70'
                          }`}
                        >
                          {status === 'aplicado'
                            ? '✓ Aplicado'
                            : status === 'pendente'
                              ? 'Pendente'
                              : status === 'hoje'
                                ? 'Hoje'
                                : 'Futura'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {getPagamentosDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2">Pagamentos</h4>
              <div className="space-y-2">
                {getPagamentosDoDia(effectiveDia).map((pagamento, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-yellow-500/18 border border-yellow-400/40 rounded-xl shadow-[0_12px_24px_-16px_rgba(250,204,21,0.45)]"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60 mb-1">Pagamento</div>
                    <div className="font-semibold text-[#E8EDED]">
                      {pagamento.tipo === 'nutri' ? 'Nutricionista' : 'Personal Trainer'}
                    </div>
                    <div className="text-sm text-[#E8EDED]/65 mt-1">
                      R$ {pagamento.valor.toFixed(2)}
                      {pagamento.parcela && ` — Parcela ${pagamento.parcela}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {getSessoesDoDia(effectiveDia).length === 0 &&
            getAplicacoesDoDia(effectiveDia).length === 0 &&
            getInjetaveisDoDia(effectiveDia).length === 0 &&
            getPagamentosDoDia(effectiveDia).length === 0 && (
              <p className="text-sm text-[#E8EDED]/65">Nenhum evento neste dia.</p>
            )}
        </div>
    </div>
  );
}

// Componente de Calendário
function CalendarioComponent({
  mesCalendario,
  setMesCalendario,
  diaSelecionado,
  setDiaSelecionado,
  sessoes,
  aplicacoes,
  injetaveis = [],
  pagamentos,
  aplicacaoSelecionada,
  setAplicacaoSelecionada,
  pagamentoSelecionado,
  setPagamentoSelecionado,
  onSessionClick,
}: {
  mesCalendario: Date;
  setMesCalendario: (date: Date) => void;
  diaSelecionado: Date | null;
  setDiaSelecionado: (date: Date | null) => void;
  sessoes: TrainingSession[];
  aplicacoes: Array<{ data: Date; semana: number; dose: number; status: string }>;
  injetaveis?: CalendarioInjetavelItem[];
  pagamentos: Array<{ data: Date; tipo: 'nutri' | 'personal'; valor: number; parcela?: number }>;
  aplicacaoSelecionada: Date | null;
  setAplicacaoSelecionada: (date: Date | null) => void;
  pagamentoSelecionado: Date | null;
  setPagamentoSelecionado: (date: Date | null) => void;
  onSessionClick: (session: TrainingSession) => void;
}) {
  const [progressosDias, setProgressosDias] = useState<Record<string, number>>({});
  const [exercisesPorSessao, setExercisesPorSessao] = useState<Record<string, TrainingSessionExercise[]>>({});
  const [loadingExercisesDia, setLoadingExercisesDia] = useState(false);
  
  const effectiveDia = diaSelecionado ?? new Date();

  // Carregar exercícios das sessões do dia efetivo
  useEffect(() => {
    const dayToUse = diaSelecionado ?? new Date();
    const dataStr = toLocalYYYYMMDD(dayToUse);
    const utc = dayToUse.toISOString().split('T')[0];
    const isToday = dataStr === toLocalYYYYMMDD(new Date());
    const sessoesDoDia = sessoes.filter(
      (s) => s.scheduledDate === dataStr || (isToday && s.scheduledDate === utc)
    );
    if (sessoesDoDia.length === 0) {
      setExercisesPorSessao({});
      setLoadingExercisesDia(false);
      return;
    }
    setLoadingExercisesDia(true);
    const load = async () => {
      const map: Record<string, TrainingSessionExercise[]> = {};
      for (const s of sessoesDoDia) {
        if (!s.id) continue;
        try {
          const ex = await trainingSessionService.getSessionExercises(s.id);
          map[s.id] = ex;
        } catch {
          map[s.id] = [];
        }
      }
      setExercisesPorSessao(map);
      setLoadingExercisesDia(false);
    };
    load();
  }, [diaSelecionado, sessoes]);
  
  // Calcular progressos dos dias quando sessoes mudarem
  useEffect(() => {
    const calcularProgressos = async () => {
      const progressos: Record<string, number> = {};
      const ano = mesCalendario.getFullYear();
      const mes = mesCalendario.getMonth();
      const primeiroDia = new Date(ano, mes, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);
      
      for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const data = new Date(ano, mes, dia);
        const dataStr = toLocalYYYYMMDD(data);
        const utc = data.toISOString().split('T')[0];
        const isToday = dataStr === toLocalYYYYMMDD(new Date());
        const sessoesDoDia = sessoes.filter(
          (s) => s.scheduledDate === dataStr || (isToday && s.scheduledDate === utc)
        );
        
        if (sessoesDoDia.length > 0) {
          let totalExercises = 0;
          let doneExercises = 0;
          
          for (const sessao of sessoesDoDia) {
            if (sessao.id) {
              try {
                const exercises = await trainingSessionService.getSessionExercises(sessao.id);
                totalExercises += exercises.length;
                doneExercises += exercises.filter((ex) => ex.status === 'done').length;
              } catch (error) {
                // Ignorar erros
              }
            }
          }
          
          progressos[dataStr] = totalExercises > 0 ? Math.round((doneExercises / totalExercises) * 100) : 0;
        }
      }
      
      setProgressosDias(progressos);
    };
    
    calcularProgressos();
  }, [sessoes, mesCalendario]);
  
  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diaSemanaPrimeiro = primeiroDia.getDay();
  const diasNoMes = ultimoDia.getDate();

  const dias: (Date | null)[] = [];
  for (let i = 0; i < diaSemanaPrimeiro; i++) {
    dias.push(null);
  }
  for (let dia = 1; dia <= diasNoMes; dia++) {
    dias.push(new Date(ano, mes, dia));
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dayStart = new Date(effectiveDia);
  dayStart.setHours(0, 0, 0, 0);
  const isFutureDay = dayStart.getTime() > hoje.getTime();

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const mudarMes = (direcao: 'anterior' | 'proximo') => {
    const novoMes = new Date(mesCalendario);
    if (direcao === 'anterior') {
      novoMes.setMonth(mes - 1);
    } else {
      novoMes.setMonth(mes + 1);
    }
    setMesCalendario(novoMes);
    setDiaSelecionado(null);
  };

  const getSessoesDoDia = (data: Date) => {
    const local = toLocalYYYYMMDD(data);
    const utc = data.toISOString().split('T')[0];
    const isToday = local === toLocalYYYYMMDD(new Date());
    return sessoes.filter(
      (s) => s.scheduledDate === local || (isToday && s.scheduledDate === utc)
    );
  };

  const getAplicacoesDoDia = (data: Date) => {
    return aplicacoes.filter((a) => {
      return (
        a.data.getDate() === data.getDate() &&
        a.data.getMonth() === data.getMonth() &&
        a.data.getFullYear() === data.getFullYear()
      );
    });
  };

  const getPagamentosDoDia = (data: Date) => {
    return pagamentos.filter((p) => {
      return (
        p.data.getDate() === data.getDate() &&
        p.data.getMonth() === data.getMonth() &&
        p.data.getFullYear() === data.getFullYear()
      );
    });
  };

  const getInjetaveisDoDia = (data: Date) => {
    return injetaveis.filter((item) => sameCalendarDay(item.data, data));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[#E8EDED]">
        <button
          type="button"
          onClick={() => mudarMes('anterior')}
          className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base sm:text-lg font-semibold tracking-tight">
          {meses[mes]} {ano}
        </span>
        <button
          type="button"
          onClick={() => mudarMes('proximo')}
          className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-2 sm:p-3 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="py-1.5 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#E8EDED]/55"
            >
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {dias.map((dia, index) => {
            if (!dia) {
              return <div key={`empty-${index}`} className="min-h-14 sm:min-h-16 rounded-xl bg-transparent" aria-hidden />;
            }

            const eHoje = sameCalendarDay(dia, hoje);
            const selecionado = diaSelecionado ? sameCalendarDay(dia, diaSelecionado) : eHoje;
            const sessoesDoDia = getSessoesDoDia(dia);
            const aplicacoesDoDia = getAplicacoesDoDia(dia);
            const injetaveisDoDia = getInjetaveisDoDia(dia);
            const pagamentosDoDia = getPagamentosDoDia(dia);
            const dataStr = toLocalYYYYMMDD(dia);
            const progresso = progressosDias[dataStr] || 0;
            const temTreino = sessoesDoDia.length > 0;
            const temEvento =
              temTreino ||
              aplicacoesDoDia.length > 0 ||
              injetaveisDoDia.length > 0 ||
              pagamentosDoDia.length > 0;

            return (
              <button
                key={index}
                type="button"
                onClick={() => setDiaSelecionado(dia)}
                title={`${dia.getDate()}${progresso > 0 ? ` · ${progresso}%` : temTreino ? ' · treino' : ''}${injetaveisDoDia.length > 0 ? ` · ${injetaveisDoDia.length} injetável(is)` : ''}`}
                className={`relative min-h-14 sm:min-h-16 rounded-xl border px-0.5 py-1.5 flex flex-col items-center gap-0.5 text-center transition-all ${
                  selecionado
                    ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 shadow-[0_8px_20px_-10px_rgba(76,203,122,0.5)] ring-2 ring-[#4CCB7A]/35'
                    : eHoje
                      ? 'border-[#2F8FA3]/45 bg-[#2F8FA3]/15 hover:border-[#4CCB7A]/40'
                      : temEvento
                        ? 'border-white/15 bg-white/[0.05] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <CalendarDayProgressBorder percent={progresso} selected={selecionado} dense />
                <span
                  className={`relative z-[1] text-sm font-semibold tabular-nums leading-none ${
                    selecionado || eHoje ? 'text-[#4CCB7A]' : 'text-[#E8EDED]/90'
                  }`}
                >
                  {dia.getDate()}
                </span>
                {progresso > 0 && (
                  <span className="relative z-[1] text-[8px] sm:text-[9px] font-semibold tabular-nums text-[#F97316] drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]">
                    {progresso}%
                  </span>
                )}
                <div className="relative z-[1] mt-auto flex flex-wrap gap-0.5 justify-center items-center min-h-[0.75rem]">
                  {temTreino && (
                    <span
                      className={`w-1 h-1 rounded-full ${selecionado ? 'bg-[#4CCB7A]' : 'bg-[#4CCB7A]/70'}`}
                      aria-hidden
                    />
                  )}
                  {aplicacoesDoDia.length > 0 && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-[#F97316]/20 ring-1 ring-[#F97316]/80 shadow-[0_0_8px_rgba(249,115,22,0.55)]"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.85))' }}
                      title={aplicacoesDoDia
                        .map((a) => `Aplicação: ${a.dose}mg - Semana ${a.semana}`)
                        .join(', ')}
                    >
                      💉
                    </span>
                  )}
                  <CalendarioInjetavelBadge items={injetaveisDoDia} dense />
                  {pagamentosDoDia.length > 0 && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-yellow-500/90 text-white"
                      title={pagamentosDoDia
                        .map(
                          (p) =>
                            `Pagamento ${p.tipo === 'nutri' ? 'Nutricionista' : 'Personal'}: R$ ${p.valor.toFixed(2)}${p.parcela ? ` - Parcela ${p.parcela}` : ''}`
                        )
                        .join(', ')}
                    >
                      💰
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia — abaixo do calendário, sem modal */}
      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 space-y-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#E8EDED]">
            Eventos em {effectiveDia.toLocaleDateString('pt-BR')}
            {!diaSelecionado && <span className="ml-1.5 text-sm font-normal text-[#E8EDED]/60">(hoje)</span>}
          </h3>
          {diaSelecionado && (
            <button
              onClick={() => setDiaSelecionado(null)}
              className="p-1 hover:bg-white/10 rounded"
              aria-label="Voltar para hoje"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Treinos */}
        {getSessoesDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2">Treinos</h4>
              <div className="space-y-3">
                {getSessoesDoDia(effectiveDia).map((sessao) => {
                  const exs = sessao.id ? (exercisesPorSessao[sessao.id] ?? []) : [];
                  return (
                    <div
                      key={sessao.id}
                      className="relative rounded-xl border border-white/15 bg-gradient-to-br from-[#0f2a5a]/85 via-[#0A1F44]/90 to-[#091936]/95 shadow-[0_16px_32px_-16px_rgba(76,203,122,0.35)] overflow-hidden"
                    >
                      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#4CCB7A]/12 blur-2xl" />
                      <div
                        onClick={() => onSessionClick(sessao)}
                        className="relative z-[1] p-3.5 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A]" />
                            <span className="font-semibold text-[#E8EDED]">{sessao.title}</span>
                            {isFutureDay && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-[#E8EDED]/90">
                                Agendado
                              </span>
                            )}
                          </div>
                          {!isFutureDay && (
                            <div className="text-xs text-[#E8EDED]/65 mt-1">
                              {sessao.status === 'done'
                                ? 'Feito'
                                : sessao.status === 'skipped'
                                ? 'Pulou'
                                : 'Agendado'}
                            </div>
                          )}
                        </div>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04]">
                          <ChevronRight className="w-4 h-4 text-[#E8EDED]/70 shrink-0" />
                        </span>
                      </div>
                      <div className="border-t border-white/10 bg-black/10 px-3 py-2.5">
                        {loadingExercisesDia && exs.length === 0 ? (
                          <p className="text-xs text-[#E8EDED]/60">Carregando exercícios…</p>
                        ) : exs.length === 0 ? (
                          <p className="text-xs text-[#E8EDED]/60">Nenhum exercício</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {exs.map((ex, i) => (
                              <li key={ex.exerciseId || i} className="flex items-center gap-2 text-sm">
                                {isFutureDay ? (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#E8EDED]/50" aria-hidden />
                                ) : (
                                  <span
                                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                      ex.status === 'done'
                                        ? 'bg-green-500 text-white'
                                        : ex.status === 'skipped'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white/15 text-[#E8EDED]/80'
                                    }`}
                                    title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                                  >
                                    {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                                  </span>
                                )}
                                <span className="text-[#E8EDED]/85 truncate">
                                  {translateExerciseName(ex.name)}
                                </span>
                                {ex.prescription && (
                                  <span className="text-xs text-[#E8EDED]/60 shrink-0">
                                    {formatTrainingSeriesSummary(ex.prescription)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aplicações */}
          {getAplicacoesDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2">Aplicações</h4>
              <div className="space-y-2">
                {getAplicacoesDoDia(effectiveDia).map((aplicacao, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border shadow-[0_12px_24px_-16px_rgba(76,203,122,0.35)] ${
                      aplicacao.status === 'tomada'
                        ? 'bg-green-500/18 border-green-400/40'
                        : aplicacao.status === 'perdida'
                        ? 'bg-red-500/18 border-red-400/40'
                        : aplicacao.status === 'hoje'
                        ? 'bg-[#2F8FA3]/22 border-[#2F8FA3]/50'
                        : 'bg-white/[0.06] border-white/18'
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60 mb-1">Aplicação</div>
                    <div className="font-semibold text-[#E8EDED]">
                      Semana {aplicacao.semana} — {aplicacao.dose} mg
                    </div>
                    <div className="text-xs text-[#E8EDED]/65 mt-1">
                      {aplicacao.status === 'tomada'
                        ? '✓ Tomada'
                        : aplicacao.status === 'perdida'
                        ? '✗ Perdida'
                        : aplicacao.status === 'hoje'
                        ? 'Hoje'
                        : 'Futura'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Injetáveis */}
          {getInjetaveisDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2 flex items-center gap-2">
                <Pill className="w-3.5 h-3.5 text-[#F97316]" aria-hidden />
                Injetáveis
              </h4>
              <div className="space-y-2">
                {getInjetaveisDoDia(effectiveDia).map((item) => {
                  const status = statusInjetavelNoDia(item);
                  return (
                    <div
                      key={`${item.aplicacaoId}-${item.semana}`}
                      className={`p-3.5 rounded-xl border shadow-[0_12px_24px_-16px_rgba(249,115,22,0.35)] ${
                        status === 'aplicado'
                          ? 'bg-green-500/18 border-green-400/40'
                          : status === 'pendente'
                            ? 'bg-[#F97316]/18 border-[#F97316]/45'
                            : status === 'hoje'
                              ? 'bg-[#F97316]/22 border-[#F97316]/55'
                              : 'bg-white/[0.06] border-white/18'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60 mb-1">Injetável</div>
                          <div className={`font-semibold text-[#E8EDED] ${item.realizado ? 'line-through opacity-75' : ''}`}>
                            {item.protocoloNome}
                          </div>
                          <div className="text-xs text-[#E8EDED]/65 mt-1">Semana {item.semana}</div>
                          {item.observacao ? (
                            <div className="text-xs text-[#E8EDED]/55 mt-1">{item.observacao}</div>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            status === 'aplicado'
                              ? 'bg-green-500/20 text-green-300'
                              : status === 'pendente' || status === 'hoje'
                                ? 'bg-[#F97316]/20 text-[#F97316]'
                                : 'bg-white/10 text-[#E8EDED]/70'
                          }`}
                        >
                          {status === 'aplicado'
                            ? '✓ Aplicado'
                            : status === 'pendente'
                              ? 'Pendente'
                              : status === 'hoje'
                                ? 'Hoje'
                                : 'Futura'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagamentos */}
          {getPagamentosDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#E8EDED]/85 mb-2">Pagamentos</h4>
              <div className="space-y-2">
                {getPagamentosDoDia(effectiveDia).map((pagamento, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-yellow-500/18 border border-yellow-400/40 rounded-xl shadow-[0_12px_24px_-16px_rgba(250,204,21,0.45)]"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60 mb-1">Pagamento</div>
                    <div className="font-semibold text-[#E8EDED]">
                      {pagamento.tipo === 'nutri' ? 'Nutricionista' : 'Personal Trainer'}
                    </div>
                    <div className="text-sm text-[#E8EDED]/65 mt-1">
                      R$ {pagamento.valor.toFixed(2)}
                      {pagamento.parcela && ` — Parcela ${pagamento.parcela}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {getSessoesDoDia(effectiveDia).length === 0 &&
          getAplicacoesDoDia(effectiveDia).length === 0 &&
          getInjetaveisDoDia(effectiveDia).length === 0 &&
          getPagamentosDoDia(effectiveDia).length === 0 && (
            <p className="text-sm text-[#E8EDED]/65">Nenhum evento neste dia.</p>
          )}
      </div>
    </div>
  );
}

export default function PersonalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    }>
      <PersonalPageContent />
    </Suspense>
  );
}
