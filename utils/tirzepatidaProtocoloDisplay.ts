import type { HistoricoProtocoloTirzepatida, PacienteCompleto, PlanoTerapeutico, SeguimentoSemanal } from '@/types/obesidade';
import { semanaIndexConclusao, semanaInicioCicloDoPlano } from '@/utils/datasAplicacaoSemanaPlano';
import {
  contaComoDoseAplicada,
  dataRealAplicacaoSeguimento,
  registroEvolucaoPorSemana,
} from '@/utils/evolucaoAplicacaoHelpers';
import { buildSemanasEsquemaDoses, listarAplicacoesEsquemaComConclusao } from '@/utils/esquemaDosesSemana';
import { montarPacienteDoProtocoloArquivado } from '@/utils/tirzepatidaNovoProtocolo';

export type ProtocoloTirzepatidaResumo = {
  indice: number;
  ativo: boolean;
  semanaInicioCiclo: number;
  numeroSemanasTratamento: number;
  metas?: PlanoTerapeutico['metas'];
  conclusaoTratamento?: Record<string, unknown>;
  startDate?: Date | string;
  dataInicioTratamento?: Date | string;
  injectionDayOfWeek?: PlanoTerapeutico['injectionDayOfWeek'];
  currentDoseMg?: PlanoTerapeutico['currentDoseMg'];
  esquemaDosesCustomizado?: PlanoTerapeutico['esquemaDosesCustomizado'];
  semanasCanceladas?: number[];
};

function duracaoSemanas(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v >= 1 ? Math.min(200, Math.floor(v)) : 18;
}

/**
 * Primeira semana do ciclo vigente a partir do histórico arquivado.
 * Protocolo 1 com 6 semanas → conclusão na 7 → protocolo 2 começa na 8.
 */
function inferirSemanaInicioCicloAtivo(
  historico: HistoricoProtocoloTirzepatida[] | undefined | null
): number {
  if (!historico?.length) return 1;
  const sorted = [...historico].sort(
    (a, b) => (Number(a.indice) || 0) - (Number(b.indice) || 0)
  );
  let proximoInicio = 1;
  for (const snap of sorted) {
    const inicioSnap =
      Number(snap.semanaInicioCiclo) >= 1
        ? Math.floor(Number(snap.semanaInicioCiclo))
        : proximoInicio;
    proximoInicio = inicioSnap + duracaoSemanas(snap.numeroSemanasTratamento) + 1;
  }
  return proximoInicio;
}

function resumoDoSnapshot(snap: HistoricoProtocoloTirzepatida): ProtocoloTirzepatidaResumo {
  return {
    indice: Number(snap.indice) >= 1 ? Math.floor(Number(snap.indice)) : 1,
    ativo: false,
    semanaInicioCiclo: Number(snap.semanaInicioCiclo) >= 1 ? Math.floor(Number(snap.semanaInicioCiclo)) : 1,
    numeroSemanasTratamento: duracaoSemanas(snap.numeroSemanasTratamento),
    metas: snap.metas,
    conclusaoTratamento: snap.conclusaoTratamento,
    startDate: snap.startDate,
    dataInicioTratamento: snap.dataInicioTratamento,
    injectionDayOfWeek: snap.injectionDayOfWeek,
    currentDoseMg: snap.currentDoseMg,
    esquemaDosesCustomizado: snap.esquemaDosesCustomizado,
    semanasCanceladas: snap.semanasCanceladas,
  };
}

function resumoDoCicloAtivo(paciente: PacienteCompleto, indice: number): ProtocoloTirzepatidaResumo {
  const plano = paciente.planoTerapeutico;
  const historico = plano?.historicoProtocolosTirzepatida || [];
  const stored = semanaInicioCicloDoPlano(plano);
  const inferida = inferirSemanaInicioCicloAtivo(historico);
  const semanaInicioCiclo =
    historico.length > 0 && stored <= 1 && inferida > 1 ? inferida : stored;
  return {
    indice,
    ativo: true,
    semanaInicioCiclo,
    numeroSemanasTratamento: duracaoSemanas(plano?.numeroSemanasTratamento),
    metas: plano?.metas,
    conclusaoTratamento: plano?.conclusaoTratamento as Record<string, unknown> | undefined,
    startDate: plano?.startDate,
    dataInicioTratamento: plano?.dataInicioTratamento,
    injectionDayOfWeek: plano?.injectionDayOfWeek,
    currentDoseMg: plano?.currentDoseMg ?? plano?.doseAtual?.quantidade,
    esquemaDosesCustomizado: plano?.esquemaDosesCustomizado,
    semanasCanceladas: plano?.semanasCanceladas,
  };
}

