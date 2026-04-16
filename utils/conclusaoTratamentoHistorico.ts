/**
 * Histórico de conclusões / depoimentos: ao reabrir tratamento ou registrar nova conclusão,
 * snapshots anteriores ficam em planoTerapeutico.historicoConclusoesTratamento.
 */

export type EvolucaoDepoimentoPonto = { weekIndex: number; peso: number; doseMg: number };

export type ConclusaoTratamentoArquivada = {
  dataConclusao?: unknown;
  pesoFinalKg?: number;
  circunferenciaAbdominalFinalCm?: number;
  depoimento?: string;
  ocultarDepoimentoPaginaPublica?: boolean;
  /** Nota 1–5 no momento do arquivamento (carrossel /dr exige 5) */
  estrelasArquivamento?: number | null;
  arquivadoEm?: Date;
  evolucaoSnapshot?: EvolucaoDepoimentoPonto[];
  pesoInicialKg?: number | null;
  pesoAtualKg?: number | null;
  perdaTotalKg?: number | null;
  perdaPercentual?: number | null;
};

const CAMPOS_COPIAR: (keyof ConclusaoTratamentoArquivada)[] = [
  'dataConclusao',
  'pesoFinalKg',
  'circunferenciaAbdominalFinalCm',
  'depoimento',
  'ocultarDepoimentoPaginaPublica',
];

export function buildEvolucaoSnapshotParaDepoimento(evolucaoRaw: unknown): EvolucaoDepoimentoPonto[] {
  if (!Array.isArray(evolucaoRaw)) return [];
  return evolucaoRaw
    .map((p: Record<string, unknown>) => {
      const pesoVal = typeof p.peso === 'number' && p.peso > 0 ? p.peso : null;
      const q = (p.doseAplicada as Record<string, unknown> | undefined)?.quantidade;
      const doseNum =
        typeof q === 'number' ? q : typeof q === 'string' ? parseFloat(String(q).replace(',', '.')) : 0;
      return {
        weekIndex: (p.weekIndex ?? p.numeroSemana ?? 0) as number,
        peso: pesoVal ?? 0,
        doseMg: Number.isFinite(doseNum) && doseNum > 0 ? doseNum : 0,
      };
    })
    .filter((p) => p.weekIndex > 0 && (p.peso > 0 || p.doseMg > 0))
    .sort((a, b) => a.weekIndex - b.weekIndex);
}

function metricasEvolucao(evolucaoOrdenada: EvolucaoDepoimentoPonto[]): {
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
} {
  if (evolucaoOrdenada.length === 0) {
    return { pesoInicialKg: null, pesoAtualKg: null, perdaTotalKg: null, perdaPercentual: null };
  }
  const comPeso = evolucaoOrdenada.filter((p) => p.peso > 0);
  if (comPeso.length === 0) {
    return { pesoInicialKg: null, pesoAtualKg: null, perdaTotalKg: null, perdaPercentual: null };
  }
  const pesoInicialKg = comPeso[0].peso;
  const pesoAtualKg = comPeso[comPeso.length - 1].peso;
  const perdaTotalKg = pesoInicialKg - pesoAtualKg;
  const perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  return { pesoInicialKg, pesoAtualKg, perdaTotalKg, perdaPercentual };
}

export function deveArquivarConclusao(conclusao: unknown): boolean {
  if (!conclusao || typeof conclusao !== 'object') return false;
  const c = conclusao as Record<string, unknown>;
  const dep = typeof c.depoimento === 'string' ? c.depoimento.trim() : '';
  const peso = c.pesoFinalKg;
  if (dep.length > 0) return true;
  if (typeof peso === 'number' && !isNaN(peso) && peso > 0) return true;
  return false;
}

export type SnapshotConclusaoOptions = {
  estrelas: number | null;
  evolucaoSeguimento?: unknown[];
};

export function snapshotConclusaoParaHistorico(
  conclusao: Record<string, unknown>,
  options: SnapshotConclusaoOptions
): ConclusaoTratamentoArquivada {
  const base: ConclusaoTratamentoArquivada = {
    estrelasArquivamento:
      options.estrelas != null && options.estrelas >= 1 && options.estrelas <= 5 ? options.estrelas : null,
    arquivadoEm: new Date(),
  };
  for (const key of CAMPOS_COPIAR) {
    if (key in conclusao && conclusao[key] !== undefined) {
      (base as Record<string, unknown>)[key] = conclusao[key];
    }
  }
  const evolucaoSnapshot = options.evolucaoSeguimento
    ? buildEvolucaoSnapshotParaDepoimento(options.evolucaoSeguimento)
    : [];
  if (evolucaoSnapshot.length > 0) {
    base.evolucaoSnapshot = evolucaoSnapshot;
    const m = metricasEvolucao(evolucaoSnapshot);
    base.pesoInicialKg = m.pesoInicialKg;
    base.pesoAtualKg = m.pesoAtualKg ?? (typeof conclusao.pesoFinalKg === 'number' ? conclusao.pesoFinalKg : null);
    base.perdaTotalKg = m.perdaTotalKg;
    base.perdaPercentual = m.perdaPercentual;
  } else if (typeof conclusao.pesoFinalKg === 'number' && !isNaN(conclusao.pesoFinalKg)) {
    base.pesoAtualKg = conclusao.pesoFinalKg;
  }
  return base;
}

