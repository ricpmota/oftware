export type ProximaAplicacaoHome = {
  data: Date;
  semana: number;
  isHoje: boolean;
};

type AplicacaoStatusItem = {
  data: Date;
  semana: number;
  status: 'tomada' | 'perdida' | 'hoje' | 'futura' | 'cancelada' | string;
};

export function resolveProximaAplicacaoFromLista(
  lista: AplicacaoStatusItem[] | null | undefined
): ProximaAplicacaoHome | null {
  if (!lista?.length) return null;
  const next = lista.find((a) => a.status === 'hoje' || a.status === 'futura');
  if (!next?.data || Number.isNaN(next.data.getTime())) return null;
  return {
    data: next.data,
    semana: next.semana,
    isHoje: next.status === 'hoje',
  };
}

export function formatKgDeltaPtBr(absKg: number): string {
  return absKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function apresentacaoPerdaPeso(deltaKg: number | null | undefined): {
  title: string;
  value: string;
  unit: string | null;
  hint: string;
  tone: 'loss' | 'gain' | 'stable' | 'empty';
} {
  if (deltaKg == null || !Number.isFinite(deltaKg)) {
    return {
      title: 'Perda de peso',
      value: '—',
      unit: null,
      hint: 'Sem dado desde o início',
      tone: 'empty',
    };
  }
  const mag = Math.abs(deltaKg);
  const value = formatKgDeltaPtBr(mag);
  if (mag < 0.05) {
    return {
      title: 'Perda de peso',
      value: '0,0',
      unit: 'kg',
      hint: 'desde o início',
      tone: 'stable',
    };
  }
  if (deltaKg < 0) {
    return {
      title: 'Perda de peso',
      value,
      unit: 'kg',
      hint: 'perdidos desde o início',
      tone: 'loss',
    };
  }
  return {
    title: 'Variação de peso',
    value: `+${value}`,
    unit: 'kg',
    hint: 'variação desde o início',
    tone: 'gain',
  };
}

export function apresentacaoCircunferencia(
  atualCm: number | null | undefined,
  inicialCm: number | null | undefined
): {
  value: string;
  unit: string | null;
  hint: string;
  deltaLabel: string | null;
  tone: 'down' | 'up' | 'stable' | 'empty' | 'value';
} {
  if (atualCm == null || !Number.isFinite(atualCm) || !(atualCm > 0)) {
    return {
      value: '—',
      unit: null,
      hint: 'Sem medida nesta data',
      deltaLabel: null,
      tone: 'empty',
    };
  }
  const value = formatKgDeltaPtBr(atualCm);
  if (inicialCm == null || !Number.isFinite(inicialCm) || !(inicialCm > 0)) {
    return { value, unit: 'cm', hint: '', deltaLabel: null, tone: 'value' };
  }
  const delta = inicialCm - atualCm;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) {
    return { value, unit: 'cm', hint: 'sem variação acumulada', deltaLabel: null, tone: 'stable' };
  }
  if (delta > 0) {
    return {
      value,
      unit: 'cm',
      hint: 'redução acumulada',
      deltaLabel: `↓ ${formatKgDeltaPtBr(delta)} cm`,
      tone: 'down',
    };
  }
  return {
    value,
    unit: 'cm',
    hint: 'variação desde o início',
    deltaLabel: `↑ ${formatKgDeltaPtBr(Math.abs(delta))} cm`,
    tone: 'up',
  };
}

export function apresentacaoGordura(
  atualPct: number | null | undefined,
  anteriorPct: number | null | undefined
): {
  value: string;
  unit: string | null;
  hint: string;
  deltaLabel: string | null;
  tone: 'down' | 'up' | 'stable' | 'empty' | 'value';
} {
  if (atualPct == null || !Number.isFinite(atualPct) || atualPct < 0) {
    return {
      value: '—',
      unit: null,
      hint: 'Sem bioimpedância',
      deltaLabel: null,
      tone: 'empty',
    };
  }
  const value = formatKgDeltaPtBr(atualPct);
  if (anteriorPct == null || !Number.isFinite(anteriorPct) || anteriorPct < 0) {
    return { value, unit: '%', hint: '', deltaLabel: null, tone: 'value' };
  }
  const pp = atualPct - anteriorPct;
  if (!Number.isFinite(pp) || Math.abs(pp) < 0.05) {
    return { value, unit: '%', hint: 'vs exame anterior', deltaLabel: '→ 0,0 p.p.', tone: 'stable' };
  }
  if (pp < 0) {
    return {
      value,
      unit: '%',
      hint: 'vs exame anterior',
      deltaLabel: `↓ ${formatKgDeltaPtBr(Math.abs(pp))} p.p.`,
      tone: 'down',
    };
  }
  return {
    value,
    unit: '%',
    hint: 'vs exame anterior',
    deltaLabel: `↑ ${formatKgDeltaPtBr(pp)} p.p.`,
    tone: 'up',
  };
}

export function formatDiaMesPtBr(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatWeekdayPtBr(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
