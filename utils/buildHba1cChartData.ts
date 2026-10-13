import { primeiraDoseDoPlano } from '@/utils/datasAplicacaoSemanaPlano';

type ExameHbA1cLike = {
  dataColeta?: unknown;
  hemoglobinaGlicada?: number | null;
};

type EvolucaoHbA1cLike = {
  weekIndex?: number;
  numeroSemana?: number;
  hba1c?: number | null;
};

type PlanoInicioLike = {
  startDate?: unknown;
  dataInicioTratamento?: unknown;
  injectionDayOfWeek?: string;
};

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const td = (v as { toDate?: () => Date })?.toDate?.();
  if (td && !Number.isNaN(td.getTime())) return td;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseHbA1c(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Converte data de coleta do exame em índice de semana do tratamento (1-based).
 * Exames anteriores ao início entram na semana 1 (baseline).
 */
export function weekIndexFromDataColeta(
  dataColeta: Date,
  dataInicio: Date | null,
  maxSemanas: number
): number {
  if (!dataInicio) return 1;
  const inicio = new Date(dataInicio);
  inicio.setHours(0, 0, 0, 0);
  const coleta = new Date(dataColeta);
  coleta.setHours(0, 0, 0, 0);
  const diffDias = Math.floor((coleta.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 1;
  const week = Math.floor(diffDias / 7) + 1;
  if (maxSemanas > 0) return Math.min(Math.max(1, week), maxSemanas);
  return Math.max(1, week);
}

export type Hba1cChartPoint = {
  semana: number;
  hba1c: number | null;
  faixaIdealMin: number;
  faixaIdealMax: number;
  /** Origem do valor real plotado (para tooltip/debug). */
  fonte?: 'exame' | 'seguimento' | null;
};

/**
 * Série do gráfico HbA1c da Evolução/Seguimento:
 * prioriza Hemoglobina Glicada dos exames laboratoriais (mapeada por data de coleta → semana),
 * e usa o valor do seguimento semanal só se não houver exame naquela semana.
 */
export function buildHba1cChartData(params: {
  exames?: ExameHbA1cLike[] | null;
  evolucao?: EvolucaoHbA1cLike[] | null;
  planoTerapeutico?: PlanoInicioLike | null;
  expectedWeekIndexes: number[];
  faixaIdealMin: number;
  faixaIdealMax: number;
}): Hba1cChartPoint[] {
  const {
    exames = [],
    evolucao = [],
    planoTerapeutico,
    expectedWeekIndexes,
    faixaIdealMin,
    faixaIdealMax,
  } = params;

  const maxSemanas =
    expectedWeekIndexes.length > 0
      ? Math.max(...expectedWeekIndexes)
      : Number((planoTerapeutico as { numeroSemanasTratamento?: number } | null)?.numeroSemanasTratamento) ||
        18;

  const dataInicio = planoTerapeutico
    ? primeiraDoseDoPlano(planoTerapeutico as Parameters<typeof primeiraDoseDoPlano>[0])
    : null;

  /** Semana → valor HbA1c do exame (último exame da semana prevalece). */
  const hba1cPorSemanaExame = new Map<number, number>();
  const examesComHb = (exames || [])
    .map((ex) => {
      const valor = parseHbA1c(ex.hemoglobinaGlicada);
      const data = toDate(ex.dataColeta);
      return valor != null && data ? { valor, data } : null;
    })
    .filter((x): x is { valor: number; data: Date } => !!x)
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  if (dataInicio) {
    for (const ex of examesComHb) {
      const semana = weekIndexFromDataColeta(ex.data, dataInicio, maxSemanas);
      hba1cPorSemanaExame.set(semana, ex.valor);
    }
  } else {
    // Sem data de início do plano: espalha exames em semanas 1..N pela ordem cronológica
    examesComHb.forEach((ex, idx) => {
      hba1cPorSemanaExame.set(idx + 1, ex.valor);
    });
  }

  const hba1cPorSemanaSeguimento = new Map<number, number>();
  for (const reg of evolucao || []) {
    const semana = reg.weekIndex ?? reg.numeroSemana ?? 0;
    const valor = parseHbA1c(reg.hba1c);
    if (semana > 0 && valor != null) hba1cPorSemanaSeguimento.set(semana, valor);
  }

  const semanas =
    expectedWeekIndexes.length > 0
      ? [...expectedWeekIndexes].sort((a, b) => a - b)
      : Array.from(
          new Set([...hba1cPorSemanaExame.keys(), ...hba1cPorSemanaSeguimento.keys()])
        ).sort((a, b) => a - b);

  // Garante que semanas só com exame (fora da expectedCurve, raro) ainda entrem
  for (const s of hba1cPorSemanaExame.keys()) {
    if (!semanas.includes(s)) semanas.push(s);
  }
  semanas.sort((a, b) => a - b);

  return semanas.map((semana) => {
    const doExame = hba1cPorSemanaExame.get(semana) ?? null;
    const doSeguimento = hba1cPorSemanaSeguimento.get(semana) ?? null;
    const hba1c = doExame ?? doSeguimento;
    return {
      semana,
      hba1c,
      faixaIdealMin,
      faixaIdealMax,
      fonte: doExame != null ? 'exame' : doSeguimento != null ? 'seguimento' : null,
    };
  });
}

export function temHbA1cNosExames(exames?: ExameHbA1cLike[] | null): boolean {
  return (exames || []).some((ex) => parseHbA1c(ex.hemoglobinaGlicada) != null);
}

export function primeiroHbA1cDeExames(exames?: ExameHbA1cLike[] | null): number | null {
  const ordenados = (exames || [])
    .map((ex) => {
      const valor = parseHbA1c(ex.hemoglobinaGlicada);
      const data = toDate(ex.dataColeta);
      return valor != null ? { valor, t: data?.getTime() ?? 0 } : null;
    })
    .filter((x): x is { valor: number; t: number } => !!x)
    .sort((a, b) => a.t - b.t);
  return ordenados[0]?.valor ?? null;
}
