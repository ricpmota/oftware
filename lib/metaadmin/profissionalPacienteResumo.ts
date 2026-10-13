import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NUTRI_AVAILABILITY_COLLECTION } from '@/lib/nutri/agenda/agendaDefaults';
import { planoTemAnamneseNutricional } from '@/lib/nutri/anamneseNutricional';
import { getBrazilDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import { trainingSessionService } from '@/services/trainingSessionService';
import type { PacienteCompleto } from '@/types/obesidade';
import type { TrainingSession } from '@/types/trainingSession';

const COL_PACIENTES = 'pacientes_completos';

const ESTILO_LABEL: Record<string, string> = {
  digestiva: 'Digestiva',
  plant_based: 'Plant based',
  mediterranea: 'Mediterrânea',
  rico_proteina: 'Rica em proteína',
  low_carb_moderada: 'Low carb moderada',
};

export const REFEICOES_RESUMO = [
  { key: 'cafe', label: 'Café' },
  { key: 'lanche1', label: 'Manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche2', label: 'Tarde' },
  { key: 'jantar', label: 'Jantar' },
] as const;

export const DIAS_TREINO_RESUMO = [
  { weekday: 1, label: 'Seg' },
  { weekday: 2, label: 'Ter' },
  { weekday: 3, label: 'Qua' },
  { weekday: 4, label: 'Qui' },
  { weekday: 5, label: 'Sex' },
  { weekday: 6, label: 'Sáb' },
  { weekday: 0, label: 'Dom' },
] as const;

export type RefeicaoResumoItem = {
  key: string;
  label: string;
  preenchida: boolean;
};

export type DiaTreinoResumo = {
  weekday: number;
  label: string;
  temTreino: boolean;
};

export type CardapioResumo = {
  temPlano: boolean;
  anamneseRealizada: boolean;
  refeicoes: RefeicaoResumoItem[];
  estiloLabel?: string;
  protDia_g?: number;
  aguaDia_ml?: number;
  temCardapioPersonalizado: boolean;
};

export type TreinoResumo = {
  anamneseRealizada: boolean;
  anamneseStatus: 'nao_iniciada' | 'em_preenchimento' | 'realizada' | 'revisao';
  dias: DiaTreinoResumo[];
  total: number;
  proximos: { title: string; date: string }[];
  ultimo?: { title: string; date: string; status: string };
};

export type ConsultaAgendaItem = {
  pacienteId: string;
  date: string;
  startTime: string;
  endTime: string;
  realizada: boolean;
};

export type ConsultaAgendaResumo = {
  proxima?: ConsultaAgendaItem;
  ultimaRealizada?: ConsultaAgendaItem;
  ultimaNaoRealizada?: ConsultaAgendaItem;
};

export const EMPTY_CONSULTA_RESUMO: ConsultaAgendaResumo = {};

function slotSortKey(item: ConsultaAgendaItem): string {
  return `${item.date}T${item.startTime || '00:00'}`;
}

export function buildConsultaAgendaResumo(
  slots: ConsultaAgendaItem[],
  today: string
): ConsultaAgendaResumo {
  if (slots.length === 0) return { ...EMPTY_CONSULTA_RESUMO };
  const upcoming = slots
    .filter((s) => !s.realizada && s.date >= today)
    .sort((a, b) => slotSortKey(a).localeCompare(slotSortKey(b)));
  const realizadas = slots
    .filter((s) => s.realizada)
    .sort((a, b) => slotSortKey(b).localeCompare(slotSortKey(a)));
  const naoRealizadas = slots
    .filter((s) => !s.realizada && s.date < today)
    .sort((a, b) => slotSortKey(b).localeCompare(slotSortKey(a)));
  return {
    proxima: upcoming[0],
    ultimaRealizada: realizadas[0],
    ultimaNaoRealizada: naoRealizadas[0],
  };
}

export function consultaResumoForPaciente(
  byPacienteId: Record<string, ConsultaAgendaResumo>,
  paciente: { id?: string | null; userId?: string | null }
): ConsultaAgendaResumo {
  const byId = paciente.id ? byPacienteId[paciente.id] : undefined;
  if (byId) return byId;
  const byUser = paciente.userId ? byPacienteId[paciente.userId] : undefined;
  return byUser ?? EMPTY_CONSULTA_RESUMO;
}

type OpcaoRefeicaoLike = {
  itensSelecionados?: unknown[];
  itensDetalhe?: unknown[];
  itens?: unknown[];
  proteina_g?: number;
};

type MacrosRefeicaoLike = {
  proteinaEscolhida_g?: number;
  caloriasEscolhida_kcal?: number;
};

function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function weekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

function patientIdsToTry(paciente: PacienteCompleto): string[] {
  const ids: string[] = [];
  if (paciente.userId) ids.push(paciente.userId);
  const prefix = /^(.+)_\d+$/.exec(paciente.userId || '')?.[1];
  if (prefix) ids.push(prefix);
  if (paciente.id) ids.push(paciente.id);
  return [...new Set(ids)];
}

function opcaoTemItens(opcao: OpcaoRefeicaoLike | null | undefined): boolean {
  if (!opcao) return false;
  if ((opcao.itensSelecionados?.length ?? 0) > 0) return true;
  if ((opcao.itensDetalhe?.length ?? 0) > 0) return true;
  if ((opcao.itens?.length ?? 0) > 0) return true;
  if ((opcao.proteina_g ?? 0) > 0) return true;
  return false;
}

function refeicaoPreenchida(
  plano: {
    itensCustomizadosPorRefeicao?: Record<string, unknown[]>;
    opcoesSlots?: Record<string, OpcaoRefeicaoLike[]>;
    opcoesCustomizadas?: Record<string, OpcaoRefeicaoLike[]>;
    macrosPorRefeicao?: Record<string, MacrosRefeicaoLike>;
  },
  key: string
): boolean {
  const custom = plano.itensCustomizadosPorRefeicao?.[key];
  if (Array.isArray(custom) && custom.length > 0) return true;
  if ((plano.opcoesSlots?.[key] ?? []).some((opcao) => opcaoTemItens(opcao))) return true;
  if ((plano.opcoesCustomizadas?.[key] ?? []).some((opcao) => opcaoTemItens(opcao))) return true;
  const macros = plano.macrosPorRefeicao?.[key];
  if (macros && ((macros.proteinaEscolhida_g ?? 0) > 0 || (macros.caloriasEscolhida_kcal ?? 0) > 0)) {
    return true;
  }
  return false;
}

function emptyCardapio(): CardapioResumo {
  return {
    temPlano: false,
    anamneseRealizada: false,
    refeicoes: REFEICOES_RESUMO.map((r) => ({ key: r.key, label: r.label, preenchida: false })),
    temCardapioPersonalizado: false,
  };
}

function emptyTreino(): TreinoResumo {
  return {
    anamneseRealizada: false,
    anamneseStatus: 'nao_iniciada',
    dias: DIAS_TREINO_RESUMO.map((d) => ({ weekday: d.weekday, label: d.label, temTreino: false })),
    total: 0,
    proximos: [],
  };
}

const cardapioResumoCache = new Map<string, Promise<CardapioResumo>>();
const treinoResumoCache = new Map<string, Promise<TreinoResumo>>();
const consultasPorNutriCache = new Map<string, Promise<Record<string, ConsultaAgendaResumo>>>();

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function loadCardapioResumo(pacienteId: string): Promise<CardapioResumo> {
  if (!pacienteId?.trim()) return emptyCardapio();
  const cached = cardapioResumoCache.get(pacienteId);
  if (cached) return cached;
  const pending = loadCardapioResumoFromDb(pacienteId);
  cardapioResumoCache.set(pacienteId, pending);
  return pending;
}

async function loadCardapioResumoFromDb(pacienteId: string): Promise<CardapioResumo> {
  if (!pacienteId?.trim()) return emptyCardapio();
  try {
    const snap = await getDoc(doc(db, COL_PACIENTES, pacienteId, 'nutricao', 'plano'));
    if (!snap.exists()) return emptyCardapio();
    const plano = snap.data() as {
      estilo?: string;
      protDia_g?: number;
      aguaDia_ml?: number;
      opcoesSelecionadas?: Record<string, string>;
      itensCustomizadosPorRefeicao?: Record<string, unknown[]>;
      opcoesCustomizadas?: Record<string, OpcaoRefeicaoLike[]>;
      opcoesSlots?: Record<string, OpcaoRefeicaoLike[]>;
      macrosPorRefeicao?: Record<string, MacrosRefeicaoLike>;
      anamneseNutricional?: unknown;
    };
    const refeicoes = REFEICOES_RESUMO.map((r) => ({
      key: r.key,
      label: r.label,
      preenchida: refeicaoPreenchida(plano, r.key),
    }));
    const temCardapioPersonalizado = refeicoes.some((r) => r.preenchida);

    return {
      temPlano: true,
      anamneseRealizada: planoTemAnamneseNutricional(plano),
      refeicoes,
      estiloLabel: ESTILO_LABEL[plano.estilo ?? ''] ?? plano.estilo,
      protDia_g: plano.protDia_g,
      aguaDia_ml: plano.aguaDia_ml,
      temCardapioPersonalizado,
    };
  } catch {
    return emptyCardapio();
  }
}

export async function loadTreinoResumo(paciente: PacienteCompleto): Promise<TreinoResumo> {
  const cacheKey = paciente.id || paciente.userId || '';
  if (!cacheKey) return emptyTreino();
  const cached = treinoResumoCache.get(cacheKey);
  if (cached) return cached;
  const pending = loadTreinoResumoFromDb(paciente);
  treinoResumoCache.set(cacheKey, pending);
  return pending;
}

async function loadTreinoResumoFromDb(paciente: PacienteCompleto): Promise<TreinoResumo> {
  const empty = emptyTreino();
  try {
    let sessions: TrainingSession[] = [];
    let anamneseStatus: TreinoResumo['anamneseStatus'] = 'nao_iniciada';

    for (const id of patientIdsToTry(paciente)) {
      if (anamneseStatus === 'nao_iniciada') {
        const avaliacao = await avaliacaoAtividadeFisicaService.getByPatientId(id);
        if (avaliacao) {
          if (avaliacao.status === 'completed') anamneseStatus = 'realizada';
          else if (avaliacao.status === 'needs_review') anamneseStatus = 'revisao';
          else anamneseStatus = 'em_preenchimento';
        }
      }
      if (sessions.length === 0) {
        sessions = await trainingSessionService.getPatientSessions(id);
      }
      if (anamneseStatus !== 'nao_iniciada' && sessions.length > 0) break;
    }

    const hoje = todayYmd();
    const from = addDaysYmd(hoje, -7);
    const to = addDaysYmd(hoje, 14);
    const janela = sessions.filter((s) => s.scheduledDate >= from && s.scheduledDate <= to);
    const fonteDias = janela.length > 0 ? janela : sessions;
    const weekdaysComTreino = new Set(fonteDias.map((s) => weekdayFromYmd(s.scheduledDate)));

    const proximos = sessions
      .filter((s) => s.scheduledDate >= hoje && s.status === 'scheduled')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 3)
      .map((s) => ({ title: s.title || 'Treino', date: s.scheduledDate }));

    const ultimoDone = sessions.find((s) => s.status === 'done');

    return {
      anamneseRealizada: anamneseStatus === 'realizada',
      anamneseStatus,
      dias: DIAS_TREINO_RESUMO.map((d) => ({
        weekday: d.weekday,
        label: d.label,
        temTreino: weekdaysComTreino.has(d.weekday),
      })),
      total: sessions.length,
      proximos,
      ultimo: ultimoDone
        ? {
            title: ultimoDone.title || 'Treino',
            date: ultimoDone.scheduledDate,
            status: ultimoDone.status,
          }
        : undefined,
    };
  } catch {
    return empty;
  }
}