/** Protocolos arquivados + ciclo ativo (índice = historico.length + 1). */
export function listarProtocolosTirzepatida(paciente: PacienteCompleto | null | undefined): ProtocoloTirzepatidaResumo[] {
  const historico = paciente?.planoTerapeutico?.historicoProtocolosTirzepatida || [];
  const itens = historico.map(resumoDoSnapshot);
  itens.push(resumoDoCicloAtivo(paciente as PacienteCompleto, historico.length + 1));
  return itens.sort((a, b) => a.indice - b.indice);
}

export function semanaRelativaNoProtocolo(weekIndex: number, semanaInicioCiclo: number): number {
  const w = Number(weekIndex);
  const inicio = Number(semanaInicioCiclo);
  const week = Number.isFinite(w) && w >= 1 ? Math.floor(w) : 1;
  const start = Number.isFinite(inicio) && inicio >= 1 ? Math.floor(inicio) : 1;
  return Math.max(1, week - start + 1);
}

/** Inverso de semanaRelativaNoProtocolo: S1 do protocolo 2 com início 8 → weekIndex 8. */
export function weekIndexGlobalDaSemanaRelativa(
  semanaRelativa: number,
  semanaInicioCiclo: number
): number {
  const rel = Number(semanaRelativa);
  const inicio = Number(semanaInicioCiclo);
  const r = Number.isFinite(rel) && rel >= 1 ? Math.floor(rel) : 1;
  const start = Number.isFinite(inicio) && inicio >= 1 ? Math.floor(inicio) : 1;
  return start + r - 1;
}

/** Qual protocolo contém o weekIndex global (ex.: semana 8 = 1º do protocolo 2). */
export function protocoloDaSemanaGlobal(
  paciente: PacienteCompleto | null | undefined,
  weekIndex: number
): ProtocoloTirzepatidaResumo {
  const lista = listarProtocolosTirzepatida(paciente);
  const w = Number(weekIndex);
  const week = Number.isFinite(w) && w >= 1 ? Math.floor(w) : 1;
  let found = lista[0];
  for (const p of lista) {
    if (week >= p.semanaInicioCiclo) found = p;
  }
  return found;
}

export function protocoloPorIndice(
  paciente: PacienteCompleto | null | undefined,
  indice?: number
): ProtocoloTirzepatidaResumo {
  const lista = listarProtocolosTirzepatida(paciente);
  const last = lista[lista.length - 1];
  if (indice == null) return last;
  return lista.find((p) => p.indice === indice) ?? last;
}

export type EstadoFaixaAplicacao = 'aplicada' | 'pulada' | 'pendente';

export type SegmentoFaixaAplicacao = {
  estado: EstadoFaixaAplicacao;
  quantidade: number;
};

export type ProgressoAplicacoesProtocolo = {
  total: number;
  /** Semanas com dose registrada. */
  aplicadas: number;
  /** Semanas ainda sem registro (total − aplicadas). */
  pendentes: number;
  percAplicadas: number;
  percPendentes: number;
  /**
   * Semanas cujo dia já chegou, com ou sem registro.
   * É o número do texto (ex.: na semana 14 de 20, posição 14).
   */
  posicao: number;
  /** Semanas à frente, cujo dia ainda não chegou. */
  pendentesAFrente: number;
  /** Trechos da barra na ordem das semanas: verde, vermelho, laranja. */
  segmentos: SegmentoFaixaAplicacao[];
};

function ehAdesaoPerdida(r: { adherence?: string; adesao?: string } | null | undefined): boolean {
  if (!r) return false;
  return r.adherence === 'MISSED' || String(r.adesao || '').toLowerCase() === 'esquecida';
}

function progressoAplicacoesVazio(): ProgressoAplicacoesProtocolo {
  return {
    total: 0,
    aplicadas: 0,
    pendentes: 0,
    percAplicadas: 0,
    percPendentes: 0,
    posicao: 0,
    pendentesAFrente: 0,
    segmentos: [],
  };
}

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

