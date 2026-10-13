/**
 * Datas de aplicação por semana alinhadas ao card "Esquema de Doses por Semana" no MetaAdmin.
 * Ordem: data real da dose aplicada (doseAplicada.data) → dataRegistro → datasAplicacaoIndividuais → grade.
 */
import { contaComoDoseAplicada, dataRealAplicacaoSeguimento, registroEvolucaoPorSemana } from '@/utils/evolucaoAplicacaoHelpers';

export type PlanoDatasSlice = {
  startDate?: Date | string | { toDate?: () => Date };
  /** Legado: quando só existir este campo, a primeira aplicação usa esta data (meia-noite local). */
  dataInicioTratamento?: Date | string | { toDate?: () => Date };
  injectionDayOfWeek?: string;
  numeroSemanasTratamento?: number;
  /** Primeira semana do ciclo ativo (1 no protocolo inicial; conclusão anterior + 1 nos seguintes). */
  semanaInicioCiclo?: number;
  semanasCanceladas?: number[];
  datasAplicacaoIndividuais?: Record<string | number, string | undefined>;
};

export type EvolucaoSemanaRef = {
  weekIndex?: number;
  numeroSemana?: number;
  dataRegistro?: unknown;
  doseAplicada?: { quantidade?: number; data?: unknown };
  adherence?: string;
  adesao?: string;
};

function toDateLocal(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v);
  const td = (v as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/** Chave dom|seg|… a partir do dia da semana da data local (data de início = primeiro dia de aplicação). */
export function injectionDayKeyFromLocalDate(d: Date): string {
  const keys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
  return keys[d.getDay()];
}

export const INJECTION_DAY_LABEL_PT: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado',
};