export function mergeHistoricoConclusaoNoPlano<T extends Record<string, unknown>>(
  plano: T | undefined,
  snapshot: ConclusaoTratamentoArquivada
): T & Record<string, unknown> {
  const p = { ...(plano || {}) } as Record<string, unknown>;
  const prev = Array.isArray(p.historicoConclusoesTratamento)
    ? [...p.historicoConclusoesTratamento]
    : [];
  p.historicoConclusoesTratamento = [...prev, snapshot];
  return p as T & Record<string, unknown>;
}

function toSortTsDepoimento(val: unknown): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  const t = (val as { toDate?: () => Date }).toDate?.();
  if (t) return t.getTime();
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Slides para modal MetaAdmin: conclusão atual + histórico (mais recente primeiro). */
export type MetaAdminDepoimentoSlide = {
  key: string;
  origem: 'atual' | 'historico';
  historicoIndex?: number;
  texto: string;
  sortTs: number;
  labelData: string;
  pesoFinalKg: number | null;
  estrelas: number | null;
  ocultarPaginaPublica: boolean;
  evolucaoSnapshot: EvolucaoDepoimentoPonto[];
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
};

export function listDepoimentosSlidesFromPlano(
  plano: Record<string, unknown> | undefined | null
): MetaAdminDepoimentoSlide[] {
  if (!plano) return [];
  const items: MetaAdminDepoimentoSlide[] = [];
  const hist = plano.historicoConclusoesTratamento;
  if (Array.isArray(hist)) {
    hist.forEach((snap, idx) => {
      if (!snap || typeof snap !== 'object') return;
      const s = snap as Record<string, unknown>;
      const texto = typeof s.depoimento === 'string' ? s.depoimento.trim() : '';
      if (!texto) return;
      const ts = Math.max(toSortTsDepoimento(s.dataConclusao), toSortTsDepoimento(s.arquivadoEm));
      const sortTs = ts || 0;
      const evRaw = s.evolucaoSnapshot;
      const evolucaoSnapshot: EvolucaoDepoimentoPonto[] = Array.isArray(evRaw)
        ? evRaw
            .map((e: Record<string, unknown>) => ({
              weekIndex: Number(e.weekIndex) || 0,
              peso: typeof e.peso === 'number' ? e.peso : 0,
              doseMg: typeof e.doseMg === 'number' ? e.doseMg : 0,
            }))
            .filter((e) => e.weekIndex > 0 && (e.peso > 0 || e.doseMg > 0))
            .sort((a, b) => a.weekIndex - b.weekIndex)
        : [];
      const est =
        typeof s.estrelasArquivamento === 'number'
          ? Math.min(5, Math.max(1, Math.round(s.estrelasArquivamento)))
          : null;
      const m = evolucaoSnapshot.length > 0 ? metricasEvolucao(evolucaoSnapshot) : metricasEvolucao([]);
      const pf = typeof s.pesoFinalKg === 'number' ? s.pesoFinalKg : null;
      const pin = typeof s.pesoInicialKg === 'number' ? s.pesoInicialKg : null;
      const pat = typeof s.pesoAtualKg === 'number' ? s.pesoAtualKg : null;
      const ptot = typeof s.perdaTotalKg === 'number' ? s.perdaTotalKg : null;
      const pperc = typeof s.perdaPercentual === 'number' ? s.perdaPercentual : null;
      items.push({
        key: `h-${idx}`,
        origem: 'historico',
        historicoIndex: idx,
        texto,
        sortTs,
        labelData: sortTs ? new Date(sortTs).toLocaleDateString('pt-BR') : '—',
        pesoFinalKg: pf,
        estrelas: est,
        ocultarPaginaPublica: s.ocultarDepoimentoPaginaPublica === true,
        evolucaoSnapshot,
        pesoInicialKg: pin ?? m.pesoInicialKg,
        pesoAtualKg: pat ?? m.pesoAtualKg ?? pf,
        perdaTotalKg: ptot ?? m.perdaTotalKg,
        perdaPercentual: pperc ?? m.perdaPercentual,
      });
    });
  }
  const at = plano.conclusaoTratamento as Record<string, unknown> | undefined;
  if (at) {
    const texto = typeof at.depoimento === 'string' ? at.depoimento.trim() : '';
    if (texto) {
      const ts = toSortTsDepoimento(at.dataConclusao) || Date.now();
      const pf = typeof at.pesoFinalKg === 'number' ? at.pesoFinalKg : null;
      items.push({
        key: 'atual',
        origem: 'atual',
        texto,
        sortTs: ts,
        labelData: new Date(ts).toLocaleDateString('pt-BR'),
        pesoFinalKg: pf,
        estrelas: null,
        ocultarPaginaPublica: at.ocultarDepoimentoPaginaPublica === true,
        evolucaoSnapshot: [],
        pesoInicialKg: null,
        pesoAtualKg: null,
        perdaTotalKg: null,
        perdaPercentual: null,
      });
    }
  }
  items.sort((a, b) => b.sortTs - a.sortTs);
  return items;
}

export function temDepoimentosAssociadosAoPlano(plano: Record<string, unknown> | undefined | null): boolean {
  return listDepoimentosSlidesFromPlano(plano).length > 0;
}
