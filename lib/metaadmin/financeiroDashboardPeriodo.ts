export type FinanceiroPeriodo = '7d' | '30d' | '60d' | '90d' | '12m' | 'total';

export type FinanceiroDiaTotais = {
  recebido: number;
  vendido: number;
  aberto: number;
};

export type MapaPorDia = {
  get(key: string): FinanceiroDiaTotais | undefined;
  forEach(callback: (totais: FinanceiroDiaTotais, key: string) => void): void;
};

export type DetalhesPorDia = {
  get(key: string): { vendido?: Array<{ valor?: number }> } | undefined;
};

export type VariacaoFinanceira = {
  kind: 'up' | 'down' | 'flat' | 'sem-base';
  percentual: number | null;
  delta: number;
};

export const PERIODOS_FINANCEIRO: { id: FinanceiroPeriodo; label: string; dias?: number }[] = [
  { id: '7d', label: '7d', dias: 7 },
  { id: '30d', label: '30d', dias: 30 },
  { id: '60d', label: '60d', dias: 60 },
  { id: '90d', label: '90d', dias: 90 },
  { id: '12m', label: '12m' },
  { id: 'total', label: 'Total' },
];

export type PontoFinanceiro = {
  label: string;
  vendido: number;
  recebido: number;
  aberto: number;
};

export function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function cadaDia(start: Date, end: Date): Date[] {
  const dias: Date[] = [];
  for (let cursor = inicioDoDia(start); cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    dias.push(cursor);
  }
  return dias;
}

function cadaMes(start: Date, end: Date): Date[] {
  const meses: Date[] = [];
  let ano = start.getFullYear();
  let mes = start.getMonth();
  const fimAno = end.getFullYear();
  const fimMes = end.getMonth();
  while (ano < fimAno || (ano === fimAno && mes <= fimMes)) {
    meses.push(new Date(ano, mes, 1));
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }
  return meses;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const data = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Do primeiro ao último dia que existe no mapa, inclusive vencimentos futuros. */
export function intervaloTotal(mapa: MapaPorDia, hoje: Date): { inicio: Date; fim: Date } {
  let min: string | null = null;
  let max: string | null = null;
  mapa.forEach((_totais, key) => {
    if (!parseDateKey(key)) return;
    if (!min || key < min) min = key;
    if (!max || key > max) max = key;
  });
  if (!min || !max) {
    const dia = inicioDoDia(hoje);
    return { inicio: dia, fim: dia };
  }
  return { inicio: parseDateKey(min) as Date, fim: parseDateKey(max) as Date };
}

export function intervaloDoPeriodo(
  periodo: Exclude<FinanceiroPeriodo, 'total'>,
  hoje: Date
): { inicio: Date; fim: Date } {
  const fim = inicioDoDia(hoje);
  if (periodo === '12m') {
    return { inicio: new Date(fim.getFullYear(), fim.getMonth() - 11, 1), fim };
  }
  const dias = PERIODOS_FINANCEIRO.find((item) => item.id === periodo)?.dias ?? 30;
  return { inicio: addDays(fim, -(dias - 1)), fim };
}

export function intervaloAnterior(
  periodo: Exclude<FinanceiroPeriodo, 'total'>,
  atual: { inicio: Date; fim: Date }
): { inicio: Date; fim: Date } {
  if (periodo === '12m') {
    return {
      inicio: new Date(atual.inicio.getFullYear(), atual.inicio.getMonth() - 12, 1),
      fim: addDays(atual.inicio, -1),
    };
  }
  const dias = PERIODOS_FINANCEIRO.find((item) => item.id === periodo)?.dias ?? 30;
  const fim = addDays(atual.inicio, -1);
  return { inicio: addDays(fim, -(dias - 1)), fim };
}

/** Janela imediatamente anterior, com a mesma quantidade de dias. */
export function intervaloAnteriorEquivalente(atual: { inicio: Date; fim: Date }): { inicio: Date; fim: Date } {
  const dias = Math.max(1, cadaDia(atual.inicio, atual.fim).length);
  const fim = addDays(atual.inicio, -1);
  return { inicio: addDays(fim, -(dias - 1)), fim };
}

export function somarIntervalo(
  mapa: MapaPorDia,
  detalhes: DetalhesPorDia,
  inicio: Date,
  fim: Date
) {
  let vendido = 0;
  let recebido = 0;
  let aberto = 0;
  let vendas = 0;
  for (const dia of cadaDia(inicio, fim)) {
    const chave = dateKeyLocal(dia);
    const totais = mapa.get(chave);
    vendido += totais?.vendido || 0;
    recebido += totais?.recebido || 0;
    aberto += totais?.aberto || 0;
    vendas += detalhes.get(chave)?.vendido?.length || 0;
  }
  return { vendido, recebido, aberto, vendas };
}

export function variacaoDe(atual: number, anterior: number): VariacaoFinanceira {
  const delta = atual - anterior;
  if (anterior === 0) {
    if (atual === 0) return { kind: 'flat', percentual: 0, delta: 0 };
    return { kind: 'sem-base', percentual: null, delta };
  }
  const percentual = ((atual - anterior) / anterior) * 100;
  if (!Number.isFinite(percentual)) return { kind: 'sem-base', percentual: null, delta };
  if (Math.abs(percentual) < 0.05) return { kind: 'flat', percentual: 0, delta };
  return { kind: percentual > 0 ? 'up' : 'down', percentual, delta };
}

function labelDia(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelMes(d: Date): string {
  const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${mes}/${String(d.getFullYear()).slice(2)}`;
}

function somarDias(mapa: MapaPorDia, dias: Date[]): Pick<PontoFinanceiro, 'vendido' | 'recebido' | 'aberto'> {
  return dias.reduce(
    (soma, dia) => {
      const totais = mapa.get(dateKeyLocal(dia));
      soma.vendido += totais?.vendido || 0;
      soma.recebido += totais?.recebido || 0;
      soma.aberto += totais?.aberto || 0;
      return soma;
    },
    { vendido: 0, recebido: 0, aberto: 0 }
  );
}

export function granularidadeDaSerie(
  periodo: FinanceiroPeriodo | 'custom',
  inicio: Date,
  fim: Date
): 'dia' | 'semana' | 'mes' {
  if (periodo === '12m' || periodo === 'total') return 'mes';
  if (periodo === '90d') return 'semana';
  const dias = cadaDia(inicio, fim).length;
  if (periodo === 'custom') {
    if (dias > 120) return 'mes';
    if (dias > 60) return 'semana';
  }
  return 'dia';
}

export function serieFinanceira(
  granularidade: 'dia' | 'semana' | 'mes',
  mapa: MapaPorDia,
  inicio: Date,
  fim: Date
): PontoFinanceiro[] {
  if (granularidade === 'mes') {
    return cadaMes(inicio, fim).map((mes) => {
      const primeiro = mes.getTime() < inicio.getTime() ? inicio : mes;
      const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
      const ultimo = ultimoDia.getTime() > fim.getTime() ? fim : ultimoDia;
      return { label: labelMes(mes), ...somarDias(mapa, cadaDia(primeiro, ultimo)) };
    });
  }
  const dias = cadaDia(inicio, fim);
  if (granularidade === 'semana') {
    const pontos: PontoFinanceiro[] = [];
    for (let i = 0; i < dias.length; i += 7) {
      const fatia = dias.slice(i, i + 7);
      pontos.push({ label: labelDia(fatia[0]), ...somarDias(mapa, fatia) });
    }
    return pontos;
  }
  return dias.map((dia) => ({ label: labelDia(dia), ...somarDias(mapa, [dia]) }));
}