/** Primeira dose: data de início do plano (meia-noite local). O dia da aplicação semanal é o da própria data de início. */
export function primeiraDoseDoPlano(plano: PlanoDatasSlice): Date | null {
  const raw = plano.startDate ?? plano.dataInicioTratamento;
  if (!raw) return null;
  const start = toDateLocal(raw);
  if (!start) return null;
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Primeira semana do ciclo ativo. Protocolo 1 = 1; após conclusão na semana 8, o próximo começa em 9. */
export function semanaInicioCicloDoPlano(plano: PlanoDatasSlice | undefined | null): number {
  const n = Number(plano?.semanaInicioCiclo);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Última semana de aplicação do ciclo ativo (não inclui a semana de Conclusão). */
export function semanaFimAplicacoesDoPlano(plano: PlanoDatasSlice | undefined | null): number {
  const inicio = semanaInicioCicloDoPlano(plano);
  const n = Number(plano?.numeroSemanasTratamento);
  const duracao = Number.isFinite(n) && n >= 1 ? Math.min(200, Math.floor(n)) : 18;
  return inicio + duracao - 1;
}

export function dataGradeSemanal(
  primeiraDose: Date,
  weekIndex: number,
  semanaInicioCiclo = 1
): Date {
  const inicio =
    Number.isFinite(semanaInicioCiclo) && semanaInicioCiclo >= 1
      ? Math.floor(semanaInicioCiclo)
      : 1;
  const dt = new Date(
    primeiraDose.getTime() + (weekIndex - inicio) * 7 * 24 * 60 * 60 * 1000
  );
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function leStringIndividuais(
  individuais: Record<string | number, string | undefined> | undefined,
  weekIndex: number
): string | undefined {
  if (!individuais || typeof individuais !== 'object') return undefined;
  const a = individuais[weekIndex];
  const b = individuais[String(weekIndex) as unknown as number];
  const s = (typeof a === 'string' ? a : typeof b === 'string' ? b : '')?.trim();
  return s || undefined;
}

function leChaveConclusaoLiteral(plano: PlanoDatasSlice): string | undefined {
  const raw = plano.datasAplicacaoIndividuais;
  if (!raw || typeof raw !== 'object') return undefined;
  const v = (raw as Record<string, string>)['conclusao'];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** Última semana de dose não cancelada do ciclo ativo, igual ao Esquema / calendário. */
export function ultimaSemanaNaoCancelada(plano: PlanoDatasSlice): number {
  const inicio = semanaInicioCicloDoPlano(plano);
  const fim = semanaFimAplicacoesDoPlano(plano);
  const cancel = new Set(plano.semanasCanceladas || []);
  let ultima = 0;
  for (let w = inicio; w <= fim; w++) {
    if (!cancel.has(w)) ultima = w;
  }
  return ultima > 0 ? ultima : fim;
}

/** Dias entre a última aplicação do plano e a data de Conclusão (semana seguinte à última dose). */
export const DIAS_APOS_ULTIMA_APLICACAO_PARA_CONCLUSAO = 8;

/** Índice da “Semana Conclusão” no calendário (última dose ativa + 1). */
export function semanaIndexConclusao(plano: PlanoDatasSlice): number {
  return ultimaSemanaNaoCancelada(plano) + 1;
}

/**
 * Data prevista para semanas 1..N (aplicações), sem a linha Conclusão.
 * Mesma prioridade do Esquema: registro → datasAplicacaoIndividuais → grade.
 */
export function dataPrevistaSemanaTratamento(
  plano: PlanoDatasSlice,
  weekIndex: number,
  evolucao: EvolucaoSemanaRef[] | undefined
): Date {
  const inicio = semanaInicioCicloDoPlano(plano);
  const fim = semanaFimAplicacoesDoPlano(plano);
  if (weekIndex < inicio || weekIndex > fim) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  const ev = evolucao || [];
  const reg = registroEvolucaoPorSemana(ev as import('@/types/obesidade').SeguimentoSemanal[], weekIndex);
  if (reg) {
    const dr =
      (contaComoDoseAplicada(reg) ? dataRealAplicacaoSeguimento(reg) : null) ??
      (reg.dataRegistro ? toDateLocal(reg.dataRegistro) : null);
    if (dr) {
      dr.setHours(0, 0, 0, 0);
      return dr;
    }
  }
  const str = leStringIndividuais(plano.datasAplicacaoIndividuais, weekIndex);
  if (str) {
    try {
      const [y, m, d] = str.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) {
        dt.setHours(0, 0, 0, 0);
        return dt;
      }
    } catch {
      /* fallback grade */
    }
  }
  const p = primeiraDoseDoPlano(plano);
  if (!p) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  return dataGradeSemanal(p, weekIndex, inicio);
}

/**
 * Data da semana de Conclusão: registro dessa semana → mapa (índice ou chave `conclusao`) → última dose + 8 dias.
 * Alinha badge roxo do calendário ao Firestore após normalização.
 */
export function dataPrevistaConclusaoComoEsquema(
  plano: PlanoDatasSlice,
  evolucao: EvolucaoSemanaRef[] | undefined
): Date {
  const semConcl = semanaIndexConclusao(plano);
  const ev = evolucao || [];
  const reg = registroEvolucaoPorSemana(ev as import('@/types/obesidade').SeguimentoSemanal[], semConcl);
  if (reg) {
    const dr = dataRealAplicacaoSeguimento(reg) ?? (reg.dataRegistro ? toDateLocal(reg.dataRegistro) : null);
    if (dr) {
      dr.setHours(0, 0, 0, 0);
      return dr;
    }
  }
  const str =
    leStringIndividuais(plano.datasAplicacaoIndividuais, semConcl) || leChaveConclusaoLiteral(plano);
  const parsed = str ? parseYmdLocal(str) : null;
  if (parsed) {
    return parsed;
  }
  const ultima = ultimaSemanaNaoCancelada(plano);
  const base = dataPrevistaSemanaTratamento(plano, ultima, evolucao);
  const d = new Date(base.getTime() + DIAS_APOS_ULTIMA_APLICACAO_PARA_CONCLUSAO * 24 * 60 * 60 * 1000);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Data exibida no Esquema / calendário para qualquer índice de semana.
 * Para a semana de Conclusão (última dose ativa + 1), usa `dataPrevistaConclusaoComoEsquema`.
 */
export function dataPrevistaSemanaComoEsquema(
  plano: PlanoDatasSlice,
  weekIndex: number,
  evolucao: EvolucaoSemanaRef[] | undefined
): Date {
  if (weekIndex === semanaIndexConclusao(plano)) {
    return dataPrevistaConclusaoComoEsquema(plano, evolucao);
  }
  return dataPrevistaSemanaTratamento(plano, weekIndex, evolucao);
}

function parseYmdLocal(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  try {
    const [y, m, d] = t.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return null;
    dt.setHours(0, 0, 0, 0);
    return dt;
  } catch {
    return null;
  }
}

/**
 * Reconstrói `datasAplicacaoIndividuais` para gravar no Firestore com as semanas do ciclo ativo
 * e a semana de Conclusão (`última dose ativa + 1`), alinhada ao calendário:
 * - semanas do ciclo: registro → mapa existente → grade (data de início do ciclo + offset);
 * - conclusão: registro dessa semana → mapa (índice ou `conclusao`) → data da última semana ativa + 8 dias.
 */
export type NormalizarDatasAplicacaoOpts = {
  /** Quando true, semanas sem registro em evolucao usam só a grade (startDate), não o mapa salvo. */
  ignorarMapaExistente?: boolean;
};

export function normalizarDatasAplicacaoIndividuaisParaFirestore(
  plano: PlanoDatasSlice,
  evolucao: EvolucaoSemanaRef[] | undefined,
  opts?: NormalizarDatasAplicacaoOpts
): Record<string, string> | undefined {
  const primeira = primeiraDoseDoPlano(plano);
  if (!primeira) return undefined;

  const ignorarMapa = opts?.ignorarMapaExistente ?? false;
  const inicio = semanaInicioCicloDoPlano(plano);
  const fim = semanaFimAplicacoesDoPlano(plano);
  const ev = evolucao || [];
  const out: Record<string, string> = {};

  for (let w = inicio; w <= fim; w++) {
    const gradeYmd = ymdLocal(dataGradeSemanal(primeira, w, inicio));
    const reg = registroEvolucaoPorSemana(ev as import('@/types/obesidade').SeguimentoSemanal[], w);
    const dr =
      (reg && contaComoDoseAplicada(reg) ? dataRealAplicacaoSeguimento(reg) : null) ??
      (reg?.dataRegistro ? toDateLocal(reg.dataRegistro) : null);
    if (dr && !isNaN(dr.getTime())) {
      dr.setHours(0, 0, 0, 0);
      out[String(w)] = ymdLocal(dr);
      continue;
    }
    if (!ignorarMapa) {
      const inc = leStringIndividuais(plano.datasAplicacaoIndividuais, w);
      const parsed = inc ? parseYmdLocal(inc) : null;
      if (parsed) {
        out[String(w)] = ymdLocal(parsed);
        continue;
      }
    }
    out[String(w)] = gradeYmd;
  }

  const semConcl = semanaIndexConclusao(plano);
  const regC = registroEvolucaoPorSemana(ev as import('@/types/obesidade').SeguimentoSemanal[], semConcl);
  let concYmd: string | undefined;
  const drC =
    (regC ? dataRealAplicacaoSeguimento(regC) : null) ??
    (regC?.dataRegistro ? toDateLocal(regC.dataRegistro) : null);
  if (drC && !isNaN(drC.getTime())) {
    drC.setHours(0, 0, 0, 0);
    concYmd = ymdLocal(drC);
  }
  if (!concYmd && !ignorarMapa) {
    const incC = leStringIndividuais(plano.datasAplicacaoIndividuais, semConcl) || leChaveConclusaoLiteral(plano);
    const parsedC = incC ? parseYmdLocal(incC) : null;
    if (parsedC) concYmd = ymdLocal(parsedC);
  }
  if (!concYmd) {
    const ultima = ultimaSemanaNaoCancelada(plano);
    const ultimaYmd = out[String(ultima)];
    const baseUlt = parseYmdLocal(ultimaYmd) ?? primeira;
    const dConc = new Date(baseUlt.getTime() + DIAS_APOS_ULTIMA_APLICACAO_PARA_CONCLUSAO * 24 * 60 * 60 * 1000);
    dConc.setHours(0, 0, 0, 0);
    concYmd = ymdLocal(dConc);
  }
  out[String(semConcl)] = concYmd;

  return out;
}

/** Reconstrói datas só a partir de evolucao + grade (descarta mapa antigo). */
export function reconstruirDatasAplicacaoIndividuaisDaGrade(
  plano: PlanoDatasSlice,
  evolucao?: EvolucaoSemanaRef[]
): Record<string, string> | undefined {
  return normalizarDatasAplicacaoIndividuaisParaFirestore(plano, evolucao ?? [], {
    ignorarMapaExistente: true,
  });
}

export function mesclarPlanoComDatasReconstruidas(
  planoAtual: PlanoDatasSlice | undefined,
  patch: Partial<PlanoDatasSlice>,
  evolucao?: EvolucaoSemanaRef[],
  opts?: NormalizarDatasAplicacaoOpts
): PlanoDatasSlice {
  const merged = { ...(planoAtual ?? {}), ...patch } as PlanoDatasSlice;
  const datas = normalizarDatasAplicacaoIndividuaisParaFirestore(merged, evolucao ?? [], {
    ignorarMapaExistente: opts?.ignorarMapaExistente ?? true,
  });
  return { ...merged, datasAplicacaoIndividuais: datas };
}

/**
 * Atualiza `numeroSemanasTratamento` e reconstrói `datasAplicacaoIndividuais`
 * para o novo N: mantém overrides das semanas que continuam no plano, gera as
 * novas pela grade, remove semanas extras e recalcula a data de Conclusão.
 * Sem isso, o calendário da Evolução/Seguimento fica com o mapa antigo.
 */
export function atualizarNumeroSemanasDoPlano(
  plano: PlanoDatasSlice,
  numeroSemanas: number,
  evolucao?: EvolucaoSemanaRef[]
): PlanoDatasSlice {
  const n = Math.min(200, Math.max(1, Math.floor(numeroSemanas)));
  const inicio = semanaInicioCicloDoPlano(plano);
  const fim = inicio + n - 1;
  const oldNVal = Number(plano.numeroSemanasTratamento);
  const oldN = Number.isFinite(oldNVal) && oldNVal >= 1 ? Math.floor(oldNVal) : 0;
  const oldConcl = oldN >= 1 ? semanaIndexConclusao(plano) : null;

  const individuais: Record<string, string> = {};
  const raw = plano.datasAplicacaoIndividuais;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'conclusao') continue;
      const num = Number(k);
      if (!Number.isFinite(num) || num < inicio || num > fim) continue;
      if (oldConcl != null && num === oldConcl) continue;
      if (typeof v !== 'string' || !v.trim()) continue;
      individuais[String(num)] = v.trim();
    }
  }

  const canceladas = (plano.semanasCanceladas || []).filter((w) => w >= inicio && w <= fim);

  return mesclarPlanoComDatasReconstruidas(
    plano,
    {
      numeroSemanasTratamento: n,
      datasAplicacaoIndividuais: individuais,
      semanasCanceladas: canceladas.length > 0 ? canceladas : undefined,
    },
    evolucao,
    { ignorarMapaExistente: false }
  );
}
