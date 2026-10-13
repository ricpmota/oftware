import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  EventoTimelineDados,
  EventoTimelineOrigem,
  EventoTimelineTipo,
} from './prontuarioTypes';

const COL_PACIENTES = 'pacientes_completos';
const SUB_TIMELINE = 'timeline';

/** Caminho: pacientes_completos/{pacienteId}/timeline/{eventoId} */
function timelineCollectionRef(pacienteId: string) {
  return collection(db, COL_PACIENTES, pacienteId, SUB_TIMELINE);
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }
  return cleaned;
}

function toDateSafe(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function formatDataHoraAtual(date = new Date()): { data: string; hora: string } {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return { data: `${dd}/${mm}/${yyyy}`, hora: `${hh}:${min}` };
}

/** Origem padrão por tipo quando o módulo não informar explicitamente. */
function origemPadraoParaTipoAutomatico(tipo: EventoTimelineTipo): EventoTimelineOrigem {
  switch (tipo) {
    case 'nutricao':
      return 'nutri';
    case 'atividade_fisica':
      return 'personal';
    case 'ia':
    case 'imagem':
    case 'sistema_importante':
    case 'exame_resultado':
    case 'exame_solicitado':
    case 'pagamento':
    case 'bioimpedancia':
      return 'sistema';
    case 'aplicacao':
      return 'paciente';
    case 'lembrete':
      return 'medico';
    default:
      return 'sistema';
  }
}

export type ProntuarioEventoInput = {
  tipo: EventoTimelineTipo;
  titulo: string;
  descricao: string;
  data: string;
  hora?: string;
  origem?: EventoTimelineOrigem;
  destaque?: string;
  dados?: EventoTimelineDados;
  /** Preenchido em registros do nutricionista (metanutri). */
  nutricionistaId?: string;
  /** Médico autor do registro (responsável ou compartilhado via Comunicação). */
  medicoId?: string;
  medicoNome?: string;
  /** Psiquiatra autor (gravação preferencial via API MetaPsi). */
  psiquiatraId?: string;
  psiquiatraNome?: string;
};

export type ProntuarioEventoAutomaticoParams = {
  tipo: EventoTimelineTipo;
  titulo: string;
  descricao: string;
  origem?: EventoTimelineOrigem;
  destaque?: string;
  dados?: EventoTimelineDados;
  /** Se omitido, usa data/hora atuais no fuso local do cliente. */
  data?: string;
  hora?: string;
};

export type ProntuarioEventoFirestore = ProntuarioEventoInput & {
  pacienteId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  ativo: boolean;
};

export type ProntuarioEvento = ProntuarioEventoInput & {
  id: string;
  pacienteId: string;
  criadoEm: Date;
  atualizadoEm: Date;
  ativo: boolean;
  nutricionistaId?: string;
  medicoId?: string;
  medicoNome?: string;
  psiquiatraId?: string;
  psiquiatraNome?: string;
};

export type ProntuarioEventosPage = {
  eventos: ProntuarioEvento[];
  nextCursor?: { criadoEmMs: number; id: string };
};

/**
 * Monta payload padronizado para eventos automáticos (exames, pagamentos, IA, etc.).
 * Garante origem, data/hora, status em dados e campos prontos para persistência.
 */
export function montarEventoAutomaticoBase(
  params: ProntuarioEventoAutomaticoParams
): ProntuarioEventoInput {
  const { data, hora } =
    params.data && params.hora
      ? { data: params.data, hora: params.hora }
      : params.data
        ? { ...formatDataHoraAtual(), data: params.data }
        : formatDataHoraAtual();

  const origem = params.origem ?? origemPadraoParaTipoAutomatico(params.tipo);

  const dados: EventoTimelineDados = {
    ...params.dados,
    status: params.dados?.status ?? 'Registro automático',
  };

  return {
    tipo: params.tipo,
    titulo: params.titulo,
    descricao: params.descricao,
    data,
    hora,
    origem,
    destaque: params.destaque,
    dados,
  };
}

/**
 * Registro manual pelo médico na aba Prontuário.
 * Persiste em pacientes_completos/{pacienteId}/timeline/{eventoId}.
 */
export async function criarEventoProntuario(
  pacienteId: string,
  evento: ProntuarioEventoInput
): Promise<string> {
  if (!pacienteId?.trim()) {
    throw new Error('pacienteId é obrigatório para criar evento no prontuário.');
  }

  const agora = Timestamp.now();
  const payload = removeUndefined({
    pacienteId,
    tipo: evento.tipo,
    titulo: evento.titulo,
    descricao: evento.descricao,
    data: evento.data,
    hora: evento.hora,
    origem: evento.origem,
    destaque: evento.destaque,
    dados: evento.dados,
    nutricionistaId: evento.nutricionistaId,
    medicoId: evento.medicoId,
    medicoNome: evento.medicoNome,
    psiquiatraId: evento.psiquiatraId,
    psiquiatraNome: evento.psiquiatraNome,
    criadoEm: agora,
    atualizadoEm: agora,
    ativo: true,
  }) as ProntuarioEventoFirestore;

  const docRef = await addDoc(timelineCollectionRef(pacienteId), payload);
  return docRef.id;
}

/**
 * Registro manual pelo nutricionista (metanutri). Visível ao médico; não expõe prontuário médico ao nutri.
 */
export async function criarEventoProntuarioNutri(
  pacienteId: string,
  nutricionistaId: string | undefined,
  evento: Omit<ProntuarioEventoInput, 'origem' | 'tipo'>
): Promise<string> {
  return criarEventoProntuario(pacienteId, {
    ...evento,
    tipo: 'nutricao',
    origem: 'nutri',
    nutricionistaId: nutricionistaId?.trim() || undefined,
  });
}

/**
 * Registro manual pelo educador físico (metapersonal). Visível ao médico como Atividade física.
 */
export async function criarEventoProntuarioPersonal(
  pacienteId: string,
  personalId: string | undefined,
  evento: Omit<ProntuarioEventoInput, 'origem' | 'tipo'>
): Promise<string> {
  return criarEventoProntuario(pacienteId, {
    ...evento,
    tipo: 'atividade_fisica',
    origem: 'personal',
    // Reusa o campo opcional de profissional até haver personalId dedicado.
    nutricionistaId: personalId?.trim() || undefined,
  });
}

/**
 * Helper de payload para origem `psiquiatra`.
 * Preferir a API MetaPsi (Admin + ACL) em produção; não usar no client MetaPsi.
 */
export async function criarEventoProntuarioPsiquiatra(
  pacienteId: string,
  psiquiatraId: string | undefined,
  evento: Omit<ProntuarioEventoInput, 'origem' | 'tipo'>
): Promise<string> {
  return criarEventoProntuario(pacienteId, {
    ...evento,
    tipo: 'consulta',
    origem: 'psiquiatra',
    psiquiatraId: psiquiatraId?.trim() || undefined,
  });
}

/**
 * Desativa (soft-delete) um evento da timeline.
 * Marca `ativo = false` em vez de excluir o documento.
 */
export async function desativarEventoProntuario(
  pacienteId: string,
  eventoId: string
): Promise<void> {
  if (!pacienteId?.trim() || !eventoId?.trim()) {
    throw new Error('pacienteId e eventoId são obrigatórios para desativar evento.');
  }
  const docRef = doc(db, COL_PACIENTES, pacienteId, SUB_TIMELINE, eventoId);
  await updateDoc(docRef, { ativo: false, atualizadoEm: Timestamp.now() });
}

/**
 * Registro automático disparado por outros módulos do sistema.
 *
 * Separação arquitetural em relação a `criarEventoProntuario`:
 * - eventos manuais (médico) vs automáticos (sistema, integrações, IA);
 * - ponto único para regras futuras (deduplicação, auditoria, enriquecimento por IA);
 * - contrato estável para exames, prescrições, pagamentos, aplicações, bioimpedância, nutri, personal.
 *
 * Exemplos futuros (ainda não integrados):
 *
 * ```ts
 * // Resultado laboratorial recebido
 * await registrarEventoAutomaticoProntuario(pacienteId, {
 *   tipo: 'exame_resultado',
 *   titulo: 'Resultado laboratorial recebido',
 *   descricao: 'HbA1c atualizado automaticamente.',
 *   origem: 'sistema',
 *   dados: { exame: 'HbA1c' },
 * });
 *
 * // Pagamento confirmado
 * await registrarEventoAutomaticoProntuario(pacienteId, {
 *   tipo: 'pagamento',
 *   titulo: 'Pagamento confirmado',
 *   descricao: 'Mensalidade quitada via gateway.',
 *   dados: { valor: 'R$ 450,00', status: 'Confirmado' },
 * });
 *
 * // Aplicação registrada pelo paciente no app
 * await registrarEventoAutomaticoProntuario(pacienteId, {
 *   tipo: 'aplicacao',
 *   titulo: 'Aplicação registrada',
 *   descricao: 'Dose semanal confirmada pelo paciente.',
 *   origem: 'paciente',
 *   dados: { medicamento: 'Tirzepatida', dose: '2,5 mg' },
 * });
 *
 * // Resumo longitudinal gerado por IA
 * await registrarEventoAutomaticoProntuario(pacienteId, {
 *   tipo: 'ia',
 *   titulo: 'Resumo clínico gerado',
 *   descricao: 'Síntese automática da evolução metabólica.',
 *   destaque: 'Insight IA',
 * });
 * ```
 */
export async function registrarEventoAutomaticoProntuario(
  pacienteId: string,
  evento: ProntuarioEventoInput
): Promise<string> {
  const normalizado = montarEventoAutomaticoBase({
    tipo: evento.tipo,
    titulo: evento.titulo,
    descricao: evento.descricao,
    origem: evento.origem,
    destaque: evento.destaque,
    dados: evento.dados,
    data: evento.data,
    hora: evento.hora,
  });

  return criarEventoProntuario(pacienteId, normalizado);
}

/**
 * Lista eventos ativos da timeline do paciente, mais recentes primeiro.
 */
export async function listarEventosProntuario(pacienteId: string): Promise<ProntuarioEvento[]> {
  const page = await listarEventosProntuarioPaginado(pacienteId, { pageSize: 200 });
  return page.eventos;
}

function compararEventosTimeline(a: ProntuarioEvento, b: ProntuarioEvento): number {
  const diff = b.criadoEm.getTime() - a.criadoEm.getTime();
  if (diff !== 0) return diff;
  return b.id.localeCompare(a.id);
}

function indiceAposCursor(
  eventos: ProntuarioEvento[],
  cursor: { criadoEmMs: number; id: string }
): number {
  const exato = eventos.findIndex(
    (e) => e.criadoEm.getTime() === cursor.criadoEmMs && e.id === cursor.id
  );
  if (exato >= 0) return exato + 1;

  const proximo = eventos.findIndex((e) => {
    const t = e.criadoEm.getTime();
    return t < cursor.criadoEmMs || (t === cursor.criadoEmMs && e.id < cursor.id);
  });
  return proximo >= 0 ? proximo : eventos.length;
}

export async function listarEventosProntuarioPaginado(
  pacienteId: string,
  options?: {
    pageSize?: number;
    cursor?: { criadoEmMs: number; id: string };
    /** Restringe a uma origem (ex.: nutri no metanutri). */
    origem?: EventoTimelineOrigem;
  }
): Promise<ProntuarioEventosPage> {
  if (!pacienteId?.trim()) {
    throw new Error('pacienteId é obrigatório para listar eventos do prontuário.');
  }
  const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 30));

  const colRef = timelineCollectionRef(pacienteId);
  const snapshot = options?.origem
    ? await getDocs(
        query(colRef, where('ativo', '==', true), where('origem', '==', options.origem))
      )
    : await getDocs(query(colRef, where('ativo', '==', true)));

  const todos = snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        pacienteId: (data.pacienteId as string) ?? pacienteId,
        tipo: data.tipo as EventoTimelineTipo,
        titulo: (data.titulo as string) ?? '',
        descricao: (data.descricao as string) ?? '',
        data: (data.data as string) ?? '',
        hora: data.hora as string | undefined,
        origem: data.origem as EventoTimelineOrigem | undefined,
        destaque: data.destaque as string | undefined,
        dados: data.dados as EventoTimelineDados | undefined,
        nutricionistaId: data.nutricionistaId as string | undefined,
        medicoId: data.medicoId as string | undefined,
        medicoNome: data.medicoNome as string | undefined,
        psiquiatraId: data.psiquiatraId as string | undefined,
        psiquiatraNome: data.psiquiatraNome as string | undefined,
        criadoEm: toDateSafe(data.criadoEm),
        atualizadoEm: toDateSafe(data.atualizadoEm),
        ativo: data.ativo !== false,
      } satisfies ProntuarioEvento;
    })
    .sort(compararEventosTimeline);

  const startIdx = options?.cursor ? indiceAposCursor(todos, options.cursor) : 0;
  const pageEventos = todos.slice(startIdx, startIdx + pageSize);
  const last = pageEventos[pageEventos.length - 1];

  return {
    eventos: pageEventos,
    nextCursor:
      pageEventos.length === pageSize && startIdx + pageSize < todos.length && last
        ? { criadoEmMs: last.criadoEm.getTime(), id: last.id }
        : undefined,
  };
}