function agruparFaixa(estados: EstadoFaixaAplicacao[]): SegmentoFaixaAplicacao[] {
  const segmentos: SegmentoFaixaAplicacao[] = [];
  for (const estado of estados) {
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.estado === estado) ultimo.quantidade += 1;
    else segmentos.push({ estado, quantidade: 1 });
  }
  return segmentos;
}

function pacienteParaCalendarioDoProtocolo(
  paciente: PacienteCompleto,
  proto: ProtocoloTirzepatidaResumo
): PacienteCompleto {
  if (proto.ativo) return paciente;
  const plano = paciente.planoTerapeutico || { metas: {} };
  const start = toDatePlano(proto.startDate);
  const inicioTratamento = toDatePlano(proto.dataInicioTratamento);
  return {
    ...paciente,
    planoTerapeutico: {
      ...plano,
      ...(start ? { startDate: start } : {}),
      ...(inicioTratamento ? { dataInicioTratamento: inicioTratamento } : {}),
      ...(proto.injectionDayOfWeek ? { injectionDayOfWeek: proto.injectionDayOfWeek } : {}),
      numeroSemanasTratamento: proto.numeroSemanasTratamento,
      semanaInicioCiclo: proto.semanaInicioCiclo,
      ...(proto.currentDoseMg != null ? { currentDoseMg: proto.currentDoseMg } : {}),
      esquemaDosesCustomizado: proto.esquemaDosesCustomizado,
      semanasCanceladas: proto.semanasCanceladas,
    },
  };
}