export async function loadConsultasPorNutri(
  nutricionistaId: string
): Promise<Record<string, ConsultaAgendaResumo>> {
  const id = nutricionistaId?.trim() || '';
  if (!id) return {};
  const cached = consultasPorNutriCache.get(id);
  if (cached) return cached;
  const pending = loadConsultasPorNutriFromDb(id);
  consultasPorNutriCache.set(id, pending);
  return pending;
}

async function loadConsultasPorNutriFromDb(
  nutricionistaId: string
): Promise<Record<string, ConsultaAgendaResumo>> {
  try {
    const snap = await getDocs(
      query(
        collection(db, NUTRI_AVAILABILITY_COLLECTION),
        where('nutricionistaId', '==', nutricionistaId),
        where('status', '==', 'reserved')
      )
    );
    const byPaciente = new Map<string, ConsultaAgendaItem[]>();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const pacienteId = String(data.pacienteId || '').trim();
      const date = String(data.date || '').trim().slice(0, 10);
      if (!pacienteId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const item: ConsultaAgendaItem = {
        pacienteId,
        date,
        startTime: String(data.startTime || ''),
        endTime: String(data.endTime || ''),
        realizada: data.realizada === true,
      };
      const list = byPaciente.get(pacienteId) ?? [];
      list.push(item);
      byPaciente.set(pacienteId, list);
    }
    const today = getBrazilDateKey();
    const out: Record<string, ConsultaAgendaResumo> = {};
    for (const [pacienteId, slots] of byPaciente) {
      out[pacienteId] = buildConsultaAgendaResumo(slots, today);
    }
    return out;
  } catch {
    return {};
  }
}