/** Timeline do nutricionista: apenas registros com origem `nutri` (exclui legado do personal). */
export async function listarEventosProntuarioNutriPaginado(
  pacienteId: string,
  options?: { pageSize?: number; cursor?: { criadoEmMs: number; id: string } }
): Promise<ProntuarioEventosPage> {
  if (!pacienteId?.trim()) {
    throw new Error('pacienteId é obrigatório para listar eventos do prontuário.');
  }
  const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 30));
  const page = await listarEventosProntuarioPaginado(pacienteId, {
    pageSize: 200,
    origem: 'nutri',
  });
  const todos = page.eventos.filter((e) => !tituloPareceEducadorFisico(e.titulo));
  const startIdx = options?.cursor ? indiceAposCursor(todos, options.cursor) : 0;
  const pageEventos = todos.slice(startIdx, startIdx + pageSize);
  const last = pageEventos[pageEventos.length - 1];
  return {
    eventos: pageEventos,
    nextCursor:
      pageEventos.length === pageSize && startIdx + pageSize < todos.length && last
        ? { criadoEmMs: last.criadoEm.getTime(), id: last.id }
        : undefined,
  };
}

function tituloPareceEducadorFisico(titulo: string | undefined): boolean {
  return /Educador F[ií]sico/i.test(titulo || '');
}