function toDatePlano(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Aplicadas / total do protocolo vigente (último ciclo de Tirzepatida). */
export function progressoAplicacoesProtocoloAtivo(
  paciente: PacienteCompleto | null | undefined,
  hoje: Date = new Date()
): ProgressoAplicacoesProtocolo {
  const n = Number(paciente?.planoTerapeutico?.numeroSemanasTratamento);
  if (!Number.isFinite(n) || n < 1) return progressoAplicacoesVazio();
  const lista = listarProtocolosTirzepatida(paciente);
  const proto = lista.find((p) => p.ativo) ?? lista[lista.length - 1];
  if (!proto) return progressoAplicacoesVazio();
  return progressoAplicacoesDoProtocolo(paciente, proto, hoje);
}

/** Aplicadas / total do protocolo (não do índice global). */
export function progressoAplicacoesDoProtocolo(
  paciente: PacienteCompleto | null | undefined,
  proto: ProtocoloTirzepatidaResumo,
  hoje: Date = new Date()
): ProgressoAplicacoesProtocolo {
  const inicio = proto.semanaInicioCiclo;
  const fim = proto.numeroSemanasTratamento >= 1 ? inicio + proto.numeroSemanasTratamento - 1 : 0;
  const cancel = new Set(proto.semanasCanceladas || []);
  let total = 0;
  for (let w = inicio; w <= fim; w++) {
    if (!cancel.has(w)) total++;
  }
  const semanaConclusao = fim + 1;
  const semanasComDose = new Set<number>();
  for (const r of paciente?.evolucaoSeguimento || []) {
    const id = typeof r.id === 'string' ? r.id : '';
    if (id.startsWith('seguimento-conclusao-')) continue;
    const comentario = String(r.comentarioMedico || '').toLowerCase();
    const wi = weekIndexDoRegistro(r);
    if (wi === semanaConclusao) continue;
    if (comentario.includes('conclusão')) continue;
    if (ehAdesaoPerdida(r)) continue;
    if (wi < inicio || wi > fim || cancel.has(wi)) continue;
    if (contaComoDoseAplicada(r)) semanasComDose.add(wi);
  }
  const aplicadas = Math.min(total, semanasComDose.size);
  const pendentes = Math.max(0, total - aplicadas);
  const percAplicadas = total > 0 ? Math.min(100, (aplicadas / total) * 100) : 0;

  const hojeDia = inicioDoDia(hoje);
  const built = paciente ? buildSemanasEsquemaDoses(pacienteParaCalendarioDoProtocolo(paciente, proto)) : null;
  const porSemana = new Map<number, { data: Date; aplicada: boolean }>();
  for (const item of built?.semanas || []) {
    if (item.isConclusao || item.isCancelada) continue;
    if (item.semana < inicio || item.semana > fim || cancel.has(item.semana)) continue;
    porSemana.set(item.semana, {
      data: item.data,
      aplicada: item.temDoseAplicada || semanasComDose.has(item.semana),
    });
  }

  const estados: EstadoFaixaAplicacao[] = [];
  let posicao = 0;
  for (let w = inicio; w <= fim; w++) {
    if (cancel.has(w)) continue;
    const item = porSemana.get(w);
    const aplicada = item?.aplicada || semanasComDose.has(w);
    const dataDia = item ? inicioDoDia(item.data) : null;
    const diaChegou = dataDia != null && dataDia <= hojeDia;
    const diaPassou = dataDia != null && dataDia < hojeDia;
    if (aplicada) estados.push('aplicada');
    else if (diaPassou) estados.push('pulada');
    else estados.push('pendente');
    if (diaChegou || (aplicada && dataDia == null)) posicao += 1;
  }
  posicao = Math.min(total, posicao);

  return {
    total,
    aplicadas,
    pendentes,
    percAplicadas,
    percPendentes: Math.max(0, 100 - percAplicadas),
    posicao,
    pendentesAFrente: Math.max(0, total - posicao),
    segmentos: agruparFaixa(estados),
  };
}

/**
 * Miligramas já usados no protocolo.
 * Semana com registro entra com a dose aplicada.
 * Semana cujo dia já chegou, mesmo sem registro do paciente, entra com a dose do esquema.
 * Semanas futuras, canceladas e adesão perdida ficam de fora.
 */
export function totalMgRealizadoProtocolo(
  paciente: PacienteCompleto | null | undefined,
  proto: ProtocoloTirzepatidaResumo,
  hoje: Date = new Date()
): number {
  if (!paciente) return 0;
  const inicio = proto.semanaInicioCiclo;
  const fim = proto.numeroSemanasTratamento >= 1 ? inicio + proto.numeroSemanasTratamento - 1 : 0;
  const hojeDia = inicioDoDia(hoje);
  const built = buildSemanasEsquemaDoses(pacienteParaCalendarioDoProtocolo(paciente, proto));

  if (!built) {
    let total = 0;
    for (const r of paciente.evolucaoSeguimento || []) {
      if (ehAdesaoPerdida(r)) continue;
      const wi = weekIndexDoRegistro(r);
      if (wi < inicio || wi > fim) continue;
      if (!contaComoDoseAplicada(r)) continue;
      const q = Number(r.doseAplicada?.quantidade);
      if (Number.isFinite(q) && q > 0) total += q;
    }
    return Math.round(total * 100) / 100;
  }

  let total = 0;
  for (const item of built.semanas) {
    if (item.isConclusao || item.isCancelada) continue;
    if (item.semana < inicio || item.semana > fim) continue;
    const registro = registroEvolucaoPorSemana(paciente.evolucaoSeguimento, item.semana);
    if (ehAdesaoPerdida(registro)) continue;
    const dataReal = item.temDoseAplicada ? dataRealAplicacaoSeguimento(registro) : null;
    const dataRef = dataReal ?? item.data;
    if (inicioDoDia(dataRef) > hojeDia) continue;
    if (item.temDoseAplicada && item.doseAplicadaMg != null && item.doseAplicadaMg > 0) {
      total += item.doseAplicadaMg;
    } else {
      total += item.doseAtual || 0;
    }
  }
  return Math.round(total * 100) / 100;
}

/** Rótulo compacto no card do calendário: "1/6" ou "1/6 · P2". */
export function rotuloSemanaCalendario(
  weekIndex: number,
  proto: ProtocoloTirzepatidaResumo
): { semanaRelativa: number; texto: string } {
  const semanaRelativa = semanaRelativaNoProtocolo(weekIndex, proto.semanaInicioCiclo);
  const total = proto.numeroSemanasTratamento;
  const base = total > 0 ? `${semanaRelativa}/${total}` : String(semanaRelativa);
  const texto = proto.indice > 1 ? `${base} · P${proto.indice}` : base;
  return { semanaRelativa, texto };
}

/** Semana de conclusão do ciclo (global): última aplicação + 1. */
export function semanaConclusaoDoProtocolo(proto: ProtocoloTirzepatidaResumo): number {
  const n = proto.numeroSemanasTratamento;
  return proto.semanaInicioCiclo + (n >= 1 ? n : 0);
}

function semanaDoRegistroEvolucao(e: { weekIndex?: number; numeroSemana?: number }): number {
  const n = Number(e.weekIndex ?? e.numeroSemana ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Peso e circunferência acumulados do protocolo: último valor do ciclo menos a base.
 * A base é o último registro anterior ao protocolo, as medidas iniciais no protocolo 1,
 * ou o primeiro ponto do ciclo quando o protocolo começa depois da semana 1.
 */
export function variacaoAcumuladaDoProtocolo(
  paciente: PacienteCompleto | null | undefined,
  proto: Pick<ProtocoloTirzepatidaResumo, 'semanaInicioCiclo' | 'numeroSemanasTratamento'>
): { peso: number | null; circunferencia: number | null } {
  const evolucao = paciente?.evolucaoSeguimento || [];
  const medidas = paciente?.dadosClinicos?.medidasIniciais;
  const inicio = proto.semanaInicioCiclo;
  const ate = semanaConclusaoDoProtocolo(proto as ProtocoloTirzepatidaResumo);

  const delta = (campo: 'peso' | 'circunferenciaAbdominal', inicial?: number): number | null => {
    const antes = evolucao
      .filter((e) => semanaDoRegistroEvolucao(e) > 0 && semanaDoRegistroEvolucao(e) < inicio && (e[campo] || 0) > 0)
      .sort((a, b) => semanaDoRegistroEvolucao(a) - semanaDoRegistroEvolucao(b));
    const noCiclo = evolucao
      .filter((e) => {
        const semana = semanaDoRegistroEvolucao(e);
        return semana >= inicio && semana <= ate && (e[campo] || 0) > 0;
      })
      .sort((a, b) => semanaDoRegistroEvolucao(a) - semanaDoRegistroEvolucao(b));
    const baseline = antes.length
      ? antes[antes.length - 1][campo] || 0
      : inicio <= 1
        ? inicial || noCiclo[0]?.[campo] || 0
        : noCiclo.length >= 2
          ? noCiclo[0][campo] || 0
          : 0;
    const ultimo = noCiclo.length ? noCiclo[noCiclo.length - 1][campo] || 0 : 0;
    if (!(ultimo > 0 && baseline > 0)) return null;
    return ultimo - baseline;
  };

  return {
    peso: delta('peso', medidas?.peso),
    circunferencia: delta('circunferenciaAbdominal', medidas?.circunferenciaAbdominal),
  };
}

export function weekIndexPertenceAoProtocolo(
  weekIndex: number,
  proto: ProtocoloTirzepatidaResumo
): boolean {
  const w = Number(weekIndex);
  if (!Number.isFinite(w) || w < 1) return false;
  const week = Math.floor(w);
  return week >= proto.semanaInicioCiclo && week <= semanaConclusaoDoProtocolo(proto);
}

export function agruparItensPorProtocolo<T>(
  paciente: PacienteCompleto | null | undefined,
  items: T[],
  getWeekIndex: (item: T) => number
): { proto: ProtocoloTirzepatidaResumo; items: T[] }[] {
  return listarProtocolosTirzepatida(paciente).map((proto) => ({
    proto,
    items: items.filter((it) => weekIndexPertenceAoProtocolo(getWeekIndex(it), proto)),
  }));
}

/** Paciente com o plano do ciclo (arquivado ou ativo) para listar semanas daquele protocolo. */
export function aplicarVistaDeProtocolo(
  paciente: PacienteCompleto,
  proto: ProtocoloTirzepatidaResumo
): PacienteCompleto {
  if (proto.ativo) return paciente;
  const snap = (paciente.planoTerapeutico?.historicoProtocolosTirzepatida || []).find(
    (h) => (h.indice || 1) === proto.indice
  );
  return snap ? montarPacienteDoProtocoloArquivado(paciente, snap) : paciente;
}

/** Badge do calendário da timeline: "S1" ou "S1·P2". */
export function rotuloSemanaBadgeCalendario(
  weekIndex: number,
  proto: ProtocoloTirzepatidaResumo
): string {
  const rel = semanaRelativaNoProtocolo(weekIndex, proto.semanaInicioCiclo);
  return proto.indice > 1 ? `S${rel}·P${proto.indice}` : `S${rel}`;
}

export type SemanaTimelineProtocoloItem = {
  weekIndex: number;
  data: Date;
  dose: number;
  localAplicacao: string;
  registro: SeguimentoSemanal | null;
};

function weekIndexDoRegistro(e: SeguimentoSemanal): number {
  const n = Number(
    (e as { weekIndex?: number; numeroSemana?: number }).weekIndex ??
      (e as { weekIndex?: number; numeroSemana?: number }).numeroSemana ??
      0
  );
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function dataDoRegistro(e: SeguimentoSemanal): Date {
  const raw =
    (e as { doseAplicada?: { data?: unknown } }).doseAplicada?.data ??
    (e as { dataRegistro?: unknown }).dataRegistro;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  const td = (raw as { toDate?: () => Date } | undefined)?.toDate?.();
  if (td && !isNaN(td.getTime())) return td;
  const d = raw != null ? new Date(raw as string | number) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Semanas da timeline por protocolo — inclui as planejadas (como no mobile),
 * mesmo sem registro de evolução ainda.
 */
export function listarSemanasTimelinePorProtocolo(
  paciente: PacienteCompleto | null | undefined
): { proto: ProtocoloTirzepatidaResumo; items: SemanaTimelineProtocoloItem[] }[] {
  if (!paciente) return [];
  const evolucao = paciente.evolucaoSeguimento || [];
  return listarProtocolosTirzepatida(paciente).map((proto) => {
    const vista = aplicarVistaDeProtocolo(paciente, proto);
    const planejadas = listarAplicacoesEsquemaComConclusao(vista).filter((a) =>
      weekIndexPertenceAoProtocolo(a.semana, proto)
    );
    const byWeek = new Map<number, SemanaTimelineProtocoloItem>();
    for (const a of planejadas) {
      const registro = evolucao.find((e) => weekIndexDoRegistro(e) === a.semana) ?? null;
      byWeek.set(a.semana, {
        weekIndex: a.semana,
        data: a.data,
        dose: a.dose,
        localAplicacao: a.localAplicacao,
        registro,
      });
    }
    for (const e of evolucao) {
      const w = weekIndexDoRegistro(e);
      if (!weekIndexPertenceAoProtocolo(w, proto) || byWeek.has(w)) continue;
      byWeek.set(w, {
        weekIndex: w,
        data: dataDoRegistro(e),
        dose: Number((e as { doseAplicada?: { quantidade?: number } }).doseAplicada?.quantidade) || 0,
        localAplicacao: String((e as { localAplicacao?: string }).localAplicacao || ''),
        registro: e,
      });
    }
    const items = [...byWeek.values()].sort((a, b) => a.weekIndex - b.weekIndex);
    return { proto, items };
  });
}

function ehRegistroConclusaoLeve(e: {
  id?: unknown;
  comentarioMedico?: unknown;
}): boolean {
  if (typeof e.id === 'string' && e.id.startsWith('seguimento-conclusao-')) return true;
  const cm = String(e.comentarioMedico || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return cm.includes('semana de conclusao') || cm.includes('conclusao do tratamento');
}

export type ContextoConclusaoCicloAtivo = {
  proto: ProtocoloTirzepatidaResumo;
  semanaGlobal: number;
  semanaRelativa: number;
  registro: SeguimentoSemanal | null;
};

/** Protocolo vigente + semana de conclusão (global e 1..X) e o registro só desse ciclo. */
export function contextoConclusaoCicloAtivo(
  paciente: PacienteCompleto | null | undefined
): ContextoConclusaoCicloAtivo {
  const lista = listarProtocolosTirzepatida(paciente);
  const proto = lista[lista.length - 1];
  const plano = paciente?.planoTerapeutico;
  const semanaGlobal = plano ? semanaIndexConclusao(plano) : semanaConclusaoDoProtocolo(proto);
  const semanaRelativa = semanaRelativaNoProtocolo(semanaGlobal, proto.semanaInicioCiclo);
  const evolucao = paciente?.evolucaoSeguimento || [];
  const registro =
    evolucao.find((e) => ehRegistroConclusaoLeve(e) && weekIndexDoRegistro(e) === semanaGlobal) ??
    null;
  return { proto, semanaGlobal, semanaRelativa, registro };
}

