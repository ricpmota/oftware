'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Bell,
  Cake,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  FileText,
  MessageSquare,
  RefreshCw,
  Search,
  Syringe,
  Trash2,
  UtensilsCrossed,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import ModalNovoLembrete, {
  type ModalNovoLembreteInitialValues,
  type ModalNovoLembreteSavePayload,
} from '@/components/metaadmin/ModalNovoLembrete';
import EditarConsultaCalendarioModal from '@/components/profissional/EditarConsultaCalendarioModal';
import { useConfirmarApagarConsulta } from '@/components/profissional/ConfirmarApagarConsultaModal';
import ConfirmarObservacaoProntuarioModal from '@/components/profissional/ConfirmarObservacaoProntuarioModal';
import {
  PacienteCardMediaIcons,
  useFotosCompartilhadasMedico,
  usePacienteFotosCarouselModal,
} from '@/components/profissional/pacienteMediaQuickActions';
import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';
import { getValoresPacienteDeParcelas } from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import type { Lembrete, LembreteTag } from '@/types/lembrete';
import { isNutriConsultaAutoLembrete } from '@/types/nutriAgenda';
import { isPersonalConsultaAutoLembrete } from '@/types/personalAgenda';
import { getLembreteTagConfig } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import { semanaInicioCicloDoPlano, ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';
import {
  progressoAplicacoesDoProtocolo,
  protocoloDaSemanaGlobal,
  rotuloSemanaCalendario,
} from '@/utils/tirzepatidaProtocoloDisplay';
import { parseDataNascimentoDiaMesLocal } from '@/utils/dataNascimentoLocal';
import { listarAplicacoesPlanejadasNoPeriodo } from '@/utils/esquemaDosesSemana';
import { CheckInSemanalNutriEvolucao } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriEvolucao';
import { CheckInSemanalNutriView } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriView';
import { WeeklyNutritionCheckInOperationalCard } from '@/components/nutri/checkin-semanal/WeeklyNutritionCheckInOperationalCard';
import { WeeklyNutritionCheckInOperationalPanel } from '@/components/nutri/checkin-semanal/WeeklyNutritionCheckInOperationalPanel';
import {
  useWeeklyNutritionCheckInCalendar,
  type WeeklyNutritionCheckInCalendarItem,
} from '@/components/nutri/checkin-semanal/useWeeklyNutritionCheckInCalendar';
import { HydrationAdherenceCalendarSection } from '@/components/nutri/hidratacao/HydrationAdherenceCalendarSection';
import { getNutritionCheckInReferenceWeek, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { calcularSemanaAtualTratamento } from '@/utils/tratamentoUtils';
import { openNutriCheckInWhatsApp } from '@/lib/nutri/openNutriCheckInWhatsApp';
import { nutriCheckInEnvioKey } from '@/lib/nutri/checkInSemanalNutriWhatsApp';
import {
  WEEKLY_NUTRI_CHECKIN_POLL_MS,
  buildWeeklyNutritionCheckInOperationalSummary,
  filterWeeklyNutritionCheckInSlots,
  shouldRunWeeklyNutritionCheckInPoll,
  slotsInYmdRange,
  sortWeeklyNutritionCheckInOperationalSlots,
  type WeeklyNutritionCheckInFilterId,
  type WeeklyNutritionCheckInWhatsAppFilterId,
} from '@/lib/nutri/checkInSemanalNutriOperational';
import { auth } from '@/lib/firebase';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { buildPatientWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { createPortal } from 'react-dom';

export type ConsultaCalendarioItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  pacienteNome: string;
  pacienteId?: string;
  observacoes?: string;
  realizada?: boolean;
};

type Props = {
  pacientes: PacienteCompleto[];
  pagamentosPacientes: Record<string, PagamentoPaciente>;
  lembretes: Lembrete[];
  consultas?: ConsultaCalendarioItem[];
  tags: LembreteTag[];
  isMobile?: boolean;
  loading?: boolean;
  defaultTelefoneAviso?: string;
  defaultTelefoneAvisoDdi?: string;
  defaultTelefoneAvisoPais?: string;
  /**
   * Quem recebe o aviso via Canal Chat / de quem sai a notificação ao paciente.
   * Usado no modal de lembrete (textos e contexto nutri/personal).
   */
  avisoAudience?: 'nutricionista' | 'personal';
  onRefresh: () => void | Promise<void>;
  onOpenPaciente?: (paciente: PacienteCompleto) => void;
  /** Abre o prontuário do paciente da consulta (id no Firestore). */
  onOpenProntuario?: (pacienteId: string) => void | Promise<void>;
  /** Abre o modal completo do paciente (todas as pastas). */
  onOpenPacienteCompleto?: (pacienteId: string) => void | Promise<void>;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenPagamento?: (paciente: PacienteCompleto) => void;
  onSalvarLembrete: (dados: ModalNovoLembreteSavePayload) => Promise<void>;
  onAtualizarLembrete?: (id: string, dados: ModalNovoLembreteSavePayload) => Promise<void>;
  onDeletarLembrete: (id: string) => Promise<void>;
  onToggleLembrete: (id: string, concluido: boolean) => Promise<void>;
  onLembretesChanged?: () => void | Promise<void>;
  /** Permite editar data/horário/observações da consulta (metanutri). */
  onSaveConsulta?: (input: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    observacoes: string;
  }) => Promise<void>;
  /** Permite apagar uma consulta agendada (metanutri). */
  onDeleteConsulta?: (id: string) => Promise<void>;
  /** Marca a consulta como realizada no calendário. */
  onToggleConsultaRealizada?: (id: string, realizada: boolean) => Promise<void>;
  /** MetaNutri: cards virtuais de Check-in Semanal. MetaPersonal não passa. */
  enableWeeklyNutritionCheckIns?: boolean;
  weeklyCheckInNutritionistId?: string;
  weeklyCheckInAuthorName?: string;
  /** Alertas profissionais de hidratação (ETAPA 05). Personal não passa. */
  enableHydrationAdherenceAlerts?: boolean;
};

type AplicacaoCal = {
  data: Date;
  paciente: PacienteCompleto;
  semana: number;
  dose: number;
  localAplicacao: string;
};

type ItemPagamentoCal = {
  data: Date;
  paciente: PacienteCompleto;
  parcela: ParcelaPagamento;
  tipoEvento?: 'dataVenda' | 'vencimento';
};

const MESES = [
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
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function normTextoBuscaCal(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nomePaciente(p: PacienteCompleto | { nome?: string }): string {
  if ('dadosIdentificacao' in p && p.dadosIdentificacao?.nomeCompleto) {
    return p.dadosIdentificacao.nomeCompleto;
  }
  return (p as { nome?: string }).nome || 'Paciente';
}

function nomeExibicaoCardMobile(nome: string): string {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const partes = limpo.split(' ').filter(Boolean);
  if (partes.length <= 2 || limpo.length <= 18) return limpo;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function weeklySlotOnDay(scheduledDate: string, dia: Date) {
  const [y, m, d] = scheduledDate.split('-').map(Number);
  return y === dia.getFullYear() && m - 1 === dia.getMonth() && d === dia.getDate();
}

function isAdesaoPerdida(r: { adherence?: string; adesao?: string } | null) {
  return !!(r?.adherence === 'MISSED' || r?.adesao === 'esquecida');
}

function obterRegistroSeguimentoDaAplicacao(aplicacao: {
  data: Date;
  paciente: PacienteCompleto;
}) {
  const evolucao = aplicacao.paciente.evolucaoSeguimento || [];
  const dataPrevista = new Date(aplicacao.data);
  dataPrevista.setHours(0, 0, 0, 0);
  return (
    evolucao.find((e) => {
      if (!e.dataRegistro) return false;
      const dataReg = toDateSafe(e.dataRegistro);
      if (!dataReg || Number.isNaN(dataReg.getTime())) return false;
      dataReg.setHours(0, 0, 0, 0);
      const diffDias = Math.abs((dataReg.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 3;
    }) ?? null
  );
}

function aplicacaoFoiFeita(aplicacao: { data: Date; paciente: PacienteCompleto }) {
  const registro = obterRegistroSeguimentoDaAplicacao(aplicacao);
  if (isAdesaoPerdida(registro)) return false;
  return !!(registro?.doseAplicada?.quantidade && registro.doseAplicada.quantidade > 0);
}

function obterUltimaVariacaoPesoPaciente(paciente: PacienteCompleto): number | null {
  const evolucao = (paciente.evolucaoSeguimento || [])
    .slice()
    .sort(
      (a: { weekIndex?: number; numeroSemana?: number }, b: { weekIndex?: number; numeroSemana?: number }) =>
        (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0)
    );
  const comPeso = evolucao.filter(
    (r: { peso?: number }) => r.peso != null && typeof r.peso === 'number'
  );
  if (comPeso.length === 0) return null;
  const ultimo = comPeso[comPeso.length - 1] as { peso: number };
  const anterior =
    comPeso.length > 1
      ? (comPeso[comPeso.length - 2] as { peso?: number }).peso
      : paciente.dadosClinicos?.medidasIniciais?.peso;
  if (anterior == null || typeof anterior !== 'number') return null;
  return ultimo.peso - anterior;
}

function obterVariacaoPesoAplicacao(aplicacao: AplicacaoCal): number | null {
  const registro = obterRegistroSeguimentoDaAplicacao(aplicacao) as { peso?: number } | null;
  if (!registro?.peso) return null;
  const evolucao = (aplicacao.paciente.evolucaoSeguimento || [])
    .slice()
    .sort(
      (a: { weekIndex?: number; numeroSemana?: number }, b: { weekIndex?: number; numeroSemana?: number }) =>
        (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0)
    );
  const idx = evolucao.findIndex((e) => {
    if (!e.dataRegistro) return false;
    const dataReg = toDateSafe(e.dataRegistro);
    if (!dataReg) return false;
    const dataPrev = new Date(aplicacao.data);
    dataReg.setHours(0, 0, 0, 0);
    dataPrev.setHours(0, 0, 0, 0);
    return Math.abs(dataReg.getTime() - dataPrev.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  });
  const anterior = idx > 0 ? evolucao[idx - 1] : null;
  const pesoAnterior =
    (anterior as { peso?: number } | null)?.peso ??
    aplicacao.paciente.dadosClinicos?.medidasIniciais?.peso;
  if (pesoAnterior == null || typeof pesoAnterior !== 'number') return null;
  return registro.peso - pesoAnterior;
}

function obterUltimaVariacaoCompPaciente(paciente: PacienteCompleto): number | null {
  const evolucao = (paciente.evolucaoSeguimento || [])
    .slice()
    .sort(
      (a: { weekIndex?: number; numeroSemana?: number }, b: { weekIndex?: number; numeroSemana?: number }) =>
        (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0)
    );
  const comComp = evolucao.filter(
    (r: { circunferenciaAbdominal?: number }) =>
      r.circunferenciaAbdominal != null && typeof r.circunferenciaAbdominal === 'number'
  );
  if (comComp.length === 0) return null;
  const ultimo = comComp[comComp.length - 1] as { circunferenciaAbdominal: number };
  const anterior =
    comComp.length > 1
      ? (comComp[comComp.length - 2] as { circunferenciaAbdominal?: number }).circunferenciaAbdominal
      : paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;
  if (anterior == null || typeof anterior !== 'number') return null;
  return ultimo.circunferenciaAbdominal - anterior;
}

function obterVariacaoCompAplicacao(aplicacao: AplicacaoCal): number | null {
  const registro = obterRegistroSeguimentoDaAplicacao(aplicacao) as {
    circunferenciaAbdominal?: number;
  } | null;
  if (!registro?.circunferenciaAbdominal) return null;
  const evolucao = (aplicacao.paciente.evolucaoSeguimento || [])
    .slice()
    .sort(
      (a: { weekIndex?: number; numeroSemana?: number }, b: { weekIndex?: number; numeroSemana?: number }) =>
        (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0)
    );
  const idx = evolucao.findIndex((e) => {
    if (!e.dataRegistro) return false;
    const dataReg = toDateSafe(e.dataRegistro);
    if (!dataReg) return false;
    const dataPrev = new Date(aplicacao.data);
    dataReg.setHours(0, 0, 0, 0);
    dataPrev.setHours(0, 0, 0, 0);
    return Math.abs(dataReg.getTime() - dataPrev.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  });
  const anterior = idx > 0 ? evolucao[idx - 1] : null;
  const compAnterior =
    (anterior as { circunferenciaAbdominal?: number } | null)?.circunferenciaAbdominal ??
    aplicacao.paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;
  if (compAnterior == null || typeof compAnterior !== 'number') return null;
  return registro.circunferenciaAbdominal - compAnterior;
}

function progressoAplicacoesPaciente(paciente: PacienteCompleto, weekIndex?: number) {
  const proto =
    weekIndex != null
      ? protocoloDaSemanaGlobal(paciente, weekIndex)
      : protocoloDaSemanaGlobal(paciente, semanaInicioCicloDoPlano(paciente.planoTerapeutico));
  return progressoAplicacoesDoProtocolo(paciente, proto);
}

function fmtMoney(n: number) {
  return (
    'R$ ' +
    n.toLocaleString('pt-BR', {
      maximumFractionDigits: n >= 1000 ? 0 : 2,
      minimumFractionDigits: 0,
    })
  );
}

function PillMetricaCal({
  pct,
  icon,
  textoMeio,
  title: titlePill,
  tipoMetrica = 'aplicacao',
}: {
  pct: number | null;
  icon: ReactNode;
  textoMeio: string;
  title?: string;
  tipoMetrica?: 'aplicacao' | 'pagamento';
}) {
  const zerado = pct === null;
  const clsPendente = tipoMetrica === 'pagamento' ? 'bg-orange-500' : 'bg-red-600';
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full min-h-[13px] h-[13px] sm:min-h-[15px] sm:h-[15px] ${
        zerado ? 'ring-1 ring-black/10' : 'ring-1 ring-black/10'
      }`}
      title={titlePill}
    >
      <div className="absolute inset-0 flex overflow-hidden rounded-full">
        {zerado ? (
          <div className="h-full w-full bg-gray-200" />
        ) : (
          <>
            <div
              className="h-full shrink-0 bg-emerald-600 transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
            <div className={`h-full min-w-0 flex-1 ${clsPendente} transition-[width] duration-200`} />
          </>
        )}
      </div>
      <div
        className={`calendar-pill-${zerado ? 'neutral' : 'on-bar'} relative z-10 flex h-full min-h-[13px] sm:min-h-[15px] w-full items-center justify-center gap-0.5 px-0.5 text-[8px] sm:text-[10px] tabular-nums leading-tight`}
      >
        <span className="flex shrink-0 items-center [&_svg]:h-2.5 [&_svg]:w-2.5 [&_svg]:stroke-[2]">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-center whitespace-nowrap">{textoMeio}</span>
      </div>
    </div>
  );
}

export default function ProfissionalCalendarioSection({
  pacientes,
  pagamentosPacientes,
  lembretes,
  consultas = [],
  tags,
  isMobile,
  loading,
  defaultTelefoneAviso,
  defaultTelefoneAvisoDdi,
  defaultTelefoneAvisoPais,
  avisoAudience,
  onRefresh,
  onOpenPaciente,
  onOpenProntuario,
  onOpenPacienteCompleto,
  onOpenGrafico,
  onOpenPagamento,
  onSalvarLembrete,
  onAtualizarLembrete,
  onDeletarLembrete,
  onToggleLembrete,
  onLembretesChanged,
  onSaveConsulta,
  onDeleteConsulta,
  onToggleConsultaRealizada,
  enableWeeklyNutritionCheckIns = false,
  weeklyCheckInNutritionistId,
  weeklyCheckInAuthorName,
  enableHydrationAdherenceAlerts = false,
}: Props) {
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [weeklySlotAction, setWeeklySlotAction] = useState<{
    slot: WeeklyNutritionCheckInCalendarItem;
    intent: 'view' | 'create' | 'history';
  } | null>(null);
  const [weeklyWhatsAppKey, setWeeklyWhatsAppKey] = useState<string | null>(null);
  const [weeklyAutoEnabled, setWeeklyAutoEnabled] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<ConsultaCalendarioItem | null>(null);
  const [consultaProntuarioPendente, setConsultaProntuarioPendente] =
    useState<ConsultaCalendarioItem | null>(null);
  const { confirmarApagarConsulta, confirmarApagarConsultaModal } = useConfirmarApagarConsulta();
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaEditError, setConsultaEditError] = useState<string | null>(null);
  const [weeklyEnvios, setWeeklyEnvios] = useState<Record<string, 'pending' | 'sent' | 'failed' | 'skipped'>>({});
  const [weeklyStatusFilter, setWeeklyStatusFilter] = useState<WeeklyNutritionCheckInFilterId>('all');
  const [weeklyWhatsappFilter, setWeeklyWhatsappFilter] = useState<WeeklyNutritionCheckInWhatsAppFilterId>('all');
  const [mostrarDados, setMostrarDados] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscaDropdownAberto, setBuscaDropdownAberto] = useState(false);
  const buscaDeferida = useDeferredValue(busca);
  const [showModalNovoLembrete, setShowModalNovoLembrete] = useState(false);
  const [lembreteEditandoId, setLembreteEditandoId] = useState<string | null>(null);
  const [lembreteInitialValues, setLembreteInitialValues] = useState<
    ModalNovoLembreteInitialValues | undefined
  >();
  const [tipoGraficoDados, setTipoGraficoDados] = useState<'mg' | 'aplicacoes'>('mg');
  const [filtroAnoDados, setFiltroAnoDados] = useState<'todos' | number>('todos');
  const [filtroMesDados, setFiltroMesDados] = useState<'todos' | number>('todos');
  const [refreshing, setRefreshing] = useState(false);

  const pacienteIdsFotos = useMemo(() => pacientes.map((p) => p.id).filter(Boolean), [pacientes]);
  const { fotosPorPacienteId, marcarTemFoto } = useFotosCompartilhadasMedico(pacienteIdsFotos);
  const { abrirFotos, fotosModal } = usePacienteFotosCarouselModal(marcarTemFoto);

  const { slots: weeklyCheckInSlots, reload: reloadWeeklyCheckIns } = useWeeklyNutritionCheckInCalendar({
    enabled: Boolean(enableWeeklyNutritionCheckIns && weeklyCheckInNutritionistId),
    nutritionistId: weeklyCheckInNutritionistId,
    month: mesCalendario,
    patients: pacientes,
  });

  const weeklyTodayYmd = getBrasilDateTimeParts().dateKey;
  const currentNutritionWeek = getNutritionWeek(weeklyTodayYmd);

  const loadWeeklyEnvios = useCallback(async () => {
    if (!enableWeeklyNutritionCheckIns) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metanutri/automacoes/checkin-envios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        autoEnabled?: boolean;
        envios?: Record<string, 'pending' | 'sent' | 'failed' | 'skipped'>;
      } | null;
      if (!res.ok || !json?.ok) return;
      setWeeklyAutoEnabled(json.autoEnabled === true);
      setWeeklyEnvios(json.envios || {});
    } catch {
      setWeeklyAutoEnabled(false);
      setWeeklyEnvios({});
    }
  }, [enableWeeklyNutritionCheckIns]);

  const handleSaveConsulta = useCallback(
    async (input: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      observacoes: string;
    }) => {
      if (!onSaveConsulta) return;
      setSavingConsulta(true);
      setConsultaEditError(null);
      try {
        await onSaveConsulta(input);
        setEditingConsulta(null);
      } catch (error) {
        setConsultaEditError(error instanceof Error ? error.message : 'Falha ao salvar consulta.');
      } finally {
        setSavingConsulta(false);
      }
    },
    [onSaveConsulta]
  );

  const handleDeleteConsulta = useCallback(
    async (id: string) => {
      if (!onDeleteConsulta) return;
      setSavingConsulta(true);
      setConsultaEditError(null);
      try {
        await onDeleteConsulta(id);
        setEditingConsulta(null);
      } catch (error) {
        setConsultaEditError(error instanceof Error ? error.message : 'Falha ao apagar consulta.');
      } finally {
        setSavingConsulta(false);
      }
    },
    [onDeleteConsulta]
  );

  const pacienteDaConsulta = useCallback(
    (consulta: ConsultaCalendarioItem) => {
      const id = consulta.pacienteId?.trim();
      if (!id) return undefined;
      return pacientes.find(
        (p) => p.id === id || p.userId === id || (p as { pacienteId?: string }).pacienteId === id
      );
    },
    [pacientes]
  );

  const abrirProntuarioConsulta = useCallback(
    async (consulta: ConsultaCalendarioItem) => {
      const pacienteId = consulta.pacienteId?.trim();
      if (pacienteId && onOpenProntuario) {
        try {
          await onOpenProntuario(pacienteId);
        } catch (error) {
          setConsultaEditError(
            error instanceof Error ? error.message : 'Não foi possível abrir o prontuário.'
          );
        }
        return;
      }
      const paciente = pacienteDaConsulta(consulta);
      if (paciente && onOpenPaciente) {
        onOpenPaciente(paciente);
        return;
      }
      setConsultaEditError('Paciente da consulta não encontrado para abrir o prontuário.');
    },
    [onOpenPaciente, onOpenProntuario, pacienteDaConsulta]
  );

  const abrirPacienteCompletoConsulta = useCallback(
    async (consulta: ConsultaCalendarioItem) => {
      const pacienteId = consulta.pacienteId?.trim();
      if (pacienteId && onOpenPacienteCompleto) {
        try {
          await onOpenPacienteCompleto(pacienteId);
        } catch (error) {
          setConsultaEditError(
            error instanceof Error ? error.message : 'Não foi possível abrir o paciente.'
          );
        }
        return;
      }
      const paciente = pacienteDaConsulta(consulta);
      if (paciente && onOpenPaciente) {
        onOpenPaciente(paciente);
        return;
      }
      setConsultaEditError('Paciente da consulta não encontrado.');
    },
    [onOpenPaciente, onOpenPacienteCompleto, pacienteDaConsulta]
  );

  const handleToggleConsultaRealizada = useCallback(
    async (consulta: ConsultaCalendarioItem) => {
      if (!onToggleConsultaRealizada) return;
      const next = !consulta.realizada;
      setSavingConsulta(true);
      setConsultaEditError(null);
      try {
        await onToggleConsultaRealizada(consulta.id, next);
        if (next) setConsultaProntuarioPendente(consulta);
      } catch (error) {
        setConsultaEditError(
          error instanceof Error ? error.message : 'Falha ao atualizar a consulta.'
        );
      } finally {
        setSavingConsulta(false);
      }
    },
    [onToggleConsultaRealizada]
  );

  useEffect(() => {
    void loadWeeklyEnvios();
  }, [loadWeeklyEnvios, mesCalendario]);

  useEffect(() => {
    if (!enableWeeklyNutritionCheckIns) return;
    const tick = () => {
      if (
        !shouldRunWeeklyNutritionCheckInPoll({
          calendarVisible: !mostrarDados,
          documentVisible: typeof document !== 'undefined' && document.visibilityState === 'visible',
        })
      ) {
        return;
      }
      reloadWeeklyCheckIns({ silent: true });
      void loadWeeklyEnvios();
    };
    const id = window.setInterval(tick, WEEKLY_NUTRI_CHECKIN_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enableWeeklyNutritionCheckIns, loadWeeklyEnvios, mostrarDados, reloadWeeklyCheckIns]);

  const handleWeeklyCheckInWhatsApp = useCallback(async (slot: WeeklyNutritionCheckInCalendarItem) => {
    const key = `${slot.patientId}-${slot.weekKey}`;
    setWeeklyWhatsAppKey(key);
    try {
      const { href } = await openNutriCheckInWhatsApp({
        patientId: slot.patientId,
        weekKey: slot.weekKey,
        patientName: slot.patientName,
        phoneDigits: slot.phoneDigits,
        phoneFields: slot.phoneFields,
      });
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível abrir o WhatsApp.');
    } finally {
      setWeeklyWhatsAppKey(null);
    }
  }, []);

  const buscaQ = normTextoBuscaCal(buscaDeferida);

  const pacienteMatchBusca = (p: PacienteCompleto | { nome?: string }) => {
    if (!buscaQ) return true;
    return normTextoBuscaCal(nomePaciente(p)).includes(buscaQ);
  };

  const sugestoesLista = useMemo(() => {
    const q = normTextoBuscaCal(busca);
    const nomes = pacientes
      .map((p) => nomePaciente(p))
      .filter(Boolean)
      .filter((n, i, arr) => arr.indexOf(n) === i);
    if (!q) return nomes.slice(0, 8);
    return nomes
      .filter((n) => normTextoBuscaCal(n).includes(q))
      .sort((a, b) => {
        const na = normTextoBuscaCal(a);
        const nb = normTextoBuscaCal(b);
        const ia = na.indexOf(q);
        const ib = nb.indexOf(q);
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b, 'pt-BR');
      })
      .slice(0, 12);
  }, [pacientes, busca]);

  const calcularAplicacoesPaciente = (paciente: PacienteCompleto, mesInicio: Date, mesFim: Date) =>
    listarAplicacoesPlanejadasNoPeriodo(paciente, mesInicio, mesFim).map((a) => ({
      ...a,
      paciente,
      localAplicacao: a.localAplicacao as string,
    }));

  const obterAplicacoesMes = (): AplicacaoCal[] => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const mesInicio = new Date(ano, mes, 1);
    const mesFim = new Date(ano, mes + 1, 0);
    mesFim.setHours(23, 59, 59);
    const todas: AplicacaoCal[] = [];
    pacientes
      .filter((p) => p.statusTratamento === 'em_tratamento' || p.statusTratamento === 'concluido')
      .forEach((paciente) => {
        todas.push(...calcularAplicacoesPaciente(paciente, mesInicio, mesFim));
      });
    return todas;
  };

  const obterPagamentosMes = (): ItemPagamentoCal[] => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const mesInicio = new Date(ano, mes, 1);
    const mesFim = new Date(ano, mes + 1, 0);
    mesFim.setHours(23, 59, 59);
    const pagamentosDoMes: ItemPagamentoCal[] = [];
    const push = (
      data: Date,
      paciente: PacienteCompleto,
      parcela: ParcelaPagamento,
      tipoEvento?: 'dataVenda' | 'vencimento'
    ) => {
      if (data >= mesInicio && data <= mesFim) {
        pagamentosDoMes.push({ data, paciente, parcela, tipoEvento });
      }
    };

    Object.entries(pagamentosPacientes || {}).forEach(([pacienteId, pagamento]) => {
      const paciente = pacientes.find((p) => p.id === pacienteId);
      if (!paciente) return;
      if (pagamento.parcelas && pagamento.parcelas.length > 0) {
        let abertoSomado = 0;
        pagamento.parcelas.forEach((parcela) => {
          if (parcela.status !== 'paga') abertoSomado += parcela.valor ?? 0;
          if (parcela.status === 'paga') {
            const dataPagParcela = toDateSafe(parcela.dataPagamento);
            if (dataPagParcela) push(dataPagParcela, paciente, parcela);
          } else {
            const dataVencimento = toDateSafe(parcela.dataVencimento);
            if (dataVencimento) push(dataVencimento, paciente, parcela);
          }
        });
        const { valorPendente } = getValoresPacienteDeParcelas(pagamento);
        if (valorPendente > abertoSomado) {
          const diff = valorPendente - abertoSomado;
          const dataVen = toDateSafe(pagamento.dataVencimento);
          if (dataVen) {
            push(dataVen, paciente, {
              numero: 0,
              valor: diff,
              dataVencimento: dataVen,
              status: 'pendente',
            });
          }
        }
      } else {
        const dataPrevista = toDateSafe(pagamento.dataVencimento);
        const dataPagamentoUnico = toDateSafe(pagamento.dataPagamento);
        const { valorPendente, valorTotal } = getValoresPacienteDeParcelas(pagamento);
        if (dataPagamentoUnico && pagamento.statusPagamento === 'pago' && valorTotal > 0) {
          push(dataPagamentoUnico, paciente, {
            numero: 1,
            valor: valorTotal,
            dataVencimento: dataPagamentoUnico,
            status: 'paga',
          });
        }
        if (dataPrevista && (valorPendente > 0 || valorTotal > 0) && pagamento.statusPagamento !== 'pago') {
          push(dataPrevista, paciente, {
            numero: 1,
            valor: valorPendente || valorTotal,
            dataVencimento: dataPrevista,
            status: 'pendente',
          });
        }
      }
    });

    pagamentosDoMes.sort((a, b) => a.data.getTime() - b.data.getTime());
    return pagamentosDoMes;
  };

  const obterAniversariosMes = () => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const aniversarios: Array<{ data: Date; paciente: PacienteCompleto }> = [];
    pacientes.forEach((paciente) => {
      const dataNasc = parseDataNascimentoDiaMesLocal(paciente.dadosIdentificacao?.dataNascimento);
      if (!dataNasc) return;
      if (dataNasc.getMonth() !== mes) return;
      aniversarios.push({ data: new Date(ano, mes, dataNasc.getDate()), paciente });
    });
    aniversarios.sort((a, b) => a.data.getTime() - b.data.getTime());
    return aniversarios;
  };

  const obterLembretesMes = (): Lembrete[] => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    return lembretes.filter((l) => {
      if (isNutriConsultaAutoLembrete(l.origem) || isPersonalConsultaAutoLembrete(l.origem)) {
        return false;
      }
      const [y, m] = l.data.split('-').map(Number);
      return y === ano && m - 1 === mes;
    });
  };

  const obterDadosAplicacoes = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicioRange = new Date(hoje);
    inicioRange.setMonth(inicioRange.getMonth() - 12);
    inicioRange.setDate(1);
    const fimRange = new Date(hoje);
    fimRange.setMonth(fimRange.getMonth() + 12);

    const todas: AplicacaoCal[] = [];
    pacientes
      .filter((p) => p.statusTratamento === 'em_tratamento')
      .filter((p) => pacienteMatchBusca(p))
      .forEach((paciente) => {
        todas.push(...calcularAplicacoesPaciente(paciente, inicioRange, fimRange));
      });

    type PorMesItem = {
      nome: string;
      nomeAbrev: string;
      mes: number;
      ano: number;
      mg: number;
      totalAplicacoes: number;
      contagemPorDose: Record<number, number>;
    };
    const porMes: PorMesItem[] = [];
    const mesesUsados = new Set<string>();
    const todasDoses = new Set<number>();

    todas.forEach((a) => {
      todasDoses.add(a.dose);
      const dataAplic = new Date(a.data);
      dataAplic.setHours(0, 0, 0, 0);
      if (sameDay(dataAplic, hoje)) return;
      const chave = `${dataAplic.getFullYear()}-${dataAplic.getMonth()}`;
      if (!mesesUsados.has(chave)) {
        mesesUsados.add(chave);
        const ano2dig = String(dataAplic.getFullYear()).slice(-2);
        porMes.push({
          nome: MESES[dataAplic.getMonth()],
          nomeAbrev: `${MESES_ABREV[dataAplic.getMonth()]}/${ano2dig}`,
          mes: dataAplic.getMonth(),
          ano: dataAplic.getFullYear(),
          mg: 0,
          totalAplicacoes: 0,
          contagemPorDose: {},
        });
      }
      const item = porMes.find((p) => p.mes === dataAplic.getMonth() && p.ano === dataAplic.getFullYear());
      if (item) {
        item.mg += a.dose;
        item.totalAplicacoes += 1;
        item.contagemPorDose[a.dose] = (item.contagemPorDose[a.dose] || 0) + 1;
      }
    });

    porMes.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
    return { porMes, allDoses: Array.from(todasDoses).sort((a, b) => a - b) };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      reloadWeeklyCheckIns();
    } finally {
      setRefreshing(false);
    }
  };

  const abrirNovoLembrete = () => {
    setLembreteEditandoId(null);
    setLembreteInitialValues(undefined);
    setShowModalNovoLembrete(true);
  };

  const fecharModalLembrete = () => {
    setShowModalNovoLembrete(false);
    setLembreteEditandoId(null);
    setLembreteInitialValues(undefined);
  };

  const handleSalvarModalLembrete = async (dados: ModalNovoLembreteSavePayload) => {
    if (lembreteEditandoId && onAtualizarLembrete) {
      await onAtualizarLembrete(lembreteEditandoId, dados);
    } else if (!lembreteEditandoId) {
      await onSalvarLembrete(dados);
    }
    await onLembretesChanged?.();
    fecharModalLembrete();
  };

  const BarraBuscaCalendario = ({ className = '' }: { className?: string } = {}) => (
    <div className={`relative z-20 w-full min-w-0 ${className}`}>
      <div className="relative flex items-center rounded-lg bg-gray-100 ring-1 ring-gray-200">
        <Search className="pointer-events-none absolute left-2.5 w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        <input
          type="search"
          autoComplete="off"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setBuscaDropdownAberto(true);
          }}
          onFocus={() => setBuscaDropdownAberto(true)}
          onBlur={() => {
            window.setTimeout(() => setBuscaDropdownAberto(false), 200);
          }}
          placeholder="Buscar paciente no calendário..."
          aria-label="Buscar paciente no calendário"
          aria-expanded={buscaDropdownAberto && sugestoesLista.length > 0}
          aria-controls="profissional-calendario-busca-sugestoes"
          role="combobox"
          className="w-full min-w-0 rounded-lg border-0 bg-transparent py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 shadow-none focus:outline-none focus:ring-0"
        />
        {busca ? (
          <button
            type="button"
            onClick={() => {
              setBusca('');
              setBuscaDropdownAberto(false);
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      {buscaDropdownAberto && sugestoesLista.length > 0 ? (
        <ul
          id="profissional-calendario-busca-sugestoes"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm text-gray-900 shadow-lg"
        >
          {sugestoesLista.map((nome) => (
            <li key={nome} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left transition-colors hover:bg-gray-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setBusca(nome);
                  setBuscaDropdownAberto(false);
                }}
              >
                {nome}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {buscaQ ? (
        <p className="mt-1.5 text-xs text-gray-500">
          Só aparecem barras e dados nos dias com eventos do filtro; os demais ficam só com o número do dia.
        </p>
      ) : null}
    </div>
  );

  if (mostrarDados) {
    const { porMes, allDoses } = obterDadosAplicacoes();
    const hoje = new Date();
    const anosDisponiveis = [...new Set(porMes.map((p) => p.ano))].sort((a, b) => a - b);
    if (anosDisponiveis.length === 0) {
      const anoAtual = hoje.getFullYear();
      anosDisponiveis.push(anoAtual - 1, anoAtual, anoAtual + 1);
    }
    const porMesFiltrado = porMes.filter((p) => {
      const matchAno = filtroAnoDados === 'todos' || filtroAnoDados === p.ano;
      const matchMes = filtroMesDados === 'todos' || filtroMesDados === p.mes;
      return matchAno && matchMes;
    });
    const totalFiltradoMg = porMesFiltrado.reduce((s, p) => s + p.mg, 0);
    const totalFiltradoAplicacoes = porMesFiltrado.reduce((s, p) => s + p.totalAplicacoes, 0);
    const dadosGrafico = porMesFiltrado
      .filter((p) => (tipoGraficoDados === 'mg' ? p.mg > 0 : p.totalAplicacoes > 0))
      .map((p) => ({
        nome: p.nomeAbrev,
        valor: tipoGraficoDados === 'mg' ? p.mg : p.totalAplicacoes,
      }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dados das Aplicações</h2>
          <button
            type="button"
            onClick={() => setMostrarDados(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
        <BarraBuscaCalendario />
        <div className={`space-y-6 ${isMobile ? '' : 'bg-white rounded-lg shadow p-6'}`}>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Ano</span>
              <select
                value={filtroAnoDados}
                onChange={(e) =>
                  setFiltroAnoDados(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value, 10))
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="todos">Todos</option>
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Mês</span>
              <select
                value={filtroMesDados}
                onChange={(e) =>
                  setFiltroMesDados(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value, 10))
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="todos">Todos</option>
                {MESES.map((nome, idx) => (
                  <option key={idx} value={idx}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="ml-auto flex overflow-hidden rounded-lg border border-gray-300">
              <button
                type="button"
                onClick={() => setTipoGraficoDados('mg')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  tipoGraficoDados === 'mg'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Total (mg)
              </button>
              <button
                type="button"
                onClick={() => setTipoGraficoDados('aplicacoes')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  tipoGraficoDados === 'aplicacoes'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Total (aplicações)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full min-w-[280px] border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left font-semibold text-gray-900">
                    Mês
                  </th>
                  {allDoses.map((d) => (
                    <th
                      key={d}
                      className="border border-gray-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-gray-900"
                    >
                      {d === 2.5 ? '2,5' : d === 7.5 ? '7,5' : String(d)}mg
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 sm:px-3 py-2 text-center font-semibold text-green-700">
                    {tipoGraficoDados === 'mg' ? 'Total (mg)' : 'Total (aplic.)'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {porMesFiltrado
                  .filter((p) => p.totalAplicacoes > 0 || p.mg > 0)
                  .map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 sm:px-3 py-2 font-medium text-gray-900">
                        {p.nomeAbrev}
                      </td>
                      {allDoses.map((d) => (
                        <td
                          key={d}
                          className="border border-gray-300 px-1 sm:px-3 py-2 text-center text-gray-700"
                        >
                          {p.contagemPorDose[d] ?? 0}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-2 sm:px-3 py-2 text-center font-semibold text-green-600">
                        {tipoGraficoDados === 'mg' ? p.mg : p.totalAplicacoes}
                      </td>
                    </tr>
                  ))}
                <tr className="bg-gray-100 font-bold text-gray-900">
                  <td className="border border-gray-300 px-2 sm:px-3 py-2">Total</td>
                  {allDoses.map((d) => {
                    const somaDose = porMesFiltrado.reduce((s, p) => s + (p.contagemPorDose[d] || 0), 0);
                    return (
                      <td key={d} className="border border-gray-300 px-1 sm:px-3 py-2 text-center">
                        {somaDose}
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 px-2 sm:px-3 py-2 text-center text-green-600">
                    {tipoGraficoDados === 'mg' ? totalFiltradoMg : totalFiltradoAplicacoes}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {dadosGrafico.length > 0 && (
            <div className="mt-6 w-full">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Gráfico</h3>
              <div className="w-full min-h-[320px]" style={{ height: isMobile ? 420 : 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosGrafico}
                    margin={{ top: 20, right: 30, left: isMobile ? 0 : 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="nome"
                      tick={{ fill: '#4b5563', fontSize: isMobile ? 10 : 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: '#4b5563', fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip
                      formatter={(value: number) => [
                        tipoGraficoDados === 'mg' ? `${value}mg` : `${value} aplicação(ões)`,
                        tipoGraficoDados === 'mg' ? 'Total (mg)' : 'Total (aplicações)',
                      ]}
                    />
                    <Bar
                      dataKey="valor"
                      fill="#16a34a"
                      name={tipoGraficoDados === 'mg' ? 'mg' : 'Aplicações'}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {totalFiltradoMg === 0 && totalFiltradoAplicacoes === 0 && (
            <p className="py-8 text-center text-gray-500">
              Nenhuma aplicação encontrada para os filtros selecionados.
            </p>
          )}
        </div>
      </div>
    );
  }

  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  let aplicacoes = obterAplicacoesMes();
  let pagamentos = obterPagamentosMes();
  let aniversarios = obterAniversariosMes();
  let lembretesDoMes = obterLembretesMes();
  let weeklyCheckInsMes = weeklyCheckInSlots;
  if (buscaQ) {
    aplicacoes = aplicacoes.filter((a) => pacienteMatchBusca(a.paciente));
    pagamentos = pagamentos.filter((p) => pacienteMatchBusca(p.paciente));
    aniversarios = aniversarios.filter((a) => pacienteMatchBusca(a.paciente));
    lembretesDoMes = lembretesDoMes.filter((l) => pacienteMatchBusca({ nome: l.pacienteNome }));
    weeklyCheckInsMes = weeklyCheckInsMes.filter((s) =>
      normTextoBuscaCal(s.patientName).includes(buscaQ)
    );
  }
  const monthStartYmd = ymdLocal(new Date(ano, mes, 1));
  const monthEndYmd = ymdLocal(new Date(ano, mes + 1, 0));
  weeklyCheckInsMes = weeklyCheckInsMes.filter(
    (s) => s.scheduledDate >= monthStartYmd && s.scheduledDate <= monthEndYmd
  );
  const weeklyCheckInsWeek = slotsInYmdRange(
    buscaQ
      ? weeklyCheckInSlots.filter((s) => normTextoBuscaCal(s.patientName).includes(buscaQ))
      : weeklyCheckInSlots,
    currentNutritionWeek.weekStart,
    currentNutritionWeek.weekEnd
  );
  const weeklyWeekOperational = weeklyCheckInsWeek.map((s) => ({
    patientId: s.patientId,
    patientName: s.patientName,
    weekKey: s.weekKey,
    scheduledDate: s.scheduledDate,
    scheduledTime: s.scheduledTime,
    status: s.status,
    record: s.record ?? null,
    whatsapp: weeklyEnvios[nutriCheckInEnvioKey(s.patientId, s.weekKey)] ?? null,
  }));
  const weeklyWeekSummary = buildWeeklyNutritionCheckInOperationalSummary(weeklyWeekOperational, {
    todayYmd: weeklyTodayYmd,
  });

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diaSemanaPrimeiro = primeiroDia.getDay();
  const diasNoMes = ultimoDia.getDate();
  const dias: (Date | null)[] = [];
  for (let i = 0; i < diaSemanaPrimeiro; i++) dias.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) dias.push(new Date(ano, mes, dia));

  const mudarMes = (direcao: 'anterior' | 'proximo') => {
    const novoMes = new Date(mesCalendario);
    novoMes.setMonth(direcao === 'anterior' ? mes - 1 : mes + 1);
    setMesCalendario(novoMes);
    setDiaSelecionado(null);
  };

  const handleDiaClick = (data: Date | null) => {
    if (!data) return;
    setDiaSelecionado(data);
  };

  const aplicacoesDia = diaSelecionado
    ? aplicacoes.filter((a) => sameDay(a.data, diaSelecionado))
    : [];
  const pagamentosDia = diaSelecionado
    ? pagamentos.filter((p) => sameDay(p.data, diaSelecionado))
    : [];
  const aniversariantesDia = diaSelecionado
    ? aniversarios.filter((a) => sameDay(a.data, diaSelecionado)).map((a) => a.paciente)
    : [];
  const lembretesDia = diaSelecionado
    ? lembretesDoMes.filter((l) => {
        const [y, m, d] = l.data.split('-').map(Number);
        return (
          d === diaSelecionado.getDate() &&
          m - 1 === diaSelecionado.getMonth() &&
          y === diaSelecionado.getFullYear()
        );
      })
    : [];
  const consultasDia = diaSelecionado
    ? consultas.filter((c) => {
        const [y, m, d] = c.date.split('-').map(Number);
        return (
          d === diaSelecionado.getDate() &&
          m - 1 === diaSelecionado.getMonth() &&
          y === diaSelecionado.getFullYear()
        );
      })
    : [];
  const weeklyCheckInsDia = diaSelecionado
    ? weeklyCheckInsMes.filter((s) => weeklySlotOnDay(s.scheduledDate, diaSelecionado))
    : [];

  const toWeeklyOperational = (s: WeeklyNutritionCheckInCalendarItem) => ({
    patientId: s.patientId,
    patientName: s.patientName,
    weekKey: s.weekKey,
    scheduledDate: s.scheduledDate,
    scheduledTime: s.scheduledTime,
    status: s.status,
    record: s.record ?? null,
    whatsapp: weeklyEnvios[nutriCheckInEnvioKey(s.patientId, s.weekKey)] ?? null,
  });
  const applyWeeklyOperationalView = (slots: WeeklyNutritionCheckInCalendarItem[]) => {
    const operational = slots.map(toWeeklyOperational);
    const filtered = filterWeeklyNutritionCheckInSlots(operational, {
      todayYmd: weeklyTodayYmd,
      statusFilter: weeklyStatusFilter,
      whatsappFilter: weeklyWhatsappFilter,
    });
    const sorted = sortWeeklyNutritionCheckInOperationalSlots(filtered, { todayYmd: weeklyTodayYmd });
    const byKey = new Map(slots.map((s) => [`${s.patientId}::${s.weekKey}`, s] as const));
    return sorted
      .map((s) => byKey.get(`${s.patientId}::${s.weekKey}`))
      .filter((s): s is WeeklyNutritionCheckInCalendarItem => Boolean(s));
  };
  const weeklyCheckInsDiaView = applyWeeklyOperationalView(weeklyCheckInsDia);
  const weeklyCheckInsWeekView = applyWeeklyOperationalView(weeklyCheckInsWeek);
  const weeklyDaySummary = buildWeeklyNutritionCheckInOperationalSummary(
    weeklyCheckInsDia.map(toWeeklyOperational),
    { todayYmd: weeklyTodayYmd }
  );
  const pacientesById = new Map(pacientes.map((p) => [p.id, p]));

  const renderWeeklyCheckInCard = (slot: WeeklyNutritionCheckInCalendarItem) => {
    const key = `${slot.patientId}-${slot.weekKey}`;
    const paciente = pacientesById.get(slot.patientId);
    return (
      <WeeklyNutritionCheckInOperationalCard
        key={key}
        slot={slot}
        todayYmd={weeklyTodayYmd}
        isMobile={Boolean(isMobile)}
        envio={weeklyEnvios[nutriCheckInEnvioKey(slot.patientId, slot.weekKey)]}
        autoEnabled={weeklyAutoEnabled}
        whatsappBusy={weeklyWhatsAppKey === key}
        onOpenPatient={paciente && onOpenPaciente ? () => onOpenPaciente(paciente) : undefined}
        onFill={() => setWeeklySlotAction({ slot, intent: 'create' })}
        onView={() => setWeeklySlotAction({ slot, intent: 'view' })}
        onHistory={() => setWeeklySlotAction({ slot, intent: 'history' })}
        onWhatsApp={() => void handleWeeklyCheckInWhatsApp(slot)}
      />
    );
  };

  const renderNome = (paciente: PacienteCompleto, className: string) => {
    const nome = nomePaciente(paciente);
    const exibido = isMobile ? nomeExibicaoCardMobile(nome) : nome;
    if (onOpenPaciente) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPaciente(paciente);
          }}
          className={`${className} text-left hover:underline`}
          title={exibido === nome ? 'Abrir paciente' : nome}
        >
          {exibido}
        </button>
      );
    }
    return <span className={className} title={exibido === nome ? undefined : nome}>{exibido}</span>;
  };

  const isBusy = !!(loading || refreshing);

  return (
    <>
      <div className="space-y-6 lg:flex lg:min-h-[calc(100vh-8rem)] lg:flex-col">
        <div className="flex w-full flex-shrink-0 items-start gap-2 sm:gap-3">
          <BarraBuscaCalendario className="flex-1" />
          <div className="flex flex-shrink-0 items-center gap-2 pt-0.5 sm:gap-4">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isBusy}
              title="Atualizar dados do calendário"
              className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1.5 text-xs text-green-600 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 lg:gap-2 lg:rounded-lg lg:bg-green-600 lg:px-3 lg:py-1.5 lg:text-sm lg:text-white lg:hover:bg-green-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${isBusy ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              type="button"
              onClick={() => setMostrarDados(true)}
              className="whitespace-nowrap rounded-md bg-green-600 px-3 py-2 text-xs text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 sm:px-4 sm:text-sm"
            >
              Dados
            </button>
            <button
              type="button"
              onClick={abrirNovoLembrete}
              title="Novo Lembrete"
              className="flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1.5 text-xs text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-green-500 lg:gap-2 lg:rounded-lg lg:px-3 lg:py-1.5 lg:text-sm"
            >
              <Bell className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Lembrete</span>
            </button>
          </div>
        </div>

        {enableWeeklyNutritionCheckIns ? (
          <WeeklyNutritionCheckInOperationalPanel
            week={currentNutritionWeek}
            summary={weeklyWeekSummary}
            isMobile={Boolean(isMobile)}
            statusFilter={weeklyStatusFilter}
            whatsappFilter={weeklyWhatsappFilter}
            onStatusFilter={setWeeklyStatusFilter}
            onWhatsappFilter={setWeeklyWhatsappFilter}
          />
        ) : null}

        <div className="flex flex-col gap-6 space-y-6 lg:flex-1 lg:flex-row lg:items-start lg:space-y-0">
          <div className="w-full shrink-0 max-lg:flex max-lg:flex-col max-lg:items-center max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:w-1/2 lg:min-w-0 lg:rounded-lg lg:border lg:border-gray-100 lg:bg-white lg:p-4 lg:shadow">
            <div className="mb-3 flex w-full items-center gap-2 max-lg:justify-center lg:justify-between lg:px-0">
              <h3 className="hidden text-lg font-semibold text-gray-900 lg:block">Calendário</h3>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => mudarMes('anterior')}
                  className="rounded-md p-1.5 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="min-w-[9rem] text-center text-sm font-medium capitalize text-gray-800">
                  {MESES[mes]} {ano}
                </span>
                <button
                  type="button"
                  onClick={() => mudarMes('proximo')}
                  className="rounded-md p-1.5 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="w-full lg:max-w-none">
              <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-500 sm:text-xs">
                {DIAS_SEMANA.map((diaSem) => (
                  <div key={diaSem} className="py-1">
                    {diaSem}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 max-lg:gap-0.5">
                {dias.map((dia, index) => {
                  if (!dia) {
                    return (
                      <div key={index} className="min-h-[4.5rem] max-lg:min-h-[4rem] sm:min-h-[5.25rem]" />
                    );
                  }

                  const aplicacoesDoDia = aplicacoes.filter((a) => sameDay(a.data, dia));
                  const pagamentosDoDia = pagamentos.filter((p) => sameDay(p.data, dia));
                  const aniversariosDoDia = aniversarios.filter((a) => sameDay(a.data, dia));
                  const lembretesDoDia = lembretesDoMes.filter((l) => {
                    const [y, m, d] = l.data.split('-').map(Number);
                    return d === dia.getDate() && m - 1 === dia.getMonth() && y === dia.getFullYear();
                  });
                  const consultasDoDia = consultas.filter((c) => {
                    const [y, m, d] = c.date.split('-').map(Number);
                    return d === dia.getDate() && m - 1 === dia.getMonth() && y === dia.getFullYear();
                  });
                  const weeklyDoDia = weeklyCheckInsMes.filter((s) => weeklySlotOnDay(s.scheduledDate, dia));

                  const totalEvt =
                    aplicacoesDoDia.length +
                    pagamentosDoDia.length +
                    aniversariosDoDia.length +
                    lembretesDoDia.length +
                    consultasDoDia.length +
                    weeklyDoDia.length;
                  const ocultarMetricas = !!buscaQ && totalEvt === 0;

                  const hoje = new Date();
                  const eHoje = sameDay(dia, hoje);
                  const diaNorm = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
                  const hojeNorm = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                  const ehPassado = diaNorm.getTime() < hojeNorm.getTime();
                  const isSelected = !!diaSelecionado && sameDay(dia, diaSelecionado);

                  const nApp = aplicacoesDoDia.length;
                  const nAppFeitas = aplicacoesDoDia.filter((a) => aplicacaoFoiFeita(a)).length;
                  let valorPagPago = 0;
                  let valorPagAberto = 0;
                  pagamentosDoDia.forEach((p) => {
                    const v = p.parcela.valor ?? 0;
                    if (p.parcela.status === 'paga') valorPagPago += v;
                    else valorPagAberto += v;
                  });
                  const valorPagTotal = valorPagPago + valorPagAberto;
                  const nPagEvt = pagamentosDoDia.length;
                  const nPagPagoEvt = pagamentosDoDia.filter((p) => p.parcela.status === 'paga').length;
                  const fmtPagBarra = (n: number) => String(Math.round(Number(n) || 0));
                  const textoPag =
                    valorPagTotal > 0
                      ? `${fmtPagBarra(valorPagPago)}/${fmtPagBarra(valorPagTotal)}`
                      : nPagEvt > 0
                        ? `${nPagPagoEvt}/${nPagEvt}`
                        : '0/0';
                  const pctApp = nApp > 0 ? (nAppFeitas / nApp) * 100 : null;
                  const pctPag =
                    valorPagTotal > 0
                      ? (valorPagPago / valorPagTotal) * 100
                      : nPagEvt > 0
                        ? (nPagPagoEvt / nPagEvt) * 100
                        : null;

                  const diaTemEventosNaBusca = !!buscaQ && totalEvt > 0;
                  const destaqueBusca =
                    diaTemEventosNaBusca && !isSelected
                      ? ' shadow-[inset_0_0_0_2px_rgba(34,197,94,0.9)]'
                      : '';

                  const cellBase = `rounded-lg border text-left flex flex-col transition-colors w-full min-h-[4.5rem] sm:min-h-[5.25rem] max-lg:min-h-[4rem] p-1 sm:p-1.5 max-lg:p-0.5${destaqueBusca}`;
                  const cellEstado = isSelected
                    ? 'border-green-600 bg-green-50 ring-1 ring-green-500'
                    : eHoje
                      ? 'border-blue-200 bg-blue-50/80'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 max-lg:border-gray-200/60 max-lg:bg-transparent';
                  const diaNumClass = eHoje ? 'text-blue-600' : 'text-gray-900';

                  if (ocultarMetricas) {
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDiaClick(dia)}
                        className={`${cellBase} min-h-[2.75rem] max-lg:min-h-[2.5rem] sm:min-h-[2.75rem] ${cellEstado}`}
                      >
                        <span className={`text-xs font-semibold sm:text-sm ${diaNumClass}`}>
                          {dia.getDate()}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDiaClick(dia)}
                      className={`${cellBase} ${cellEstado}`}
                    >
                      <span className={`mb-0.5 text-xs font-semibold sm:text-sm ${diaNumClass}`}>
                        {dia.getDate()}
                      </span>
                      <div className="mt-auto flex w-full min-w-0 flex-col items-stretch gap-0.5">
                        <PillMetricaCal
                          pct={pctApp}
                          icon={<Syringe strokeWidth={2} aria-hidden />}
                          textoMeio={`${nAppFeitas}/${nApp}`}
                          title={`Aplicações: ${nAppFeitas} de ${nApp} registradas`}
                        />
                        <PillMetricaCal
                          tipoMetrica="pagamento"
                          pct={pctPag}
                          icon={<DollarSign strokeWidth={2} aria-hidden />}
                          textoMeio={textoPag}
                          title={
                            valorPagTotal > 0
                              ? `Pagamentos: ${fmtMoney(valorPagPago)} de ${fmtMoney(valorPagTotal)} neste dia`
                              : nPagEvt > 0
                                ? `Pagamentos: ${nPagPagoEvt} de ${nPagEvt} quitados neste dia`
                                : 'Pagamentos: sem eventos neste dia'
                          }
                        />
                        {aniversariosDoDia.length > 0 &&
                          (() => {
                            const ordenados = [...aniversariosDoDia].sort((a, b) =>
                              nomePaciente(a.paciente).localeCompare(nomePaciente(b.paciente), 'pt-BR')
                            );
                            const primeiro = nomePaciente(ordenados[0].paciente).trim() || 'Aniversariante';
                            const extras = aniversariosDoDia.length - 1;
                            return (
                              <div
                                className={`calendar-aniversario-badge inline-flex min-h-[14px] w-full max-w-full items-center justify-center gap-0.5 rounded-full px-1 py-px text-[8px] font-semibold leading-tight sm:text-[9px] ${
                                  eHoje
                                    ? 'bg-amber-400/90'
                                    : !ehPassado
                                      ? 'bg-gray-500/85'
                                      : 'bg-gray-400/85'
                                }`}
                                title={
                                  ordenados.map((x) => nomePaciente(x.paciente)).filter(Boolean).join(', ') ||
                                  'Aniversariantes'
                                }
                              >
                                <Cake className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                <span className="min-w-0 truncate text-center">
                                  {primeiro}
                                  {extras > 0 && (
                                    <span className="whitespace-nowrap font-bold">{` +${extras}`}</span>
                                  )}
                                </span>
                              </div>
                            );
                          })()}
                        {lembretesDoDia.length > 0 && (
                          <div
                            className="calendar-lembrete-badge inline-flex min-h-[14px] w-full max-w-full items-center justify-center gap-0.5 rounded-full bg-orange-400/90 px-1 py-px text-[8px] font-semibold leading-tight text-white sm:text-[9px]"
                            title={lembretesDoDia.map((l) => `${l.tag}: ${l.pacienteNome}`).join(', ')}
                          >
                            <Bell className="h-2.5 w-2.5 shrink-0" aria-hidden />
                            <span className="min-w-0 truncate text-center">{lembretesDoDia.length}</span>
                          </div>
                        )}
                        {consultasDoDia.length > 0 && (
                          <div
                            className="inline-flex min-h-[14px] w-full max-w-full items-center justify-center gap-0.5 rounded-full bg-cyan-500/90 px-1 py-px text-[8px] font-semibold leading-tight text-white sm:text-[9px]"
                            title={consultasDoDia.map((c) => `${c.startTime} ${c.pacienteNome}`).join(', ')}
                          >
                            <Video className="h-2.5 w-2.5 shrink-0" aria-hidden />
                            <span className="min-w-0 truncate text-center">{consultasDoDia.length}</span>
                          </div>
                        )}
                        {weeklyDoDia.length > 0 && (
                          <PillMetricaCal
                            pct={
                              (weeklyDoDia.filter((s) => s.status === 'completed').length / weeklyDoDia.length) * 100
                            }
                            icon={<UtensilsCrossed strokeWidth={2} aria-hidden />}
                            textoMeio={`${weeklyDoDia.filter((s) => s.status === 'completed').length}/${weeklyDoDia.length}`}
                            title={`Check-ins semanais: ${weeklyDoDia.filter((s) => s.status === 'completed').length} de ${weeklyDoDia.length} respondidos`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className={`flex min-h-[280px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-b from-gray-50/90 to-white p-0 shadow-sm sm:p-0 lg:w-1/2 lg:max-h-[calc(100vh-10rem)] lg:flex-1 lg:overflow-y-auto ${
              !diaSelecionado ? 'lg:flex' : ''
            }`}
          >
            {diaSelecionado ? (
              <div className="flex flex-1 flex-col overflow-auto p-4 sm:p-5">
                <div className="mb-5 flex flex-row items-start justify-between gap-2 border-b border-gray-200 pb-4 sm:gap-3">
                  <h3 className="min-w-0 flex-1 pr-2 text-base font-bold capitalize leading-snug text-gray-900 sm:text-lg md:text-xl">
                    {diaSelecionado.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDiaSelecionado(null)}
                    className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    title="Fechar"
                  >
                    <X size={20} className="sm:h-5 sm:w-5" />
                  </button>
                </div>

                {(() => {
                  const nAppD = aplicacoesDia.length;
                  const nAppFeitasD = aplicacoesDia.filter((a) => aplicacaoFoiFeita(a)).length;
                  const pctAppD = nAppD > 0 ? (nAppFeitasD / nAppD) * 100 : null;
                  let valorPagPagoD = 0;
                  let valorPagAbertoD = 0;
                  pagamentosDia.forEach((p) => {
                    const v = p.parcela.valor ?? 0;
                    if (p.parcela.status === 'paga') valorPagPagoD += v;
                    else valorPagAbertoD += v;
                  });
                  const valorPagTotalD = valorPagPagoD + valorPagAbertoD;
                  const nPagEvtD = pagamentosDia.length;
                  const nPagPagoEvtD = pagamentosDia.filter((p) => p.parcela.status === 'paga').length;
                  const pctPagD =
                    valorPagTotalD > 0
                      ? (valorPagPagoD / valorPagTotalD) * 100
                      : nPagEvtD > 0
                        ? (nPagPagoEvtD / nPagEvtD) * 100
                        : null;
                  const fmtPagBarraD = (n: number) => String(Math.round(Number(n) || 0));
                  const textoPagD =
                    valorPagTotalD > 0
                      ? `${fmtPagBarraD(valorPagPagoD)}/${fmtPagBarraD(valorPagTotalD)}`
                      : nPagEvtD > 0
                        ? `${nPagPagoEvtD}/${nPagEvtD}`
                        : '0/0';
                  return (
                    <div className="mb-5 grid w-full min-w-0 grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="min-w-0">
                        <PillMetricaCal
                          pct={pctAppD}
                          icon={<Syringe strokeWidth={2} aria-hidden />}
                          textoMeio={`${nAppFeitasD}/${nAppD}`}
                          title={`Aplicações: ${nAppFeitasD} de ${nAppD} registradas`}
                        />
                      </div>
                      <div className="min-w-0">
                        <PillMetricaCal
                          tipoMetrica="pagamento"
                          pct={pctPagD}
                          icon={<DollarSign strokeWidth={2} aria-hidden />}
                          textoMeio={textoPagD}
                          title={
                            valorPagTotalD > 0
                              ? `Pagamentos: ${fmtMoney(valorPagPagoD)} de ${fmtMoney(valorPagTotalD)} neste dia`
                              : nPagEvtD > 0
                                ? `Pagamentos: ${nPagPagoEvtD} de ${nPagEvtD} quitados neste dia`
                                : 'Pagamentos: sem eventos neste dia'
                          }
                        />
                      </div>
                    </div>
                  );
                })()}

                {aplicacoesDia.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      {!isMobile && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-600">
                          <Syringe className="h-4 w-4" />
                        </span>
                      )}
                      {isMobile && <Syringe className="h-4 w-4 text-green-600" />}
                      Aplicações ({aplicacoesDia.length})
                    </h4>
                    {(() => {
                      const contagemPorDose: Record<number, number> = {};
                      aplicacoesDia.forEach((a) => {
                        contagemPorDose[a.dose] = (contagemPorDose[a.dose] || 0) + 1;
                      });
                      const dosesOrdenadas = Object.keys(contagemPorDose)
                        .map(Number)
                        .sort((a, b) => a - b);
                      const fmtDose = (d: number) => (d === 2.5 ? '2,5' : d === 7.5 ? '7,5' : String(d));
                      return (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            {dosesOrdenadas.map((d) => (
                              <span key={d} className="text-gray-700">
                                <span className="font-semibold">{fmtDose(d)}mg</span>
                                <span className="text-gray-500">: </span>
                                <span className="font-medium">{contagemPorDose[d]}</span>
                              </span>
                            ))}
                            <span className="font-semibold text-gray-800">
                              Total: {aplicacoesDia.length} aplicação
                              {aplicacoesDia.length !== 1 ? 'ões' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="space-y-3">
                      {aplicacoesDia.map((aplicacao, idx) => {
                        const foiAplicada = aplicacaoFoiFeita(aplicacao);
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        const dataAplicacao = new Date(aplicacao.data);
                        dataAplicacao.setHours(0, 0, 0, 0);
                        const dataFutura = dataAplicacao.getTime() > hoje.getTime();
                        const cardAplicada = foiAplicada;
                        const cardPendenteFuturo = !foiAplicada && dataFutura;
                        const registro = foiAplicada
                          ? obterRegistroSeguimentoDaAplicacao(aplicacao)
                          : null;
                        const dataExibicao = registro?.dataRegistro
                          ? toDateSafe(registro.dataRegistro)
                          : registro?.doseAplicada?.data
                            ? toDateSafe(registro.doseAplicada.data)
                            : dataAplicacao;
                        const dataExibicaoStr = dataExibicao
                          ? dataExibicao.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '';
                        const variacaoPeso = foiAplicada
                          ? obterVariacaoPesoAplicacao(aplicacao)
                          : obterUltimaVariacaoPesoPaciente(aplicacao.paciente);
                        const variacaoComp = foiAplicada
                          ? obterVariacaoCompAplicacao(aplicacao)
                          : obterUltimaVariacaoCompPaciente(aplicacao.paciente);
                        const protoCard = protocoloDaSemanaGlobal(aplicacao.paciente, aplicacao.semana);
                        const semanaCal = rotuloSemanaCalendario(aplicacao.semana, protoCard);
                        const progresso = progressoAplicacoesPaciente(aplicacao.paciente, aplicacao.semana);
                        const cardStyle = cardAplicada
                          ? {
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
                              border: '1px solid #86efac',
                              borderLeft: `${isMobile ? 3 : 4}px solid #16a34a`,
                            }
                          : cardPendenteFuturo
                            ? {
                                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)',
                                border: '1px solid #fdba74',
                                borderLeft: `${isMobile ? 3 : 4}px solid #ea580c`,
                              }
                            : {
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
                                border: '1px solid #fca5a5',
                                borderLeft: `${isMobile ? 3 : 4}px solid #dc2626`,
                              };
                        const calendarioIconSize = isMobile ? 28 : 32;
                        const abrirPacienteDoCard =
                          isMobile && onOpenPaciente
                            ? () => onOpenPaciente(aplicacao.paciente)
                            : undefined;
                        return (
                          <div
                            key={idx}
                            onClick={abrirPacienteDoCard}
                            className={
                              isMobile
                                ? `relative rounded-lg p-2.5 shadow-sm${abrirPacienteDoCard ? ' cursor-pointer' : ''}`
                                : 'relative rounded-xl p-3 transition-all hover:shadow-md'
                            }
                            style={cardStyle}
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span
                                  className="flex shrink-0 items-center justify-center"
                                  title={
                                    foiAplicada
                                      ? 'Aplicação registrada'
                                      : dataFutura
                                        ? 'Pendente'
                                        : 'Não preencheu'
                                  }
                                >
                                  {foiAplicada ? (
                                    <CheckCircle
                                      className="text-green-600"
                                      size={isMobile ? 16 : 18}
                                    />
                                  ) : dataFutura ? (
                                    <AlertCircle
                                      className="text-orange-500"
                                      size={isMobile ? 16 : 18}
                                    />
                                  ) : (
                                    <XCircle className="text-red-600" size={isMobile ? 16 : 18} />
                                  )}
                                </span>
                                {renderNome(
                                  aplicacao.paciente,
                                  'min-w-0 flex-1 truncate text-sm font-semibold text-gray-900'
                                )}
                              </div>
                              <div
                                className={`flex items-center shrink-0 ${isMobile ? 'gap-1.5' : 'gap-2'}`}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <PacienteCardMediaIcons
                                  paciente={aplicacao.paciente}
                                  temFoto={!!fotosPorPacienteId[aplicacao.paciente.id]}
                                  size={calendarioIconSize}
                                  officialIcons
                                  className={isMobile ? 'gap-1.5' : 'gap-2'}
                                  showDepoimento={false}
                                  onOpenGrafico={() =>
                                    (onOpenGrafico || onOpenPaciente)?.(aplicacao.paciente)
                                  }
                                  onOpenFotos={() => abrirFotos(aplicacao.paciente)}
                                />
                                {dataFutura ? (
                                  <span
                                    className="inline-flex shrink-0 cursor-default"
                                    title="Não é possível registrar aplicação em data futura"
                                  >
                                    <MetodoEmagrecerIcon icon="aplicacao" variant="inactive" size={calendarioIconSize} />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPaciente?.(aplicacao.paciente)}
                                    className="inline-flex shrink-0 items-center justify-center transition-transform hover:scale-[1.04]"
                                    title={
                                      foiAplicada ? 'Ver paciente / aplicações' : 'Abrir paciente'
                                    }
                                    aria-label={
                                      foiAplicada ? 'Ver paciente / aplicações' : 'Abrir paciente'
                                    }
                                  >
                                    <MetodoEmagrecerIcon icon="aplicacao" size={calendarioIconSize} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                              <span>
                                <span className="font-medium text-gray-500">Dose</span>{' '}
                                <span className="font-semibold text-gray-800">
                                  {aplicacao.dose} mg
                                </span>
                              </span>
                              <span className="text-gray-300">·</span>
                              <span>
                                <span className="font-medium text-gray-500">Sem.</span>{' '}
                                <span className="font-medium text-gray-800">{semanaCal.texto}</span>
                              </span>
                              {variacaoPeso != null && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span>
                                    <span className="font-medium text-gray-500">Δ peso</span>{' '}
                                    <span
                                      className={`font-medium ${
                                        variacaoPeso <= -1 ? 'text-green-600' : 'text-red-600'
                                      }`}
                                    >
                                      {variacaoPeso > 0 ? '+' : ''}
                                      {variacaoPeso.toFixed(1)} kg
                                    </span>
                                  </span>
                                </>
                              )}
                              {variacaoComp != null && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span>
                                    <span className="font-medium text-gray-500">Δ comp</span>{' '}
                                    <span
                                      className={`font-medium ${
                                        variacaoComp <= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}
                                    >
                                      {variacaoComp > 0 ? '+' : ''}
                                      {variacaoComp.toFixed(1)} cm
                                    </span>
                                  </span>
                                </>
                              )}
                              {dataExibicaoStr && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span>
                                    <span className="font-medium text-gray-500">Data</span>{' '}
                                    <span className="font-medium text-gray-800">{dataExibicaoStr}</span>
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                                <span>
                                  Total:{' '}
                                  <span className="font-semibold text-gray-800">
                                    {progresso.total}
                                  </span>
                                </span>
                                <span className="text-gray-300">·</span>
                                <span>
                                  Aplicadas:{' '}
                                  <span className="font-semibold text-gray-800">
                                    {progresso.posicao}
                                  </span>
                                </span>
                                <span className="text-gray-300">·</span>
                                <span>
                                  Pendentes:{' '}
                                  <span className="font-semibold text-gray-800">
                                    {progresso.pendentesAFrente}
                                  </span>
                                </span>
                              </div>
                              <BarraFaixaAplicacoes
                                segmentos={progresso.segmentos}
                                className="h-1.5"
                                trackClassName="bg-gray-200"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pagamentosDia.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      {!isMobile && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <DollarSign className="h-4 w-4" />
                        </span>
                      )}
                      {isMobile && <DollarSign className="h-4 w-4 text-blue-600" />}
                      Pagamentos ({pagamentosDia.length})
                    </h4>
                    {(() => {
                      let totalPago = 0;
                      let totalAberto = 0;
                      pagamentosDia.forEach((p) => {
                        const v = p.parcela.valor ?? 0;
                        if (p.parcela.status === 'paga') totalPago += v;
                        else totalAberto += v;
                      });
                      const totalVendido = totalPago + totalAberto;
                      const percPago = totalVendido > 0 ? Math.min(100, (totalPago / totalVendido) * 100) : 0;
                      const percAberto = Math.max(0, 100 - percPago);
                      return (
                        <>
                          {!isMobile && (
                            <div className="mb-4 space-y-2.5">
                              <div className="flex flex-wrap gap-2.5">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700">
                                  Vendido: {fmtMoney(totalVendido)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700">
                                  Pago: {fmtMoney(totalPago)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700">
                                  Em aberto: {fmtMoney(totalAberto)}
                                </span>
                              </div>
                              <div
                                className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
                                title={`Pago ${percPago.toFixed(0)}% • Em aberto ${percAberto.toFixed(0)}%`}
                              >
                                <div className="flex h-full">
                                  <div className="bg-green-500" style={{ width: `${percPago}%` }} />
                                  <div className="bg-amber-500" style={{ width: `${percAberto}%` }} />
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="space-y-3">
                            {pagamentosDia.map((pagamento, idx) => {
                              const isPago = pagamento.parcela.status === 'paga';
                              const isAtrasada = pagamento.parcela.status === 'atrasada';
                              const cardStyle = isPago
                                ? {
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
                                    border: '1px solid #86efac',
                                    borderLeft: `${isMobile ? 3 : 4}px solid #16a34a`,
                                  }
                                : isAtrasada
                                  ? {
                                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
                                      border: '1px solid #fca5a5',
                                      borderLeft: `${isMobile ? 3 : 4}px solid #dc2626`,
                                    }
                                  : {
                                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)',
                                      border: '1px solid #fdba74',
                                      borderLeft: `${isMobile ? 3 : 4}px solid #ea580c`,
                                    };
                              const pagFull = pagamentosPacientes?.[pagamento.paciente.id];
                              const valores = pagFull
                                ? getValoresPacienteDeParcelas(pagFull)
                                : {
                                    valorTotal: pagamento.parcela.valor ?? 0,
                                    valorPago: isPago ? pagamento.parcela.valor ?? 0 : 0,
                                    valorPendente: isPago ? 0 : pagamento.parcela.valor ?? 0,
                                  };
                              const percPagoCard =
                                valores.valorTotal > 0
                                  ? Math.min(100, (valores.valorPago / valores.valorTotal) * 100)
                                  : 0;
                              const percAbertoCard = Math.max(0, 100 - percPagoCard);
                              return (
                                <div
                                  key={idx}
                                  className={
                                    isMobile
                                      ? 'rounded-lg p-3 shadow-sm'
                                      : 'rounded-xl p-3 transition-all hover:shadow-md'
                                  }
                                  style={cardStyle}
                                >
                                  <div className={`flex items-start justify-between gap-2 ${isMobile ? 'mb-3' : 'mb-4 gap-3'}`}>
                                    {renderNome(
                                      pagamento.paciente,
                                      'min-w-0 flex-1 truncate pr-2 text-sm font-semibold text-gray-900'
                                    )}
                                    <div className={`-mt-0.5 flex shrink-0 items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                                      {onOpenPagamento && (
                                        <button
                                          type="button"
                                          onClick={() => onOpenPagamento(pagamento.paciente)}
                                          className={
                                            isMobile
                                              ? 'rounded-md p-1.5 text-blue-600 hover:bg-blue-50'
                                              : 'rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-100'
                                          }
                                          title="Editar pagamento / Dar baixa"
                                          aria-label="Editar pagamento"
                                        >
                                          <DollarSign size={isMobile ? 16 : 18} />
                                        </button>
                                      )}
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                          isPago
                                            ? 'bg-green-500/25 text-green-800'
                                            : isAtrasada
                                              ? 'bg-red-500/25 text-red-800'
                                              : 'bg-orange-500/25 text-orange-800'
                                        }`}
                                      >
                                        {isPago ? '✓ Pago' : isAtrasada ? 'Atrasada' : 'Pendente'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                                    <span>
                                      <span className="font-medium text-gray-500">Valor</span>{' '}
                                      <span className="font-semibold text-gray-800">
                                        {fmtMoney(pagamento.parcela.valor ?? 0)}
                                      </span>
                                    </span>
                                    <span className="text-gray-300">·</span>
                                    <span className="font-medium text-gray-800">
                                      {pagamento.tipoEvento === 'dataVenda'
                                        ? 'Data de venda'
                                        : pagamento.tipoEvento === 'vencimento'
                                          ? 'Data para pagamento'
                                          : `Parcela ${pagamento.parcela.numero}`}
                                    </span>
                                  </div>
                                  <div className="mt-2.5 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                                      <span>
                                        {isMobile ? 'Venda' : 'Vendido'}:{' '}
                                        <span className="font-semibold text-gray-800">
                                          {fmtMoney(valores.valorTotal)}
                                        </span>
                                      </span>
                                      <span className="text-gray-300">·</span>
                                      <span>
                                        Pago:{' '}
                                        <span className="font-semibold text-gray-800">
                                          {fmtMoney(valores.valorPago)}
                                        </span>
                                      </span>
                                      <span className="text-gray-300">·</span>
                                      <span>
                                        {isMobile ? 'Aberto' : 'Em aberto'}:{' '}
                                        <span className="font-semibold text-gray-800">
                                          {fmtMoney(valores.valorPendente)}
                                        </span>
                                      </span>
                                    </div>
                                    <div
                                      className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                                      title={`Pago ${percPagoCard.toFixed(0)}% • Em aberto ${percAbertoCard.toFixed(0)}%`}
                                    >
                                      <div className="flex h-full">
                                        <div className="bg-green-500" style={{ width: `${percPagoCard}%` }} />
                                        <div className="bg-amber-500" style={{ width: `${percAbertoCard}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                  {pagamento.parcela.observacoes && (
                                    <div className="mt-2 border-t border-gray-200/60 pt-2 text-xs">
                                      <span className="text-gray-500">Obs: </span>
                                      <span className="text-gray-700">{pagamento.parcela.observacoes}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {aniversariantesDia.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      {!isMobile && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                          <Cake className="h-4 w-4" />
                        </span>
                      )}
                      {isMobile && <Cake className="h-4 w-4 text-amber-600" />}
                      Aniversariante do Dia ({aniversariantesDia.length})
                    </h4>
                    <div className="space-y-3">
                      {aniversariantesDia.map((paciente, idx) => {
                        const hoje = new Date();
                        const ehHoje = sameDay(diaSelecionado, hoje);
                        const nomeCompleto = nomePaciente(paciente);
                        const primeiroNome = nomeCompleto.trim().split(/\s+/)[0] || nomeCompleto;
                        const msg = `🎉 Feliz Aniversário!\n\nOlá, ${primeiroNome}, tudo bem?\n\nHoje é um dia especial — desejo um feliz aniversário, com muita saúde, paz e realizações!`;
                        const linkWhatsApp =
                          ehHoje ? buildPatientWhatsappUrl(paciente, msg) : null;
                        return (
                          <div
                            key={idx}
                            className={
                              isMobile
                                ? 'rounded-lg border border-gray-200 bg-white p-3 shadow-sm'
                                : 'rounded-xl border-l-4 border-amber-500 bg-amber-50/80 p-4 transition-all hover:shadow-md'
                            }
                          >
                            <div className={`flex items-center justify-between gap-2 ${isMobile ? 'mb-1' : 'mb-2 gap-3'}`}>
                              {renderNome(paciente, 'flex-1 truncate text-sm font-semibold text-gray-900')}
                              {linkWhatsApp ? (
                                <a
                                  href={linkWhatsApp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 text-xs font-medium text-white transition-colors hover:bg-green-700 ${
                                    isMobile ? 'px-2 py-1.5' : 'px-3 py-2'
                                  }`}
                                  title="Enviar mensagem de aniversário no WhatsApp"
                                >
                                  <MessageSquare size={16} />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                              ) : (
                                <span
                                  className={`flex shrink-0 cursor-default items-center gap-1.5 rounded-lg bg-gray-200 text-xs text-gray-400 ${
                                    isMobile ? 'px-2 py-1.5' : 'px-3 py-2'
                                  }`}
                                  title={
                                    ehHoje && !telefone
                                      ? 'Paciente sem telefone cadastrado'
                                      : 'Disponível no dia do aniversário'
                                  }
                                >
                                  <Cake size={16} />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {weeklyCheckInsDia.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                        <UtensilsCrossed className="h-4 w-4" />
                      </span>
                      Check-ins Semanais ({weeklyCheckInsDia.length})
                    </h4>
                    <p className="mb-2 text-xs text-gray-600">
                      {weeklyDaySummary.completed} respondidos
                      {weeklyDaySummary.waiting > 0
                        ? ` · ${weeklyDaySummary.waiting} aguardando`
                        : ''}
                      {weeklyDaySummary.overdue > 0
                        ? ` · ${weeklyDaySummary.overdue} atrasado${weeklyDaySummary.overdue === 1 ? '' : 's'}`
                        : ''}
                    </p>
                    <div className="space-y-3">
                      {weeklyCheckInsDiaView.length > 0
                        ? weeklyCheckInsDiaView.map(renderWeeklyCheckInCard)
                        : <p className="text-sm text-gray-500">Nenhum check-in neste filtro.</p>}
                    </div>
                  </div>
                )}

                {enableHydrationAdherenceAlerts ? (
                  <HydrationAdherenceCalendarSection
                    selectedDate={diaSelecionado}
                    patientNameById={Object.fromEntries(
                      pacientes.map((p) => [p.id, nomePaciente(p)])
                    )}
                    onOpenPatient={
                      onOpenPacienteCompleto || onOpenPaciente
                        ? (patientId) => {
                            if (onOpenPacienteCompleto) {
                              void onOpenPacienteCompleto(patientId);
                              return;
                            }
                            const found = pacientes.find((p) => p.id === patientId);
                            if (found && onOpenPaciente) onOpenPaciente(found);
                          }
                        : undefined
                    }
                  />
                ) : null}

                {consultasDia.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                        <Video className="h-4 w-4" />
                      </span>
                      Consultas ({consultasDia.length})
                    </h4>
                    {consultaEditError && !editingConsulta ? (
                      <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {consultaEditError}
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      {consultasDia
                        .slice()
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((consulta) => {
                          const abrirPacienteDoCardConsulta =
                            isMobile && (onOpenPacienteCompleto || onOpenPaciente) && consulta.pacienteId
                              ? () => {
                                  setConsultaEditError(null);
                                  void abrirPacienteCompletoConsulta(consulta);
                                }
                              : undefined;
                          return (
                          <div
                            key={consulta.id}
                            onClick={abrirPacienteDoCardConsulta}
                            className={`rounded-xl border px-3 py-2.5 ${
                              consulta.realizada
                                ? 'border-emerald-200 bg-emerald-50/70'
                                : 'border-cyan-200 bg-cyan-50/70'
                            }${abrirPacienteDoCardConsulta ? ' cursor-pointer' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                {(onOpenPacienteCompleto || onOpenPaciente) && consulta.pacienteId ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConsultaEditError(null);
                                      void abrirPacienteCompletoConsulta(consulta);
                                    }}
                                    className="text-left text-sm font-semibold text-gray-900 hover:underline"
                                    title={
                                      !isMobile || nomeExibicaoCardMobile(consulta.pacienteNome) === consulta.pacienteNome
                                        ? 'Abrir paciente'
                                        : consulta.pacienteNome
                                    }
                                  >
                                    {isMobile ? nomeExibicaoCardMobile(consulta.pacienteNome) : consulta.pacienteNome}
                                  </button>
                                ) : (
                                  <p className="text-sm font-semibold text-gray-900">{isMobile ? nomeExibicaoCardMobile(consulta.pacienteNome) : consulta.pacienteNome}</p>
                                )}
                                <p className="text-xs text-cyan-800 tabular-nums">
                                  {consulta.startTime} – {consulta.endTime}
                                </p>
                                {consulta.observacoes ? (
                                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">{consulta.observacoes}</p>
                                ) : null}
                              </div>
                              <div
                                className="flex shrink-0 items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                {(onOpenProntuario || onOpenPaciente) && consulta.pacienteId ? (
                                  <button
                                    type="button"
                                    title="Abrir prontuário"
                                    aria-label="Abrir prontuário do paciente"
                                    onClick={() => {
                                      setConsultaEditError(null);
                                      void abrirProntuarioConsulta(consulta);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-100"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                                {onSaveConsulta ? (
                                  <button
                                    type="button"
                                    title="Editar consulta"
                                    aria-label="Editar consulta"
                                    disabled={savingConsulta}
                                    onClick={() => {
                                      setConsultaEditError(null);
                                      setEditingConsulta(consulta);
                                    }}
                                    className={`inline-flex h-8 items-center justify-center rounded-lg border border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-100 disabled:opacity-50 ${
                                      isMobile ? 'w-8' : 'gap-1 px-2'
                                    }`}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                    {isMobile ? null : <span className="text-xs font-medium">Editar</span>}
                                  </button>
                                ) : null}
                                {onDeleteConsulta ? (
                                  <button
                                    type="button"
                                    title="Apagar consulta"
                                    aria-label="Apagar consulta"
                                    disabled={savingConsulta}
                                    onClick={() => {
                                      confirmarApagarConsulta(consulta.pacienteNome || 'Paciente', () => {
                                        void handleDeleteConsulta(consulta.id);
                                      });
                                    }}
                                    className={`inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 ${
                                      isMobile ? 'w-8' : 'gap-1 px-2'
                                    }`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {isMobile ? null : <span className="text-xs font-medium">Apagar</span>}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {onToggleConsultaRealizada ? (
                              <div
                                className="mt-2 flex items-center justify-between gap-2 border-t border-white/70 pt-2"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <span
                                  className={`text-xs font-medium ${
                                    consulta.realizada ? 'text-green-700' : 'text-gray-500'
                                  }`}
                                >
                                  {consulta.realizada ? 'Consulta realizada' : 'Confirmar realizada'}
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={!!consulta.realizada}
                                  aria-label={
                                    consulta.realizada
                                      ? 'Desmarcar consulta realizada'
                                      : 'Marcar consulta como realizada'
                                  }
                                  disabled={savingConsulta}
                                  onClick={() => void handleToggleConsultaRealizada(consulta)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                                    consulta.realizada
                                      ? 'bg-green-500 focus:ring-green-500'
                                      : 'bg-gray-400 focus:ring-green-500'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                      consulta.realizada ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            ) : null}
                          </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {lembretesDia.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      {!isMobile && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                          <Bell className="h-4 w-4" />
                        </span>
                      )}
                      {isMobile && <Bell className="h-4 w-4 text-orange-600" />}
                      Lembretes ({lembretesDia.length})
                    </h4>
                    <div className="space-y-3">
                      {lembretesDia.map((lembrete) => {
                        const tagCfg = getLembreteTagConfig(lembrete.tag);
                        return (
                          <div
                            key={lembrete.id}
                            className={
                              isMobile
                                ? `rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${
                                    lembrete.concluido ? 'opacity-75' : ''
                                  }`
                                : `rounded-xl border-l-4 p-4 transition-all hover:shadow-md ${
                                    lembrete.concluido
                                      ? 'border-green-500 bg-green-50/50 opacity-75'
                                      : 'border-orange-400 bg-orange-50/80'
                                  }`
                            }
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`truncate text-sm font-semibold ${
                                    lembrete.concluido
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-900'
                                  }`}
                                  title={
                                    isMobile && nomeExibicaoCardMobile(lembrete.pacienteNome) !== lembrete.pacienteNome
                                      ? lembrete.pacienteNome
                                      : undefined
                                  }
                                >
                                  {isMobile ? nomeExibicaoCardMobile(lembrete.pacienteNome) : lembrete.pacienteNome}
                                </p>
                                {lembrete.horario ? (
                                  <p className="mt-0.5 text-xs font-medium text-orange-600">
                                    {lembrete.horario}
                                    {lembrete.avisoWhatsApp && lembrete.avisoWhatsApp !== 'disabled'
                                      ? ' · aviso WhatsApp'
                                      : ''}
                                  </p>
                                ) : null}
                                <p
                                  className={`mt-1 text-sm ${
                                    lembrete.concluido
                                      ? 'text-gray-400 line-through'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {lembrete.texto}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tagCfg.bgLight} ${tagCfg.textLight}`}
                                >
                                  {lembrete.tag}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLembreteEditandoId(lembrete.id);
                                    setLembreteInitialValues({
                                      data: lembrete.data,
                                      horario: lembrete.horario,
                                      avisoWhatsApp: lembrete.avisoWhatsApp,
                                      telefoneAviso: lembrete.telefoneAviso,
                                      telefoneAvisoDdi: lembrete.telefoneAvisoDdi,
                                      telefoneAvisoPais: lembrete.telefoneAvisoPais,
                                      notificarPaciente: lembrete.notificarPaciente,
                                      pacienteId: lembrete.pacienteId,
                                      pacienteNome: lembrete.pacienteNome,
                                      texto: lembrete.texto,
                                      tag: lembrete.tag,
                                    });
                                    setShowModalNovoLembrete(true);
                                  }}
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                                  title="Editar lembrete"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm('Deletar este lembrete?')) return;
                                    try {
                                      await onDeletarLembrete(lembrete.id);
                                      await onLembretesChanged?.();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                  title="Deletar lembrete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between border-t border-gray-200/60 pt-2">
                              <span
                                className={`text-xs font-medium ${
                                  lembrete.concluido ? 'text-green-600' : 'text-gray-500'
                                }`}
                              >
                                {lembrete.concluido ? 'Realizado' : 'Pendente'}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={!!lembrete.concluido}
                                onClick={async () => {
                                  try {
                                    await onToggleLembrete(lembrete.id, !lembrete.concluido);
                                    await onLembretesChanged?.();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                  lembrete.concluido
                                    ? 'bg-green-500 focus:ring-green-500'
                                    : 'bg-gray-500 focus:ring-green-500'
                                }`}
                                title={lembrete.concluido ? 'Marcar como pendente' : 'Marcar como realizado'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                    lembrete.concluido ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {aplicacoesDia.length === 0 &&
                  pagamentosDia.length === 0 &&
                  aniversariantesDia.length === 0 &&
                  lembretesDia.length === 0 &&
                  weeklyCheckInsDia.length === 0 && (
                    <p className="py-8 text-center text-gray-500">
                      Nenhuma aplicação, pagamento, aniversariante, lembrete ou check-in semanal para este dia.
                    </p>
                  )}
              </div>
            ) : enableWeeklyNutritionCheckIns ? (
              <div className="flex flex-1 flex-col overflow-auto p-4 sm:p-5">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <UtensilsCrossed className="h-4 w-4" />
                  </span>
                  Check-ins da semana
                </h4>
                {weeklyCheckInsWeek.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhum Check-in Semanal programado para este período.
                  </p>
                ) : weeklyCheckInsWeekView.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum check-in neste filtro.</p>
                ) : (
                  <div className="space-y-3">{weeklyCheckInsWeekView.map(renderWeeklyCheckInCard)}</div>
                )}
                <p className="mt-4 text-center text-xs text-gray-400">
                  Selecione um dia no calendário para ver aplicações, pagamentos, aniversariantes e lembretes.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Calendar className="mb-4 h-14 w-14 text-gray-300" />
                <p className="font-medium text-gray-500">Selecione um dia no calendário</p>
                <p className="mt-1 text-sm text-gray-400">
                  As aplicações, pagamentos, aniversariantes, lembretes e check-ins semanais do dia aparecerão aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModalNovoLembrete && (
        <ModalNovoLembrete
          key={lembreteEditandoId ?? 'novo'}
          pacientes={pacientes}
          tags={tags}
          lembreteId={lembreteEditandoId ?? undefined}
          initialValues={lembreteInitialValues}
          defaultTelefoneAviso={defaultTelefoneAviso}
          defaultTelefoneAvisoDdi={defaultTelefoneAvisoDdi}
          defaultTelefoneAvisoPais={defaultTelefoneAvisoPais}
          audience={avisoAudience}
          onFechar={fecharModalLembrete}
          onSalvar={handleSalvarModalLembrete}
        />
      )}
      {editingConsulta && onSaveConsulta && (
        <EditarConsultaCalendarioModal
          consulta={editingConsulta}
          saving={savingConsulta}
          error={consultaEditError}
          onClose={() => {
            if (savingConsulta) return;
            setEditingConsulta(null);
            setConsultaEditError(null);
          }}
          onSave={handleSaveConsulta}
          onDelete={onDeleteConsulta ? handleDeleteConsulta : undefined}
        />
      )}
      {confirmarApagarConsultaModal}
      {consultaProntuarioPendente ? (
        <ConfirmarObservacaoProntuarioModal
          pacienteNome={consultaProntuarioPendente.pacienteNome}
          onNao={() => setConsultaProntuarioPendente(null)}
          onSim={() => {
            const consulta = consultaProntuarioPendente;
            setConsultaProntuarioPendente(null);
            if (consulta) void abrirProntuarioConsulta(consulta);
          }}
        />
      ) : null}
      {weeklySlotAction && weeklyCheckInNutritionistId
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex flex-col bg-white">
              {weeklySlotAction.intent === 'history' ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <div className="flex justify-end px-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setWeeklySlotAction(null);
                        reloadWeeklyCheckIns();
                      }}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      aria-label="Fechar"
                      title="Fechar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mx-auto w-full max-w-5xl px-4 pb-8">
                    <CheckInSemanalNutriEvolucao
                      pacienteId={weeklySlotAction.slot.patientId}
                      pacienteNome={weeklySlotAction.slot.patientName}
                      tratamentoSemana={calcularSemanaAtualTratamento(
                        pacientesById.get(weeklySlotAction.slot.patientId) ?? null
                      )}
                      canFill
                      canDelete
                      hasLegacyDaily={false}
                      focusWeekKey={weeklySlotAction.slot.weekKey}
                      viewerRole="nutritionist"
                      nutritionistId={weeklyCheckInNutritionistId}
                      onStartCheckIn={() => {
                        const week = getNutritionCheckInReferenceWeek();
                        setWeeklySlotAction({
                          slot: {
                            ...weeklySlotAction.slot,
                            weekKey: week.weekKey,
                            weekStart: week.weekStart,
                            weekEnd: week.weekEnd,
                          },
                          intent: 'create',
                        });
                      }}
                      onOpenWeek={(weekKey) => {
                        const week = getNutritionWeek(weekKey);
                        setWeeklySlotAction({
                          slot: {
                            ...weeklySlotAction.slot,
                            weekKey: week.weekKey,
                            weekStart: week.weekStart,
                            weekEnd: week.weekEnd,
                          },
                          intent: 'edit',
                        });
                      }}
                      onDeleted={() => reloadWeeklyCheckIns()}
                    />
                  </div>
                </div>
              ) : (
                <CheckInSemanalNutriView
                  pacienteId={weeklySlotAction.slot.patientId}
                  pacienteNome={weeklySlotAction.slot.patientName}
                  nutricionistaNome={weeklyCheckInAuthorName}
                  nutritionistId={weeklyCheckInNutritionistId}
                  mode="nutritionist"
                  answeredBy="nutritionist"
                  source="nutritionist"
                  answeredById={weeklyCheckInNutritionistId}
                  week={getNutritionWeek(weeklySlotAction.slot.weekStart)}
                  intent={weeklySlotAction.intent}
                  viewerRole="nutritionist"
                  onClose={() => {
                    setWeeklySlotAction(null);
                    reloadWeeklyCheckIns();
                  }}
                  onGoToHistory={() => {
                    setWeeklySlotAction({
                      slot: weeklySlotAction.slot,
                      intent: 'history',
                    });
                  }}
                />
              )}
            </div>,
            document.body
          )
        : null}
      {fotosModal}
    </>
  );
}