/** Corrige registros do personal gravados por engano como Nutrição. */
export function normalizarEventoTimelinePersonal<
  T extends { tipo: EventoTimelineTipo; titulo: string; origem?: EventoTimelineOrigem },
>(evento: T): T {
  if (
    (evento.tipo === 'nutricao' || evento.origem === 'nutri') &&
    tituloPareceEducadorFisico(evento.titulo)
  ) {
    return {
      ...evento,
      tipo: 'atividade_fisica' as EventoTimelineTipo,
      origem: 'personal' as EventoTimelineOrigem,
    };
  }
  return evento;
}

/**
 * Timeline do educador físico: origem `personal` + legado (nutri + título Educador Físico).
 */
export async function listarEventosProntuarioPersonalPaginado(
  pacienteId: string,
  options?: { pageSize?: number; cursor?: { criadoEmMs: number; id: string } }
): Promise<ProntuarioEventosPage> {
  if (!pacienteId?.trim()) {
    throw new Error('pacienteId é obrigatório para listar eventos do prontuário.');
  }
  const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 30));

  const [personalPage, nutriPage] = await Promise.all([
    listarEventosProntuarioPaginado(pacienteId, { pageSize: 200, origem: 'personal' }),
    listarEventosProntuarioPaginado(pacienteId, { pageSize: 200, origem: 'nutri' }),
  ]);

  const byId = new Map<string, ProntuarioEvento>();
  for (const e of personalPage.eventos) {
    byId.set(e.id, normalizarEventoTimelinePersonal(e));
  }
  for (const e of nutriPage.eventos) {
    if (!tituloPareceEducadorFisico(e.titulo)) continue;
    byId.set(e.id, normalizarEventoTimelinePersonal(e));
  }

  const todos = Array.from(byId.values()).sort(compararEventosTimeline);
  const startIdx = options?.cursor ? indiceAposCursor(todos, options.cursor) : 0;
  const pageEventos = todos.slice(startIdx, startIdx + pageSize);
  const last = pageEventos[pageEventos.length - 1];

  return {
    eventos: pageEventos,
    nextCursor:
      pageEventos.length === pageSize && startIdx + pageSize < todos.length && last
        ? { criadoEmMs: last.criadoEm.getTime(), id: last.id }
        : undefined,
  };
}
