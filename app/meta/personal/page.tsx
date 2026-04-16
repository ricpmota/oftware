'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { deleteDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import {
  Dumbbell,
  ArrowLeft,
  Calendar,
  Plus,
  History,
  BarChart3,
  Bell,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  Search,
  X,
  Stethoscope,
  Shield,
  ShieldCheck,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Link from 'next/link';
import { trainingSessionService } from '@/services/trainingSessionService';
import type {
  TrainingSession,
  TrainingSessionExercise,
  TrainingReminderPrefs,
} from '@/types/trainingSession';
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

type Tab = 'hoje' | 'cronograma' | 'criar' | 'historico' | 'estatisticas' | 'config';

/**
 * Constrói a URL do GIF do exercício usando nossa rota proxy
 * A API ExerciseDB não retorna gifUrl diretamente, mas fornece via endpoint /image
 * Usamos nossa rota proxy para autenticar com a RapidAPI key
 */
function getExerciseGifUrl(exerciseId: string, resolution: '180' | '360' | '720' | '1080' = '360'): string {
  return `/api/exercisedb/image?exerciseId=${exerciseId}&resolution=${resolution}`;
}

/** YYYY-MM-DD em horário local (scheduledDate no Firestore é local). */
function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ETAPA 0 v2 — Mini design system local (tokens + componentes) */
const ui = {
  surface: 'min-h-full bg-gradient-to-b from-emerald-500/5 via-transparent to-gray-50 dark:to-gray-900',
  card: 'rounded-2xl ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-gray-800',
  cardAlt: 'rounded-2xl ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm',
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
}: {
  embedded?: boolean;
  pacienteProp?: any;
  /** Quando true, aberto dentro do Metapersonal (mesma página, menu inferior visível); header só "Aluno: nome" */
  fromMetapersonalEmbedded?: boolean;
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
  const [loadingToday, setLoadingToday] = useState(false);
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
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [activeRunSession, setActiveRunSession] = useState<TrainingSession | null>(null);
  const [activeRunExerciseId, setActiveRunExerciseId] = useState<string | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [isRestRunning, setIsRestRunning] = useState(false);
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
  const [showPagamentosToggle, setShowPagamentosToggle] = useState(true);
  const [aplicacoesCalendario, setAplicacoesCalendario] = useState<Array<{ data: Date; semana: number; dose: number; status: string }>>([]);
  const [pagamentosCalendario, setPagamentosCalendario] = useState<Array<{ data: Date; tipo: 'nutri' | 'personal'; valor: number; parcela?: number }>>([]);
  const [paciente, setPaciente] = useState<any>(null);
  const [medicoResponsavel, setMedicoResponsavel] = useState<Medico | null>(null);
  const [aplicacaoSelecionada, setAplicacaoSelecionada] = useState<Date | null>(null);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Date | null>(null);

  // Estados do Criar Treino
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [exercisesResults, setExercisesResults] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<
    Array<Exercise & { sets: number; reps: number; restSec: number }>
  >([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [sessionType, setSessionType] = useState<'single' | 'recurring'>('single');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'custom'>('weekly');
  const [weeksCount, setWeeksCount] = useState(4);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);

  // Estados do Histórico
  const [historicoSessions, setHistoricoSessions] = useState<TrainingSession[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<TrainingSession | null>(null);
  const [selectedSessionExercises, setSelectedSessionExercises] = useState<
    TrainingSessionExercise[]
  >([]);

  // Estados de Estatísticas
  const [adherence7d, setAdherence7d] = useState(0);
  const [adherence30d, setAdherence30d] = useState(0);
  const [treinosPorSemana, setTreinosPorSemana] = useState<number[]>([]);

  // Estados de Lembretes
  const [reminderPrefs, setReminderPrefs] = useState<TrainingReminderPrefs | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);

  // Função helper para obter o ID do paciente (pacienteId da query ou user.uid)
  // Não usar useCallback para evitar problemas de inicialização
  const getPatientId = (): string | null => {
    return pacienteIdFromQuery || user?.uid || null;
  };

  // from=metapersonal ou fromMetapersonalEmbedded: header só "Aluno: nome"
  const fromMetapersonal = searchParams.get('from') === 'metapersonal' || fromMetapersonalEmbedded;

  // Ler pacienteId da query string e verificar autorização
  useEffect(() => {
    const pacienteId = searchParams.get('pacienteId');
    console.log('[useEffect] pacienteId da query:', pacienteId);
    if (pacienteId) {
      setPacienteIdFromQuery(pacienteId);
      setIsPersonalTrainerMode(true);
      console.log('[useEffect] Modo personal trainer ativado, pacienteId:', pacienteId);
    } else {
      setPacienteIdFromQuery(null);
      setIsPersonalTrainerMode(false);
      setAuthorizationError(null);
      console.log('[useEffect] Modo paciente normal');
    }
  }, [searchParams]);

  // Verificar autorização quando houver pacienteId e user
  // Se veio do /metapersonal (com pacienteId na query), confiar que já tem acesso
  // pois o paciente só aparece na lista se o Personal Trainer tiver acesso
  useEffect(() => {
    const verifyAuthorization = async () => {
      if (!pacienteIdFromQuery || !user) {
        setAuthorizationError(null);
        return;
      }
      
      try {
        // Verificar se o usuário é um personal trainer
        const personalTrainer = await PersonalTrainerService.getPersonalTrainerByUserId(user.uid);
        if (!personalTrainer) {
          setAuthorizationError('Acesso negado: você não é um Personal Trainer.');
          return;
        }

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
  }, [pacienteIdFromQuery, user, paciente]);

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
          const list = runExercisesRef.current;
          const next = list?.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
          setActiveRunExerciseId(next?.id ?? null);
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
    if (!session || !exerciseId) return;
    setActiveRunSession(session);
    setActiveRunExerciseId(exerciseId);
    setIsWorkoutRunning(true);
    setWorkoutElapsedSec(0);
    setWorkoutPaused(false);
    setRestSecondsLeft(null);
    setIsRestRunning(false);
    workoutStartAtRef.current = Date.now();
  }, []);

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
    let patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;
    
    // Se userId tem formato "uid_timestamp", tentar também apenas o uid base
    let patientIdBase = patientId;
    if (patientId.includes('_') && paciente?.userId) {
      const parts = paciente.userId.split('_');
      if (parts.length > 1) {
        patientIdBase = parts[0];
      }
    }
    
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

      let sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
      });
      
      // Se não encontrou e tem formato com timestamp, tentar com UID base
      if (sessions.length === 0 && patientIdBase !== patientId) {
        console.log('[loadCalendarSessions] Tentando buscar com UID base:', patientIdBase);
        sessions = await trainingSessionService.getPatientSessions(patientIdBase, {
          startDate,
          endDate,
        });
      }
      
      setSessoesCalendario(sessions);
    } catch (error) {
      console.error('Erro ao carregar sessões do calendário:', error);
    }
  }, [pacienteIdFromQuery, user, paciente, visualizacaoCalendario, semanaCalendario, mesCalendario]);

  const loadHistorico = useCallback(async () => {
    // Usar userId do paciente se disponível (sessões são criadas com userId)
    let patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;
    
    // Se userId tem formato "uid_timestamp", tentar também apenas o uid base
    let patientIdBase = patientId;
    if (patientId.includes('_') && paciente?.userId) {
      const parts = paciente.userId.split('_');
      if (parts.length > 1) {
        patientIdBase = parts[0];
      }
    }
    
    setLoadingHistorico(true);
    try {
      console.log('[loadHistorico] Buscando sessões para patientId:', patientId);
      const hoje = new Date();
      const sessentaDiasAtras = new Date(hoje);
      sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);
      const startDate = sessentaDiasAtras.toISOString().split('T')[0];
      const endDate = hoje.toISOString().split('T')[0];

      let sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
      });
      
      // Se não encontrou e tem formato com timestamp, tentar com UID base
      if (sessions.length === 0 && patientIdBase !== patientId) {
        console.log('[loadHistorico] Tentando buscar com UID base:', patientIdBase);
        sessions = await trainingSessionService.getPatientSessions(patientIdBase, {
          startDate,
          endDate,
        });
      }
      
      setHistoricoSessions(sessions);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  }, [pacienteIdFromQuery, user, paciente]);

  const loadEstatisticas = useCallback(async () => {
    // Usar userId do paciente se disponível (sessões são criadas com userId)
    let patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;
    
    // Se userId tem formato "uid_timestamp", tentar também apenas o uid base
    let patientIdBase = patientId;
    if (patientId.includes('_') && paciente?.userId) {
      const parts = paciente.userId.split('_');
      if (parts.length > 1) {
        patientIdBase = parts[0];
      }
    }
    
    try {
      console.log('[loadEstatisticas] Buscando sessões para patientId:', patientId);
      const hoje = new Date();

      // Aderência baseada em exercícios feitos (não sessões)
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // Buscar todas as sessões do período
      let sessions7d = await trainingSessionService.getPatientSessions(patientId, {
        startDate: seteDiasAtras.toISOString().split('T')[0],
        endDate: hoje.toISOString().split('T')[0],
      });
      let sessions30d = await trainingSessionService.getPatientSessions(patientId, {
        startDate: trintaDiasAtras.toISOString().split('T')[0],
        endDate: hoje.toISOString().split('T')[0],
      });
      
      // Se não encontrou e tem formato com timestamp, tentar com UID base
      if (sessions7d.length === 0 && patientIdBase !== patientId) {
        console.log('[loadEstatisticas] Tentando buscar com UID base:', patientIdBase);
        sessions7d = await trainingSessionService.getPatientSessions(patientIdBase, {
          startDate: seteDiasAtras.toISOString().split('T')[0],
          endDate: hoje.toISOString().split('T')[0],
        });
        sessions30d = await trainingSessionService.getPatientSessions(patientIdBase, {
          startDate: trintaDiasAtras.toISOString().split('T')[0],
          endDate: hoje.toISOString().split('T')[0],
        });
      }

      // Calcular aderência baseada em exercícios
      let totalExercises7d = 0;
      let doneExercises7d = 0;
      for (const session of sessions7d) {
        if (session.id) {
          const exercises = await trainingSessionService.getSessionExercises(session.id);
          totalExercises7d += exercises.length;
          doneExercises7d += exercises.filter((ex) => ex.status === 'done').length;
        }
      }
      const adherence7 = totalExercises7d > 0 ? (doneExercises7d / totalExercises7d) * 100 : 0;
      setAdherence7d(adherence7);

      let totalExercises30d = 0;
      let doneExercises30d = 0;
      for (const session of sessions30d) {
        if (session.id) {
          const exercises = await trainingSessionService.getSessionExercises(session.id);
          totalExercises30d += exercises.length;
          doneExercises30d += exercises.filter((ex) => ex.status === 'done').length;
        }
      }
      const adherence30 = totalExercises30d > 0 ? (doneExercises30d / totalExercises30d) * 100 : 0;
      setAdherence30d(adherence30);

      // Treinos por semana (últimas 4 semanas) - baseado em exercícios feitos
      const semanas: number[] = [];
      for (let i = 3; i >= 0; i--) {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(inicioSemana.getDate() - (i * 7 + 6));
        const fimSemana = new Date(hoje);
        fimSemana.setDate(fimSemana.getDate() - i * 7);

        let sessions = await trainingSessionService.getPatientSessions(patientId, {
          startDate: inicioSemana.toISOString().split('T')[0],
          endDate: fimSemana.toISOString().split('T')[0],
        });
        
        // Se não encontrou e tem formato com timestamp, tentar com UID base
        if (sessions.length === 0 && patientIdBase !== patientId) {
          sessions = await trainingSessionService.getPatientSessions(patientIdBase, {
            startDate: inicioSemana.toISOString().split('T')[0],
            endDate: fimSemana.toISOString().split('T')[0],
          });
        }
        
        // Contar exercícios feitos na semana
        let exercisesDone = 0;
        for (const session of sessions) {
          if (session.id) {
            const exercises = await trainingSessionService.getSessionExercises(session.id);
            exercisesDone += exercises.filter((ex) => ex.status === 'done').length;
          }
        }
        semanas.push(exercisesDone);
      }
      setTreinosPorSemana(semanas);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
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
    let patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
    if (!patientId) return;
    
    // Se userId tem formato "uid_timestamp", tentar também apenas o uid base
    // pois as sessões podem ter sido criadas com o UID base
    let patientIdBase = patientId;
    if (patientId.includes('_') && paciente?.userId) {
      // Extrair o UID base (antes do primeiro underscore)
      const parts = paciente.userId.split('_');
      if (parts.length > 1) {
        patientIdBase = parts[0];
        console.log('[loadTodaySession] userId tem timestamp, tentando também UID base:', patientIdBase);
      }
    }
    
    setLoadingToday(true);
    try {
      console.log('[loadTodaySession] Buscando sessões para patientId:', patientId);
      let sessions = await trainingSessionService.getTodaySessions(patientId);
      console.log('[loadTodaySession] Sessões encontradas com userId completo:', sessions.length);
      
      // Se não encontrou e tem formato com timestamp, tentar com UID base
      if (sessions.length === 0 && patientIdBase !== patientId) {
        console.log('[loadTodaySession] Tentando buscar com UID base:', patientIdBase);
        sessions = await trainingSessionService.getTodaySessions(patientIdBase);
        console.log('[loadTodaySession] Sessões encontradas com UID base:', sessions.length);
      }
      if (sessions.length > 0) {
        setTodaySessions(sessions);
        const firstSession = sessions[0];
        setSelectedTodaySessionId(firstSession.id || null);
        setPatientNotes(firstSession.patientNotes || '');
        if (firstSession.id) {
          const exercises = await trainingSessionService.getSessionExercises(firstSession.id);
          setTodayExercises(exercises);
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
      console.error('Erro ao carregar sessão de hoje:', error);
      setTodaySessions([]);
      setSelectedTodaySessionId(null);
      setTodayExercises([]);
      setPatientNotes('');
    } finally {
      setLoadingToday(false);
    }
  }, [pacienteIdFromQuery, user, paciente]);

  // Carregar sessão de hoje ao montar e ao mudar para a tab "Hoje"
  // IMPORTANTE: Aguardar paciente estar carregado em modo personal trainer
  useEffect(() => {
    if (activeTab !== 'hoje') return;
    
    // Em modo personal trainer, aguardar paciente estar carregado
    if (isPersonalTrainerMode && !paciente) {
      console.log('[useEffect] Aguardando paciente carregar antes de buscar treinos de hoje...');
      return;
    }
    
    loadTodaySession();
  }, [activeTab, loadTodaySession, isPersonalTrainerMode, paciente]);

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
    // Recarregar estatísticas se estiver na tab "Estatísticas"
    if (activeTab === 'estatisticas') {
      console.log('[useEffect] Recarregando estatísticas com userId:', paciente.userId);
      loadEstatisticas();
    }
  }, [paciente, activeTab, loadTodaySession, loadCalendarSessions, loadHistorico, loadEstatisticas, pacienteIdFromQuery]);

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
      loadPagamentosCalendario();
    }
  }, [activeTab, mesCalendario, semanaCalendario, visualizacaoCalendario, paciente, loadCalendarSessions, isPersonalTrainerMode]);

  // Carregar histórico
  useEffect(() => {
    if (activeTab !== 'historico') return;
    loadHistorico();
  }, [activeTab, loadHistorico]);

  // Carregar estatísticas
  useEffect(() => {
    if (activeTab !== 'estatisticas') return;
    loadEstatisticas();
  }, [activeTab, loadEstatisticas]);

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
  }, [pacienteIdFromQuery, user, activeTab]);

  // Buscar exercícios quando filtros mudarem
  useEffect(() => {
    if (!user || activeTab !== 'criar') return;
    const timeoutId = setTimeout(() => {
      searchExercises();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTarget, selectedEquipment, selectedBodyPart]);

  // Carregar exercícios quando selecionar uma sessão diferente
  const handleSelectTodaySession = async (sessionId: string) => {
    setSelectedTodaySessionId(sessionId);
    const session = todaySessions.find((s) => s.id === sessionId);
    if (session) {
      setPatientNotes(session.patientNotes || '');
      const exercises = await trainingSessionService.getSessionExercises(sessionId);
      setTodayExercises(exercises);
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
      let url = '/api/exercisedb/search?name=' + encodeURIComponent(searchQuery);
      if (!searchQuery) {
        if (selectedTarget) {
          url = `/api/exercisedb/byTarget?target=${encodeURIComponent(selectedTarget)}&page=1`;
        } else if (selectedEquipment) {
          url = `/api/exercisedb/byEquipment?equipment=${encodeURIComponent(selectedEquipment)}&page=1`;
        } else if (selectedBodyPart) {
          url = `/api/exercisedb/byBodyPart?bodyPart=${encodeURIComponent(selectedBodyPart)}&page=1`;
        } else {
          url = '/api/exercises?limit=20';
        }
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const exercises = Array.isArray(data) ? data : [];
        // A API não retorna gifUrl diretamente, então construímos a URL
        const normalizedExercises = exercises.map((ex: any) => ({
          ...ex,
          gifUrl: getExerciseGifUrl(ex.id, '360'), // Construir URL do GIF
        }));
        setExercisesResults(normalizedExercises);
      }
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleMarkExercise = async (exerciseId: string, status: 'done' | 'skipped' | null) => {
    if (!selectedTodaySessionId) return;
    
    // Em modo personal trainer, não permitir marcar exercícios como feito/pulado
    if (isPersonalTrainerMode) {
      alert('Personal Trainers não podem marcar exercícios como feito/pulado. Apenas o paciente pode fazer isso.');
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
    if (isPersonalTrainerMode) return;
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

  const nextExercise = useMemo(() => {
    const next = todayExercises.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
    return next ?? null;
  }, [todayExercises]);

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

  const runExercisesList = useMemo(() => {
    if (!activeRunSession) return [];
    return activeRunSession.id === selectedTodaySessionId ? todayExercises : selectedSessionExercisesDetail;
  }, [activeRunSession, selectedTodaySessionId, todayExercises, selectedSessionExercisesDetail]);
  const currentRunExercise = useMemo(() => runExercisesList.find((ex) => ex.id === activeRunExerciseId) ?? null, [runExercisesList, activeRunExerciseId]);

  const advanceRunToNext = useCallback(() => {
    const next = runExercisesRef.current?.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
    setActiveRunExerciseId(next?.id ?? null);
  }, []);

  const handleRunFeito = useCallback(async () => {
    if (!activeRunSession?.id || !activeRunExerciseId || isPersonalTrainerMode) return;
    const isToday = activeRunSession.id === selectedTodaySessionId;
    setSavingStatus(true);
    try {
      if (isToday) {
        await trainingSessionService.markExercise(activeRunSession.id, activeRunExerciseId, 'done');
        const now = new Date().toISOString();
        setTodayExercises((prev) => prev.map((ex) => (ex.id === activeRunExerciseId ? { ...ex, status: 'done' as const, completedAt: now } : ex)));
      } else {
        await trainingSessionService.markExercise(activeRunSession.id, activeRunExerciseId, 'done');
        const updated = await trainingSessionService.getSessionExercises(activeRunSession.id);
        setSelectedSessionExercisesDetail(updated);
      }
      const ex = runExercisesList.find((e) => e.id === activeRunExerciseId);
      const restSec = ex?.prescription?.restSec ?? 60;
      setRestSecondsLeft(restSec);
      setIsRestRunning(true);
    } catch (error) {
      console.error('Erro ao marcar exercício:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  }, [activeRunSession, activeRunExerciseId, selectedTodaySessionId, runExercisesList]);

  const handleRunPulei = useCallback(async () => {
    if (!activeRunSession?.id || !activeRunExerciseId || isPersonalTrainerMode) return;
    const isToday = activeRunSession.id === selectedTodaySessionId;
    setSavingStatus(true);
    try {
      if (isToday) {
        await trainingSessionService.markExercise(activeRunSession.id, activeRunExerciseId, 'skipped');
        const now = new Date().toISOString();
        setTodayExercises((prev) => prev.map((ex) => (ex.id === activeRunExerciseId ? { ...ex, status: 'skipped' as const, completedAt: now } : ex)));
      } else {
        await trainingSessionService.markExercise(activeRunSession.id, activeRunExerciseId, 'skipped');
        const updated = await trainingSessionService.getSessionExercises(activeRunSession.id);
        setSelectedSessionExercisesDetail(updated);
      }
      const next = runExercisesList.filter((ex) => ex.id !== activeRunExerciseId && ex.status !== 'done' && ex.status !== 'skipped')[0];
      setActiveRunExerciseId(next?.id ?? null);
    } catch (error) {
      console.error('Erro ao marcar exercício:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  }, [activeRunSession, activeRunExerciseId, selectedTodaySessionId, runExercisesList]);

  const nextExerciseSectionRef = useRef<HTMLDivElement>(null);
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const sessionDetailRef = useRef<HTMLDivElement>(null);
  const historicoDetailRef = useRef<HTMLDivElement>(null);
  const scrollToSessionDetail = () => sessionDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToHistoricoDetail = () => historicoDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const runExercisesRef = useRef<TrainingSessionExercise[]>([]);

  // Função auxiliar para gerar datas baseado na recorrência
  const generateSessionDates = (startDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate + 'T00:00:00'); // Evitar problemas de timezone
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + (weeksCount * 7) - 1);

    if (sessionType === 'single') {
      return [startDate];
    }

    if (recurrenceFrequency === 'daily') {
      const current = new Date(start);
      while (current <= endDate) {
        dates.push(toLocalYYYYMMDD(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (recurrenceFrequency === 'weekly') {
      const intervals = {
        1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5],
        5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
      };
      const dayOffsets = intervals[timesPerWeek as keyof typeof intervals] || intervals[3];
      const startDayOfWeek = start.getDay();
      for (let week = 0; week < weeksCount; week++) {
        dayOffsets.forEach((offset) => {
          const sessionDate = new Date(start);
          sessionDate.setDate(sessionDate.getDate() + offset + (week * 7));
          if (sessionDate <= endDate) dates.push(toLocalYYYYMMDD(sessionDate));
        });
      }
      dates.sort();
    } else if (recurrenceFrequency === 'custom' && selectedDaysOfWeek.length > 0) {
      const startDayOfWeek = start.getDay();
      for (let week = 0; week < weeksCount; week++) {
        selectedDaysOfWeek.forEach((targetDay) => {
          const daysToAdd = (targetDay - startDayOfWeek + 7) % 7 + (week * 7);
          const sessionDate = new Date(start);
          sessionDate.setDate(sessionDate.getDate() + daysToAdd);
          if (sessionDate >= start && sessionDate <= endDate) {
            const dateStr = toLocalYYYYMMDD(sessionDate);
            if (!dates.includes(dateStr)) dates.push(dateStr);
          }
        });
      }
      dates.sort();
    }

    return dates;
  };

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

    // Validações para treino recorrente
    if (sessionType === 'recurring') {
      if (recurrenceFrequency === 'custom' && selectedDaysOfWeek.length === 0) {
        alert('Selecione pelo menos um dia da semana para treino personalizado.');
        return;
      }
    }

    setCreatingSession(true);
    try {
      const exercisesData = selectedExercises.map((ex) => {
        const exerciseData: any = {
          source: 'exercisedb' as const,
          exerciseId: ex.id,
          name: ex.name,
          bodyPart: ex.bodyPart,
          target: ex.target,
          equipment: ex.equipment,
          prescription: {
            sets: ex.sets,
            reps: ex.reps,
            restSec: ex.restSec,
          },
        };
        exerciseData.gifUrl = getExerciseGifUrl(ex.id, '360');
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
      for (const date of sessionDates) {
        await trainingSessionService.createSessionWithExercises(
          {
            patientId: patientId,
            createdBy: isPersonalTrainerMode ? 'personal_trainer' : 'patient',
            createdById: user?.uid || '',
            scheduledDate: date,
            title: newSessionTitle,
            status: 'scheduled',
            published: true,
          },
          exercisesData
        );
      }
      
      console.log('[DEBUG] Sessão criada com sucesso');

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

      alert(`Treino criado com sucesso! ${sessionDates.length} ${sessionDates.length === 1 ? 'sessão' : 'sessões'} ${sessionType === 'recurring' ? 'agendadas' : 'criada'}.`);
      
      // Recarregar treino de hoje se alguma data criada for hoje
      const hojeStr = toLocalYYYYMMDD(new Date());
      if (sessionDates.includes(hojeStr)) {
        await loadTodaySession();
      }
      
      setActiveTab('cronograma');
      loadCalendarSessions();
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
      const exercises = await trainingSessionService.getSessionExercises(session.id);
      setSelectedSessionExercises(exercises);
    }
    scrollToHistoricoDetail();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este treino? Esta ação não pode ser desfeita.')) {
      return;
    }
    setDeletingSession(true);
    try {
      await trainingSessionService.deleteSession(sessionId);
      await loadCalendarSessions();
      await loadTodaySession();
      setSelectedSessionForDetail(null);
      setSelectedSessionExercisesDetail([]);
      alert('Treino cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      alert('Erro ao cancelar treino. Tente novamente.');
    } finally {
      setDeletingSession(false);
    }
  };

  const handleDeleteExercise = async (sessionId: string, exerciseDocId: string) => {
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
    if (selectedExercises.find((e) => e.id === exercise.id)) {
      return; // Já adicionado
    }
    // Construir URL do GIF se não existir (API não retorna diretamente)
    const gifUrl = exercise.gifUrl || getExerciseGifUrl(exercise.id, '360');
    setSelectedExercises([
      ...selectedExercises,
      {
        ...exercise,
        gifUrl: gifUrl,
        sets: 3,
        reps: 10,
        restSec: 60,
      },
    ]);
  };

  const removeExerciseFromSession = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter((e) => e.id !== exerciseId));
  };

  const updateExercisePrescription = (
    exerciseId: string,
    field: 'sets' | 'reps' | 'restSec',
    value: number
  ) => {
    setSelectedExercises(
      selectedExercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, [field]: value } : ex
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Mostrar erro de autorização se houver
  if (authorizationError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
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

  // Paciente não vinculado ao médico: bloquear Personal (modo paciente apenas)
  if (!isPersonalTrainerMode && effectivePaciente && !effectivePaciente.medicoResponsavelId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
            <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Vínculo com médico necessário
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
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

  // Calcular aderência para exibição no header
  const adherenceDisplay = adherence7d > 0 ? `${adherence7d.toFixed(0)}%` : '--';

  const nomePaciente = paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || 'Paciente';

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${fromMetapersonal ? 'flex flex-col h-screen' : ''}`}>
      {/* Header - omitir quando embedded (página /meta já tem menu) */}
      {!embedded && (
      <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10 ${fromMetapersonal ? 'fixed top-0 left-0 right-0 z-40' : 'sticky top-0'}`}>
        <div className={fromMetapersonal ? 'px-4 py-3' : 'max-w-6xl mx-auto px-4 py-4'}>
          {/* Aberto pelo Metapersonal (mobile): barra fixa no topo ao rolar — logo Personal + nome do paciente + fechar */}
          {fromMetapersonal ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Dumbbell className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {nomePaciente}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => router.push('/metapersonal')}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>
          ) : (
            <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isPersonalTrainerMode) {
                    router.push('/metapersonal');
                  } else {
                    router.push('/meta');
                  }
                }}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <Dumbbell className="w-6 h-6 text-emerald-600" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Personal</h1>
                {isPersonalTrainerMode && paciente && (
                  <span className="px-3 py-1 text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200 rounded-md shadow-sm">
                    Aluno: <span className="font-semibold">{paciente.nome}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu superior: nome do médico do aluno — só em modo PT (não quando fromMetapersonal) */}
          {isPersonalTrainerMode && paciente && medicoResponsavel && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <Stethoscope className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                  {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                </span>
                {medicoResponsavel.isVerificado ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Shield className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </header>
      )}

      {/* Conteúdo rolável quando aberto pelo Metapersonal; pt-14 = espaço para a barra fixa */}
      <div className={fromMetapersonal ? 'flex-1 overflow-y-auto pt-14' : ''}>
      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700">
          {(
            [
              { id: 'hoje', label: 'Hoje', icon: Calendar },
              { id: 'cronograma', label: 'Cronograma', icon: Calendar },
              { id: 'criar', label: 'Criar', icon: Plus },
              { id: 'historico', label: 'Histórico', icon: History },
              { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
              { id: 'config', label: 'Configurações', icon: Shield },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'hoje' && (
          <Surface className="rounded-2xl">
            <div className="space-y-4">
            {loadingToday ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : todaySessions.length > 0 ? (
              <div className="space-y-6">
                {/* Seletor de sessões se houver múltiplas */}
                {/* Treino selecionado */}
                {selectedTodaySessionId && todaySelectedSession && (
                  <div className="space-y-4">
                    {/* ETAPA 1 v2 — Hero full-bleed: Card glass + Progress Capsule + CTA único */}
                    <Card variant="glass" className="p-6 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Treino de hoje</p>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-black/5 dark:ring-white/10 ${
                          todaySelectedSession.status === 'done'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : todaySelectedSession.status === 'skipped'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                        }`}>
                          {todaySelectedSession.status === 'done' ? 'Concluído' : todaySelectedSession.status === 'skipped' ? 'Pulado' : 'Agendado'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-white">
                        {todaySelectedSession.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {progress.total} exercícios • {progress.percentage}% • {progress.done}/{progress.total}
                      </p>
                      {/* Progress Capsule: pill com track + fill em gradiente + texto à direita */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                          Hoje: {progress.percentage}%
                        </span>
                      </div>
                      {nextExercise === null ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl font-semibold text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 cursor-not-allowed ring-1 ring-black/5 dark:ring-white/10 border border-gray-200/50 dark:border-white/10"
                        >
                          Treino concluído ✅
                        </button>
                      ) : (
                        <PrimaryCTA onClick={() => startWorkout(todaySelectedSession, nextExercise?.id ?? todayExercises.find((ex) => ex.status !== 'done' && ex.status !== 'skipped')?.id ?? todayExercises[0]?.id ?? null)}>
                          <Play className="w-5 h-5" />
                          Iniciar treino
                        </PrimaryCTA>
                      )}
                    </Card>

                    {/* ETAPA 4 v2 — Seletor de sessões: segmented pills sticky (blur + hairline) */}
                    {todaySessions.length > 1 && (
                      <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-black/5 dark:border-white/10">
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
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/30'
                                      : 'bg-black/5 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10 ring-1 ring-transparent'
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

                    {/* ETAPA 2 v2 — Próximo exercício: media card vertical (mídia primeiro) */}
                    <div ref={nextExerciseSectionRef} className="scroll-mt-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                        Próximo exercício
                      </h3>
                      {nextExercise ? (
                        <Card variant="solid" className="overflow-hidden p-0">
                          <div className="flex flex-col">
                            {/* Mídia em cima: 16:9 + overlay "Próximo" + gradiente no rodapé */}
                            {nextExercise.gifUrl && (
                              <div className="relative aspect-video w-full rounded-t-2xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                                <img
                                  src={nextExercise.gifUrl}
                                  alt={translateExerciseName(nextExercise.name)}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500 text-white ring-1 ring-white/30">
                                  Próximo
                                </span>
                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" aria-hidden />
                              </div>
                            )}
                            <div className="p-4 space-y-3">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {translateExerciseName(nextExercise.name)}
                              </h4>
                              <div className="flex gap-2 flex-wrap">
                                <span className={`${ui.pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800`}>
                                  {translateTarget(nextExercise.target)}
                                </span>
                                {nextExercise.equipment && nextExercise.equipment !== 'body weight' && (
                                  <span className={`${ui.pill} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>
                                    {translateEquipment(nextExercise.equipment)}
                                  </span>
                                )}
                              </div>
                              {nextExercise.prescription && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tabular-nums">
                                  {nextExercise.prescription.sets}×{nextExercise.prescription.reps} • {nextExercise.prescription.restSec}s
                                </p>
                              )}
                              <div className={`${ui.hairline} pt-3 flex gap-2`}>
                                <button
                                  type="button"
                                  onClick={() => nextExercise.id && handleMarkExercise(nextExercise.id, 'done')}
                                  disabled={savingStatus}
                                  className={`flex-1 flex items-center justify-center gap-2 ${ui.btnSuccess} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-transform`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Feito
                                </button>
                                <button
                                  type="button"
                                  onClick={() => nextExercise.id && handleMarkExercise(nextExercise.id, 'skipped')}
                                  disabled={savingStatus}
                                  className={`flex-1 flex items-center justify-center gap-2 ${ui.btnDanger} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-transform`}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Pulei
                                </button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ) : (
                        <Card variant="glass" className="p-6 text-center space-y-4">
                          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            Você concluiu o treino de hoje 🎉
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => setShowAllExercises(true)}
                              className={`${ui.btnGhost} text-sm py-2 px-3 rounded-xl`}
                            >
                              Ver exercícios
                            </button>
                            <button
                              type="button"
                              onClick={() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                              className={`${ui.pill} bg-white/80 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-white/20 transition-colors text-sm py-2 px-3`}
                            >
                              Adicionar nota
                            </button>
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* ETAPA 3 v2 — Ver todos: lista premium com expand inline (hairline, accent bar, 1 expand por vez) */}
                    <Card variant="solid" className="overflow-hidden p-0">
                      <button
                        type="button"
                        onClick={() => setShowAllExercises((v) => !v)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left font-semibold text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span>Ver todos os exercícios</span>
                        <ChevronRight
                          className={`w-5 h-5 flex-shrink-0 transition-transform ${showAllExercises ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {showAllExercises && (
                        <div className={ui.hairline}>
                          {todayExercises.map((exercise, index) => {
                            const isDone = exercise.status === 'done';
                            const isSkipped = exercise.status === 'skipped';
                            const rowId = exercise.id ?? `idx-${index}`;
                            const isExpanded = expandedExerciseId === rowId;
                            return (
                              <div key={rowId}>
                                <div
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                                    isDone ? 'border-l-2 border-l-green-500' : isSkipped ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'
                                  }`}
                                  onClick={() => setExpandedExerciseId(isExpanded ? null : rowId)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => e.key === 'Enter' && setExpandedExerciseId(isExpanded ? null : rowId)}
                                >
                                  {exercise.gifUrl && (
                                    <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/10">
                                      <img src={exercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                      {translateExerciseName(exercise.name)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                      {exercise.prescription ? `${exercise.prescription.sets}×${exercise.prescription.reps}` : '—'}
                                    </p>
                                  </div>
                                  {(isDone || isSkipped) && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                      isDone ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'
                                    }`}>
                                      {isDone ? 'Feito' : 'Pulei'}
                                    </span>
                                  )}
                                  <ChevronRight className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                {isExpanded && (
                                  <div className={`px-4 pb-4 pt-1 ${ui.hairline} bg-black/5 dark:bg-white/5`}>
                                    <div className="flex gap-2 flex-wrap mb-3">
                                      <span className={`${ui.pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>{translateTarget(exercise.target)}</span>
                                      {exercise.equipment && exercise.equipment !== 'body weight' && (
                                        <span className={`${ui.pill} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>{translateEquipment(exercise.equipment)}</span>
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
                                {index < todayExercises.length - 1 && <div className={ui.hairline} />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                {/* ETAPA 5 v2 — Notas: mobile = card compacto + bottom sheet; desktop = inline */}
                <div ref={notesSectionRef} className="scroll-mt-4">
                  {isMobile ? (
                    <>
                      <Card variant="glass" className="p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Observações</h3>
                          <button type="button" onClick={() => setNotesSheetOpen(true)} className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                            Editar
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[2.5rem]">
                          {patientNotes.trim() || 'Nenhuma observação.'}
                        </p>
                      </Card>
                      {notesSheetOpen && (
                        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 dark:bg-black/60" onClick={() => setNotesSheetOpen(false)}>
                          <div className="bg-white dark:bg-gray-800 rounded-t-2xl ring-1 ring-black/5 dark:ring-white/10 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Observações do treino</h3>
                              <button type="button" onClick={() => setNotesSheetOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                              <textarea
                                value={patientNotes}
                                onChange={(e) => setPatientNotes(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white text-gray-900 placeholder-gray-500 min-h-[120px]"
                                rows={5}
                                placeholder="Como foi o treino? (energia, cargas, dor, observações)"
                              />
                            </div>
                            <div className="p-4 border-t border-black/5 dark:border-white/10">
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
                    <Card variant="solid" className="p-4 sm:p-6 space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Observações do treino</h3>
                      <textarea
                        value={patientNotes}
                        onChange={(e) => setPatientNotes(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 transition-colors"
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
            ) : (
              <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Você ainda não tem treino para hoje.
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button
                    onClick={() => setActiveTab('criar')}
                    className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar
                  </button>
                  <button
                    onClick={() => setActiveTab('cronograma')}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Cronograma
                  </button>
                </div>
              </div>
            )}
            </div>
          </Surface>
        )}

        {activeTab === 'cronograma' && (
          <div className="space-y-6">
            {futureSessionToast && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 ring-1 ring-black/5 dark:ring-white/10 text-center">
                {futureSessionToast}
              </div>
            )}
            {/* Controles do calendário */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
              {/* Toggle Mês/Semana */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Visualização
                </h3>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setVisualizacaoCalendario('mes')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      visualizacaoCalendario === 'mes'
                        ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => setVisualizacaoCalendario('semana')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      visualizacaoCalendario === 'semana'
                        ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>

              {/* Toggles para mostrar eventos */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">Treinos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAplicacoesToggle}
                      onChange={(e) => setShowAplicacoesToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Aplicações</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPagamentosToggle}
                      onChange={(e) => setShowPagamentosToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Pagamentos</span>
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
                <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Selecione um treino no calendário para ver os detalhes.</p>
                </div>
              )}
            </div>

            {/* Modal overlay do treino (Cronograma) — ETAPA 1: bottom-sheet mobile / centralizado desktop */}
            {selectedSessionForDetail && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:justify-center md:p-4 bg-black/50"
                onClick={(e) => e.target === e.currentTarget && (setSelectedSessionForDetail(null), setSelectedSessionExercisesDetail([]))}
              >
                <div
                  className="w-full h-[85vh] rounded-t-3xl md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Sticky header: título + data + X + chips + mini progresso */}
                  <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-black/5 dark:border-white/10 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{selectedSessionForDetail.title}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {new Date(selectedSessionForDetail.scheduledDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <button type="button" onClick={() => { setSelectedSessionForDetail(null); setSelectedSessionExercisesDetail([]); }} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 flex-shrink-0" aria-label="Fechar">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-black/5 dark:ring-white/10 ${
                        selectedSessionForDetail.status === 'done' ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                          : selectedSessionForDetail.status === 'skipped' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedSessionForDetail.status === 'done' ? 'Feito' : selectedSessionForDetail.status === 'skipped' ? 'Pulou' : 'Agendado'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{selectedProgress.totalCount} exercícios • {selectedProgress.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${selectedProgress.percent}%` }} />
                    </div>
                  </div>

                  {/* Conteúdo rolável: Timer Bar (ETAPA 2–4), Próximo, Ver todos */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {/* Timer Bar: estado A (não iniciado) ou B (em andamento) ou descanso */}
                    <div className="rounded-xl ring-1 ring-black/5 dark:ring-white/10 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3 sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50 -mt-4 pt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Treino em andamento</p>
                      {restFinishedBadge ? (
                        <div className="py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium text-center">Descanso finalizado</div>
                      ) : restSecondsLeft != null ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-center">
                            {Math.floor((restSecondsLeft ?? 0) / 60)}:{(restSecondsLeft ?? 0) % 60 < 10 ? '0' : ''}{(restSecondsLeft ?? 0) % 60}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setIsRestRunning((r) => !r)} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${ui.btnGhost}`}>
                              {isRestRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              {isRestRunning ? 'Pausar' : 'Continuar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsRestRunning(false);
                                setRestSecondsLeft(null);
                                const list = runExercisesRef.current;
                                const next = list?.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
                                setActiveRunExerciseId(next?.id ?? null);
                              }}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${ui.btnGhost}`}
                            >
                              Pular descanso
                            </button>
                          </div>
                        </div>
                      ) : isWorkoutRunning && activeRunSession?.id === selectedSessionForDetail?.id ? (
                        <div className="space-y-3">
                          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white tabular-nums text-center">
                            {String(Math.floor(workoutElapsedSec / 60)).padStart(2, '0')}:{String(workoutElapsedSec % 60).padStart(2, '0')}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => setWorkoutPaused((p) => !p)} className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${ui.btnGhost}`}>
                              {workoutPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                              {workoutPaused ? 'Continuar' : 'Pausar'}
                            </button>
                            <button type="button" onClick={() => setWorkoutElapsedSec(0)} className={`py-2 px-3 rounded-lg text-sm font-semibold ${ui.btnGhost}`}>Reset</button>
                            <button type="button" onClick={() => setRestSoundEnabled((e) => !e)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400" title={restSoundEnabled ? 'Desligar som' : 'Ligar som'}>
                              {restSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Descanso padrão (próximo Feito):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[30, 45, 60, 90, 120].map((sec) => (
                              <button key={sec} type="button" onClick={() => setRestDefaultSec(sec)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${restDefaultSec === sec ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Descanso padrão: {restDefaultSec}s</p>
                          <div className="flex gap-2 flex-wrap">
                            {[30, 45, 60, 90, 120].map((sec) => (
                              <button key={sec} type="button" onClick={() => setRestDefaultSec(sec)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${restDefaultSec === sec ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                {sec}s
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => { setActiveTab('hoje'); setSelectedSessionForDetail(null); setSelectedSessionExercisesDetail([]); }} className="w-full py-2 px-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Abrir em Hoje
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Próximo exercício */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Próximo exercício</h3>
                      {selectedSessionExercisesDetail.length === 0 ? (
                        <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                          <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Carregando exercícios...</p>
                        </div>
                      ) : !selectedNextExercise ? (
                        <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
                          <p className="text-gray-600 dark:text-gray-400">Treino concluído 🎉</p>
                        </div>
                      ) : (
                        <Card variant="solid" className="p-4 overflow-hidden">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {selectedNextExercise.gifUrl && (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                                <img src={selectedNextExercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{translateExerciseName(selectedNextExercise.name)}</h4>
                              <div className="flex gap-2 flex-wrap">
                                <span className={`${ui.pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>{translateTarget(selectedNextExercise.target)}</span>
                                {selectedNextExercise.equipment && selectedNextExercise.equipment !== 'body weight' && (
                                  <span className={`${ui.pill} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>{translateEquipment(selectedNextExercise.equipment)}</span>
                                )}
                              </div>
                              {selectedNextExercise.prescription && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {selectedNextExercise.prescription.sets}x{selectedNextExercise.prescription.reps} • {selectedNextExercise.prescription.restSec}s descanso
                                </p>
                              )}
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!selectedSessionForDetail?.id || !selectedNextExercise?.id) return;
                                    await handleMarkCalendarExercise(selectedSessionForDetail.id, selectedNextExercise.id, 'done');
                                    if (timerAutoStart) {
                                      setRestSecondsLeft(selectedNextExercise.prescription?.restSec ?? restDefaultSec);
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
                        </Card>
                      )}
                    </div>

                    {/* Ver todos os exercícios (accordion) */}
                    <Card variant="solid" className="overflow-hidden p-0">
                      <button type="button" onClick={() => setShowAllCalendarExercises((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left font-semibold text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <span>Ver todos os exercícios</span>
                        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${showAllCalendarExercises ? 'rotate-90' : ''}`} />
                      </button>
                      {showAllCalendarExercises && (
                        <div className={ui.hairline}>
                          {selectedSessionExercisesDetail.map((exercise, index) => (
                            <div key={exercise.id ?? index} className={`px-4 py-3 flex items-center gap-3 ${index > 0 ? ui.hairline : ''} ${exercise.status === 'done' ? 'border-l-2 border-l-green-500' : exercise.status === 'skipped' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'}`}>
                              {exercise.gifUrl && (
                                <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/10">
                                  <img src={exercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{translateExerciseName(exercise.name)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.prescription ? `${exercise.prescription.sets}×${exercise.prescription.reps}` : '—'}</p>
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
                    </Card>

                    <button onClick={() => selectedSessionForDetail.id && handleDeleteSession(selectedSessionForDetail.id)} disabled={deletingSession} className="w-full py-2.5 px-4 rounded-xl font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> {deletingSession ? 'Cancelando...' : 'Cancelar treino'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'criar' && (
          <div className="space-y-6">
            {/* Formulário da sessão */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título do treino
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Treino A - Superior"
                />
              </div>

              {/* Tipo de treino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de treino
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSessionType('single')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sessionType === 'single'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Treino único
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionType('recurring')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sessionType === 'recurring'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Treino recorrente
                  </button>
                </div>
              </div>

              {/* Data inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {sessionType === 'single' ? 'Data' : 'Data inicial'}
                </label>
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  min={hojeStr}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Configurações de recorrência */}
              {sessionType === 'recurring' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Periodicidade
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRecurrenceFrequency('daily');
                          setSelectedDaysOfWeek([]);
                        }}
                        className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                          recurrenceFrequency === 'daily'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Diário
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecurrenceFrequency('weekly');
                          setSelectedDaysOfWeek([]);
                        }}
                        className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                          recurrenceFrequency === 'weekly'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Semanal
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecurrenceFrequency('custom')}
                        className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                          recurrenceFrequency === 'custom'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Personalizado
                      </button>
                    </div>
                  </div>

                  {/* Dias da semana (se personalizado) */}
                  {recurrenceFrequency === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dias da semana
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              const newDays = selectedDaysOfWeek.includes(index)
                                ? selectedDaysOfWeek.filter((d) => d !== index)
                                : [...selectedDaysOfWeek, index];
                              setSelectedDaysOfWeek(newDays);
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              selectedDaysOfWeek.includes(index)
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {dia}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Repetições por semana (se semanal) */}
                  {recurrenceFrequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantas vezes por semana?
                      </label>
                      <select
                        value={timesPerWeek}
                        onChange={(e) => setTimesPerWeek(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'vez' : 'vezes'} por semana
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Número de semanas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duração (semanas)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={weeksCount}
                        onChange={(e) => setWeeksCount(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
                        {weeksCount} {weeksCount === 1 ? 'semana' : 'semanas'}
                      </span>
                    </div>
                  </div>

                  {/* Preview das datas */}
                  {newSessionDate && (
                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                        📅 Resumo:
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {recurrenceFrequency === 'daily' && `Treino diário por ${weeksCount} ${weeksCount === 1 ? 'semana' : 'semanas'}`}
                        {recurrenceFrequency === 'weekly' && `${timesPerWeek} ${timesPerWeek === 1 ? 'treino' : 'treinos'} por semana por ${weeksCount} ${weeksCount === 1 ? 'semana' : 'semanas'}`}
                        {recurrenceFrequency === 'custom' && selectedDaysOfWeek.length > 0 && (
                          <>
                            {selectedDaysOfWeek.length} {selectedDaysOfWeek.length === 1 ? 'dia' : 'dias'} por semana ({selectedDaysOfWeek.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}) por {weeksCount} {weeksCount === 1 ? 'semana' : 'semanas'}
                          </>
                        )}
                        {recurrenceFrequency === 'custom' && selectedDaysOfWeek.length === 0 && 'Selecione os dias da semana'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filtros de busca */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Buscar exercícios
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Encontre exercícios por nome, parte do corpo, músculo ou equipamento
                </p>
              </div>

              {/* Campo de busca por nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do exercício
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do exercício..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Parte do corpo
                  </label>
                  <select
                    value={selectedBodyPart}
                    onChange={(e) => setSelectedBodyPart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Todas as partes</option>
                    {bodyParts.map((bp) => (
                      <option key={bp} value={bp}>
                        {translateBodyPart(bp)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Músculo alvo
                  </label>
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Todos os músculos</option>
                    {targets.map((t) => {
                      const translated = translateTarget(t);
                      const capitalized = translated.charAt(0).toUpperCase() + translated.slice(1);
                      return (
                        <option key={t} value={t}>
                          {capitalized}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Equipamento
                  </label>
                  <select
                    value={selectedEquipment}
                    onChange={(e) => setSelectedEquipment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Todos os equipamentos</option>
                    {equipments.map((eq) => (
                      <option key={eq} value={eq}>
                        {translateEquipment(eq)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Resultados da busca */}
            {loadingExercises ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : exercisesResults.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {exercisesResults.map((exercise) => {
                  const isAdded = selectedExercises.some((e) => e.id === exercise.id);
                  return (
                    <div
                      key={exercise.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700"
                    >
                      {exercise.gifUrl && (
                        <div className="relative w-full h-40 overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <img
                            src={exercise.gifUrl}
                            alt={translateExerciseName(exercise.name)}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                          {translateExerciseName(exercise.name)}
                        </h4>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <button
                            type="button"
                            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2.5 py-1 rounded-full transition-colors border border-emerald-200 dark:border-emerald-800"
                            title={translateTarget(exercise.target)}
                          >
                            {translateTarget(exercise.target)}
                          </button>
                          {exercise.equipment && exercise.equipment.toLowerCase() !== 'body weight' && (
                            <button
                              type="button"
                              className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2.5 py-1 rounded-full transition-colors border border-gray-200 dark:border-gray-600"
                              title={translateEquipment(exercise.equipment)}
                            >
                              {translateEquipment(exercise.equipment)}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => addExerciseToSession(exercise)}
                          disabled={isAdded}
                          className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                            isAdded
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow'
                          }`}
                        >
                          {isAdded ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-4 h-4" />
                              Adicionado
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1.5">
                              <Plus className="w-4 h-4" />
                              Adicionar
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhum exercício encontrado. Tente outros filtros.
              </div>
            )}

            {/* Exercícios selecionados */}
            {selectedExercises.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Exercícios do treino ({selectedExercises.length})
                </h3>
                {selectedExercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {index + 1}. {translateExerciseName(exercise.name)}
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {translateTarget(exercise.target)} · {translateEquipment(exercise.equipment)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeExerciseFromSession(exercise.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Séries
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={exercise.sets}
                          onChange={(e) =>
                            updateExercisePrescription(exercise.id, 'sets', parseInt(e.target.value))
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Reps
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={exercise.reps}
                          onChange={(e) =>
                            updateExercisePrescription(exercise.id, 'reps', parseInt(e.target.value))
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Descanso (s)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={exercise.restSec}
                          onChange={(e) =>
                            updateExercisePrescription(
                              exercise.id,
                              'restSec',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleCreateSession}
                  disabled={
                    creatingSession ||
                    !newSessionTitle ||
                    !newSessionDate ||
                    selectedExercises.length === 0 ||
                    (sessionType === 'recurring' && recurrenceFrequency === 'custom' && selectedDaysOfWeek.length === 0)
                  }
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {creatingSession
                    ? `Publicando ${sessionType === 'recurring' ? 'treinos...' : 'treino...'}`
                    : sessionType === 'recurring'
                    ? 'Publicar treinos recorrentes'
                    : 'Publicar no calendário'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            {loadingHistorico ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : historicoSessions.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">Nenhum treino no histórico.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicoSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
                    onClick={() => handleViewHistoricoSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {session.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(session.scheduledDate).toLocaleDateString('pt-BR')}
                        </p>
                        {session.patientNotes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {session.patientNotes}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          session.status === 'done'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : session.status === 'skipped'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
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
                ))}
              </div>
            )}

            {/* ETAPA 4 — Detalhe do treino inline (padrão Hoje/Cronograma) — sem modal */}
            <div ref={historicoDetailRef} className="space-y-4 scroll-mt-4 mt-6">
              {!selectedSessionDetail ? (
                <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Selecione um treino na lista para ver os detalhes.
                  </p>
                </div>
              ) : (
                <>
                  <Card variant="solid" className="p-6 space-y-4 relative">
                    <button
                      type="button"
                      onClick={() => { setSelectedSessionDetail(null); setSelectedSessionExercises([]); }}
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
                      aria-label="Limpar seleção"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white pr-10">{selectedSessionDetail.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(selectedSessionDetail.scheduledDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-black/5 dark:ring-white/10 ${
                        selectedSessionDetail.status === 'done' ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                          : selectedSessionDetail.status === 'skipped' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedSessionDetail.status === 'done' ? 'Feito' : selectedSessionDetail.status === 'skipped' ? 'Pulou' : 'Agendado'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{historicoProgress.totalCount} exercícios • {historicoProgress.percent}%</p>
                    <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${historicoProgress.percent}%` }} />
                    </div>
                  </Card>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Próximo exercício</h3>
                    {selectedSessionExercises.length === 0 ? (
                      <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando exercícios...</p>
                      </div>
                    ) : !historicoNextExercise ? (
                      <div className="rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
                        <p className="text-gray-600 dark:text-gray-400">Treino concluído 🎉</p>
                      </div>
                    ) : (
                      <Card variant="solid" className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {historicoNextExercise.gifUrl && (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                              <img src={historicoNextExercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{translateExerciseName(historicoNextExercise.name)}</h4>
                            <div className="flex gap-2 flex-wrap">
                              <span className={`${ui.pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>{translateTarget(historicoNextExercise.target)}</span>
                              {historicoNextExercise.equipment && historicoNextExercise.equipment !== 'body weight' && (
                                <span className={`${ui.pill} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>{translateEquipment(historicoNextExercise.equipment)}</span>
                              )}
                            </div>
                            {historicoNextExercise.prescription && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {historicoNextExercise.prescription.sets}x{historicoNextExercise.prescription.reps} • {historicoNextExercise.prescription.restSec}s descanso
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                  <Card variant="solid" className="overflow-hidden p-0">
                    <button type="button" onClick={() => setShowAllHistoricoExercises((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left font-semibold text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <span>Ver todos os exercícios</span>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${showAllHistoricoExercises ? 'rotate-90' : ''}`} />
                    </button>
                    {showAllHistoricoExercises && (
                      <div className={ui.hairline}>
                        {selectedSessionExercises.map((exercise, index) => (
                          <div key={exercise.id ?? index} className={`px-4 py-3 flex items-center gap-3 ${index > 0 ? ui.hairline : ''} ${exercise.status === 'done' ? 'border-l-2 border-l-green-500' : exercise.status === 'skipped' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'}`}>
                            {exercise.gifUrl && (
                              <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/10">
                                <img src={exercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{translateExerciseName(exercise.name)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.prescription ? `${exercise.prescription.sets}×${exercise.prescription.reps}` : '—'}</p>
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
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'estatisticas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Aderência 7 dias
                </h3>
                <div className="text-4xl font-bold text-emerald-600">
                  {adherence7d.toFixed(0)}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Aderência 30 dias
                </h3>
                <div className="text-4xl font-bold text-emerald-600">
                  {adherence30d.toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Treinos feitos por semana (últimas 4 semanas)
              </h3>
              <div className="space-y-2">
                {treinosPorSemana.map((count, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-gray-600 dark:text-gray-400">
                      Semana {4 - index}
                    </span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                      <div
                        className="bg-emerald-600 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min((count / 7) * 100, 100)}%` }}
                      >
                        {count > 0 && (
                          <span className="text-xs text-white font-medium">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações</h2>

            {/* Card Timer — preferências de som, descanso padrão, auto start */}
            <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-gray-800 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Timer</h3>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={restSoundEnabled} onChange={(e) => setRestSoundEnabled(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  {restSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Som do descanso
                </span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descanso padrão (s)</label>
                <input type="number" min={10} max={600} value={restDefaultSec} onChange={(e) => setRestDefaultSec(Math.min(600, Math.max(10, Number(e.target.value) || 10)))} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white" />
              </div>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={timerAutoStart} onChange={(e) => setTimerAutoStart(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Iniciar descanso automaticamente ao marcar Feito/Pulei</span>
              </label>
            </div>

            {/* Preferências de notificações (ex-Lembretes) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lembretes</h3>
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
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Habilitar lembretes
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={reminderPrefs.time}
                    onChange={(e) =>
                      setReminderPrefs({ ...reminderPrefs, time: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dias da semana
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const days = reminderPrefs.daysOfWeek || [];
                          const newDays = days.includes(index)
                            ? days.filter((d) => d !== index)
                            : [...days, index];
                          setReminderPrefs({ ...reminderPrefs, daysOfWeek: newDays });
                        }}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          reminderPrefs.daysOfWeek?.includes(index)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {dia}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSaveReminderPrefs}
                  disabled={savingReminder}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingReminder ? 'Salvando...' : 'Salvar preferências'}
                </button>
              </>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Configure suas preferências de lembrete.
                </p>
                <button
                  onClick={() => {
                    setReminderPrefs({
                      enabled: false,
                      time: '08:00',
                      daysOfWeek: [],
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Criar preferências
                </button>
              </div>
            )}
            </div>
          </div>
        )}
      </main>

      {/* ETAPA 3 — Bottom sheet "Treino em andamento" com cronômetro de descanso */}
      {isWorkoutRunning && !selectedSessionForDetail && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
          <div className="pointer-events-auto h-[70vh] max-h-[85vh] rounded-t-3xl bg-white dark:bg-gray-800 ring-1 ring-black/10 dark:ring-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {activeRunSession?.title ?? 'Treino'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsWorkoutRunning(false);
                  setActiveRunSession(null);
                  setActiveRunExerciseId(null);
                  setRestSecondsLeft(null);
                  setIsRestRunning(false);
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
                aria-label="Sair"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {restSecondsLeft != null ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Descanso</p>
                  <div className="text-4xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-center py-6">
                    {Math.floor((restSecondsLeft ?? 0) / 60)}:{(restSecondsLeft ?? 0) % 60 < 10 ? '0' : ''}{(restSecondsLeft ?? 0) % 60}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRestRunning((r) => !r)}
                      className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${ui.btnGhost}`}
                    >
                      {isRestRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {isRestRunning ? 'Pausar' : 'Continuar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRestRunning(false);
                        setRestSecondsLeft(null);
                        const next = runExercisesRef.current?.find((ex) => ex.status !== 'done' && ex.status !== 'skipped');
                        setActiveRunExerciseId(next?.id ?? null);
                      }}
                      className={`flex-1 py-3 rounded-xl font-semibold ${ui.btnGhost}`}
                    >
                      Pular descanso
                    </button>
                  </div>
                </div>
              ) : !currentRunExercise ? (
                <div className="text-center py-12">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">Treino concluído 🎉</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkoutRunning(false);
                      setActiveRunSession(null);
                      setActiveRunExerciseId(null);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/10">
                    {currentRunExercise.gifUrl && (
                      <div className="aspect-video w-full">
                        <img src={currentRunExercise.gifUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{translateExerciseName(currentRunExercise.name)}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`${ui.pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>{translateTarget(currentRunExercise.target)}</span>
                        {currentRunExercise.equipment && currentRunExercise.equipment !== 'body weight' && (
                          <span className={`${ui.pill} bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300`}>{translateEquipment(currentRunExercise.equipment)}</span>
                        )}
                      </div>
                      {currentRunExercise.prescription && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {currentRunExercise.prescription.sets}×{currentRunExercise.prescription.reps} • {currentRunExercise.prescription.restSec}s descanso
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleRunFeito} disabled={savingStatus} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold ${ui.btnSuccess} disabled:opacity-50`}>
                      <CheckCircle className="w-5 h-5" /> Feito
                    </button>
                    <button type="button" onClick={handleRunPulei} disabled={savingStatus} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold ${ui.btnDanger} disabled:opacity-50`}>
                      <XCircle className="w-5 h-5" /> Pulei
                    </button>
                    <button
                      type="button"
                      onClick={advanceRunToNext}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold ${ui.btnGhost}`}
                    >
                      <ChevronRight className="w-5 h-5" /> Próximo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Componente de Calendário Semanal
function CalendarioSemanalComponent({
  semanaCalendario,
  setSemanaCalendario,
  diaSelecionado,
  setDiaSelecionado,
  sessoes,
  aplicacoes,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => mudarSemana('anterior')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold">
          {diasSemana[0].getDate()} - {diasSemana[6].getDate()} de {meses[diasSemana[0].getMonth()]} {diasSemana[0].getFullYear()}
        </span>
        <button
          onClick={() => mudarSemana('proximo')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7">
          {diasSemana.map((dia, index) => {
            const eHoje =
              dia.getDate() === hoje.getDate() &&
              dia.getMonth() === hoje.getMonth() &&
              dia.getFullYear() === hoje.getFullYear();
            const sessoesDoDia = getSessoesDoDia(dia);
            const aplicacoesDoDia = getAplicacoesDoDia(dia);
            const pagamentosDoDia = getPagamentosDoDia(dia);
            const dayStartCell = new Date(dia);
            dayStartCell.setHours(0, 0, 0, 0);
            const isFutureDayCell = dayStartCell.getTime() > hoje.getTime();

            let corFundo = '';
            if (eHoje) {
              corFundo = 'bg-blue-50 dark:bg-blue-900/20';
            } else if (sessoesDoDia.length > 0 || aplicacoesDoDia.length > 0 || pagamentosDoDia.length > 0) {
              corFundo = 'bg-emerald-50 dark:bg-emerald-900/20';
            } else {
              corFundo = 'bg-white dark:bg-gray-800';
            }

            return (
              <div
                key={index}
                onClick={() => setDiaSelecionado(dia)}
                className={`min-h-32 border-r border-gray-200 dark:border-gray-700 p-3 cursor-pointer ${corFundo} ${
                  index === 0 ? 'border-l' : ''
                }`}
              >
                <div className="text-center mb-2">
                  <div className={`text-xs font-medium mb-1 ${
                    eHoje ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {diasSemanaNomes[index]}
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      eHoje
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {dia.getDate()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center items-center mt-2">
                  {sessoesDoDia.length > 0 && (
                    <>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sessoesDoDia[0]) onSessionClick(sessoesDoDia[0]);
                        }}
                        className="flex items-center justify-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                        title={sessoesDoDia.map(s => s.title).join(', ')}
                      >
                        <Dumbbell className="w-4 h-4 text-gray-700 dark:text-gray-200 flex-shrink-0" />
                        {sessoesDoDia.length > 1 && (
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">+{sessoesDoDia.length}</span>
                        )}
                      </div>
                      {!isFutureDayCell && (() => {
                        const dataStr = toLocalYYYYMMDD(dia);
                        const progresso = progressosDias[dataStr] || 0;
                        if (progresso > 0) {
                          return (
                            <div
                              key="progress"
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white"
                              title={`Progresso: ${progresso}%`}
                            >
                              {progresso}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                  {aplicacoesDoDia.length > 0 && (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        aplicacoesDoDia[0]?.status === 'tomada'
                          ? 'bg-green-500 text-white'
                          : aplicacoesDoDia[0]?.status === 'perdida'
                          ? 'bg-red-500 text-white'
                          : aplicacoesDoDia[0]?.status === 'hoje'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                      title={aplicacoesDoDia.map(a => `Aplicação: ${a.dose}mg - Semana ${a.semana}`).join(', ')}
                    >
                      💉
                    </div>
                  )}
                  {pagamentosDoDia.length > 0 && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-yellow-500 text-white"
                      title={pagamentosDoDia.map(p => `Pagamento ${p.tipo === 'nutri' ? 'Nutricionista' : 'Personal'}: R$ ${p.valor.toFixed(2)}${p.parcela ? ` - Parcela ${p.parcela}` : ''}`).join(', ')}
                    >
                      💰
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia — sempre visível (hoje por padrão) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Eventos em {effectiveDia.toLocaleDateString('pt-BR')}
            {!diaSelecionado && <span className="ml-1.5 text-sm font-normal text-gray-500">(hoje)</span>}
          </h3>
          {diaSelecionado && (
            <button
              onClick={() => setDiaSelecionado(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Voltar para hoje"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {getSessoesDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Treinos</h4>
              <div className="space-y-3">
                {getSessoesDoDia(effectiveDia).map((sessao) => {
                  const exs = sessao.id ? (exercisesPorSessao[sessao.id] ?? []) : [];
                  return (
                    <div
                      key={sessao.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      <div
                        onClick={() => onSessionClick(sessao)}
                        className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">{sessao.title}</span>
                            {isFutureDay && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                                Agendado
                              </span>
                            )}
                          </div>
                          {!isFutureDay && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {sessao.status === 'done'
                                ? 'Feito'
                                : sessao.status === 'skipped'
                                ? 'Pulou'
                                : 'Agendado'}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2">
                        {loadingExercisesDia && exs.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Carregando exercícios…</p>
                        ) : exs.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum exercício</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {exs.map((ex, i) => (
                              <li key={ex.exerciseId || i} className="flex items-center gap-2 text-sm">
                                {isFutureDay ? (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" aria-hidden />
                                ) : (
                                  <span
                                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                      ex.status === 'done'
                                        ? 'bg-green-500 text-white'
                                        : ex.status === 'skipped'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                    }`}
                                    title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                                  >
                                    {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                                  </span>
                                )}
                                <span className="text-gray-700 dark:text-gray-300 truncate">
                                  {translateExerciseName(ex.name)}
                                </span>
                                {ex.prescription && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                    {ex.prescription.sets}×{ex.prescription.reps}
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
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aplicações</h4>
              <div className="space-y-2">
                {getAplicacoesDoDia(effectiveDia).map((aplicacao, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      aplicacao.status === 'tomada'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : aplicacao.status === 'perdida'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : aplicacao.status === 'hoje'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      Semana {aplicacao.semana} — {aplicacao.dose} mg
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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

          {getPagamentosDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pagamentos</h4>
              <div className="space-y-2">
                {getPagamentosDoDia(effectiveDia).map((pagamento, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {pagamento.tipo === 'nutri' ? 'Nutricionista' : 'Personal Trainer'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
            getPagamentosDoDia(effectiveDia).length === 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum evento neste dia.</p>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => mudarMes('anterior')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold">
          {meses[mes]} {ano}
        </span>
        <button
          onClick={() => mudarMes('proximo')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
            >
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia, index) => {
            const eHoje =
              dia &&
              dia.getDate() === hoje.getDate() &&
              dia.getMonth() === hoje.getMonth() &&
              dia.getFullYear() === hoje.getFullYear();
            const sessoesDoDia = dia ? getSessoesDoDia(dia) : [];
            const aplicacoesDoDia = dia ? getAplicacoesDoDia(dia) : [];
            const pagamentosDoDia = dia ? getPagamentosDoDia(dia) : [];
            const dayStartCell = dia ? new Date(dia) : null;
            if (dayStartCell) dayStartCell.setHours(0, 0, 0, 0);
            const isFutureDayCell = dia && dayStartCell ? dayStartCell.getTime() > hoje.getTime() : false;

            // Determinar cor de fundo baseado nos eventos
            let corFundo = '';
            if (dia === null) {
              corFundo = 'bg-gray-50 dark:bg-gray-800';
            } else if (eHoje) {
              corFundo = 'bg-blue-50 dark:bg-blue-900/20';
            } else if (sessoesDoDia.length > 0 || aplicacoesDoDia.length > 0 || pagamentosDoDia.length > 0) {
              corFundo = 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30';
            } else {
              corFundo = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            }

            return (
              <div
                key={index}
                onClick={() => dia && setDiaSelecionado(dia)}
                className={`min-h-20 border border-gray-200 dark:border-gray-700 p-2 cursor-pointer ${corFundo}`}
              >
                {dia && (
                  <>
                    <div
                      className={`text-sm font-medium mb-1 ${
                        eHoje ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {dia.getDate()}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center items-center">
                      {sessoesDoDia.length > 0 && (
                        <>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (sessoesDoDia[0]) onSessionClick(sessoesDoDia[0]);
                            }}
                            className="flex items-center justify-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                            title={sessoesDoDia.map(s => s.title).join(', ')}
                          >
                            <Dumbbell className="w-4 h-4 text-gray-700 dark:text-gray-200 flex-shrink-0" />
                            {sessoesDoDia.length > 1 && (
                              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">+{sessoesDoDia.length}</span>
                            )}
                          </div>
                          {!isFutureDayCell && (() => {
                            const dataStr = toLocalYYYYMMDD(dia);
                            const progresso = progressosDias[dataStr] || 0;
                            if (progresso > 0) {
                              return (
                                <div
                                  key="progress"
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white"
                                  title={`Progresso: ${progresso}%`}
                                >
                                  {progresso}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                      {aplicacoesDoDia.length > 0 && (
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            aplicacoesDoDia[0]?.status === 'tomada'
                              ? 'bg-green-500 text-white'
                              : aplicacoesDoDia[0]?.status === 'perdida'
                              ? 'bg-red-500 text-white'
                              : aplicacoesDoDia[0]?.status === 'hoje'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-400 text-white'
                          }`}
                          title={aplicacoesDoDia.map(a => `Aplicação: ${a.dose}mg - Semana ${a.semana}`).join(', ')}
                        >
                          💉
                        </div>
                      )}
                      {pagamentosDoDia.length > 0 && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-yellow-500 text-white"
                          title={pagamentosDoDia.map(p => `Pagamento ${p.tipo === 'nutri' ? 'Nutricionista' : 'Personal'}: R$ ${p.valor.toFixed(2)}${p.parcela ? ` - Parcela ${p.parcela}` : ''}`).join(', ')}
                        >
                          💰
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia — abaixo do calendário, sem modal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Eventos em {effectiveDia.toLocaleDateString('pt-BR')}
            {!diaSelecionado && <span className="ml-1.5 text-sm font-normal text-gray-500">(hoje)</span>}
          </h3>
          {diaSelecionado && (
            <button
              onClick={() => setDiaSelecionado(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Voltar para hoje"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Treinos */}
        {getSessoesDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Treinos</h4>
              <div className="space-y-3">
                {getSessoesDoDia(effectiveDia).map((sessao) => {
                  const exs = sessao.id ? (exercisesPorSessao[sessao.id] ?? []) : [];
                  return (
                    <div
                      key={sessao.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      <div
                        onClick={() => onSessionClick(sessao)}
                        className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">{sessao.title}</span>
                            {isFutureDay && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                                Agendado
                              </span>
                            )}
                          </div>
                          {!isFutureDay && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {sessao.status === 'done'
                                ? 'Feito'
                                : sessao.status === 'skipped'
                                ? 'Pulou'
                                : 'Agendado'}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2">
                        {loadingExercisesDia && exs.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Carregando exercícios…</p>
                        ) : exs.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum exercício</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {exs.map((ex, i) => (
                              <li key={ex.exerciseId || i} className="flex items-center gap-2 text-sm">
                                {isFutureDay ? (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" aria-hidden />
                                ) : (
                                  <span
                                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                      ex.status === 'done'
                                        ? 'bg-green-500 text-white'
                                        : ex.status === 'skipped'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                    }`}
                                    title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                                  >
                                    {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                                  </span>
                                )}
                                <span className="text-gray-700 dark:text-gray-300 truncate">
                                  {translateExerciseName(ex.name)}
                                </span>
                                {ex.prescription && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                    {ex.prescription.sets}×{ex.prescription.reps}
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
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aplicações</h4>
              <div className="space-y-2">
                {getAplicacoesDoDia(effectiveDia).map((aplicacao, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      aplicacao.status === 'tomada'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : aplicacao.status === 'perdida'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : aplicacao.status === 'hoje'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      Semana {aplicacao.semana} — {aplicacao.dose} mg
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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

          {/* Pagamentos */}
          {getPagamentosDoDia(effectiveDia).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pagamentos</h4>
              <div className="space-y-2">
                {getPagamentosDoDia(effectiveDia).map((pagamento, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {pagamento.tipo === 'nutri' ? 'Nutricionista' : 'Personal Trainer'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
          getPagamentosDoDia(effectiveDia).length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum evento neste dia.</p>
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
