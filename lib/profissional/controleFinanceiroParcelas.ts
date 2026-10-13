import type { ParcelaPagamento } from '@/types/pagamento';

export type GrupoVendaParcelas = {
  label: string;
  data: Date;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  indices: number[];
};

export function toDatePagamento(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t && !Number.isNaN(t.getTime())) return t;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Agrupa parcelas por venda com índices (para abas no modal financeiro). */
export function obterGruposParcelasPorVenda(
  parcelas: ParcelaPagamento[],
  dataVendaFallback: Date,
  toDate: (v: unknown) => Date | null = toDatePagamento
): GrupoVendaParcelas[] {
  if (!parcelas.length) {
    return [
      {
        label: 'Venda Inicial',
        data: dataVendaFallback,
        valorTotal: 0,
        valorPago: 0,
        valorPendente: 0,
        indices: [],
      },
    ];
  }

  const grupos: GrupoVendaParcelas[] = [];
  let vendaIdx = 0;
  let i = 0;

  if (!parcelas[0].dataVenda) {
    const indices: number[] = [];
    let vt = 0;
    let vp = 0;
    while (i < parcelas.length && !parcelas[i].dataVenda) {
      indices.push(i);
      const val = parcelas[i].valor || 0;
      vt += val;
      if (parcelas[i].status === 'paga') vp += val;
      i++;
    }
    grupos.push({
      label: 'Venda Inicial',
      data: dataVendaFallback,
      valorTotal: vt,
      valorPago: vp,
      valorPendente: vt - vp,
      indices,
    });
    vendaIdx = 1;
  }

  while (i < parcelas.length) {
    const primeira = parcelas[i];
    const dataVenda = primeira.dataVenda ? toDate(primeira.dataVenda) : null;
    const data = dataVenda || dataVendaFallback;
    const indices: number[] = [i];
    let vt = primeira.valor || 0;
    let vp = primeira.status === 'paga' ? primeira.valor || 0 : 0;
    i++;

    while (i < parcelas.length && !parcelas[i].dataVenda) {
      indices.push(i);
      const val = parcelas[i].valor || 0;
      vt += val;
      if (parcelas[i].status === 'paga') vp += val;
      i++;
    }

    vendaIdx++;
    grupos.push({
      label: `Venda ${vendaIdx}`,
      data,
      valorTotal: vt,
      valorPago: vp,
      valorPendente: vt - vp,
      indices,
    });
  }

  return grupos;
}

export function calcularPosicaoInserirParcela(
  grupos: GrupoVendaParcelas[],
  tabIdx: number,
  totalParcelas: number
): number {
  const grupo = grupos[tabIdx];
  if (!grupo) return totalParcelas;
  if (grupo.indices.length > 0) return grupo.indices[grupo.indices.length - 1] + 1;
  if (tabIdx === 0) return 0;
  const grupoAnterior = grupos[tabIdx - 1];
  if (grupoAnterior?.indices.length) {
    return grupoAnterior.indices[grupoAnterior.indices.length - 1] + 1;
  }
  return totalParcelas;
}

/** Renumera parcelas dentro de cada venda (Venda Inicial, Venda 2...), não globalmente. */
export function renumberarParcelas(parcelas: ParcelaPagamento[]): ParcelaPagamento[] {
  if (!parcelas.length) return [];
  const resultado = parcelas.map((p) => ({ ...p }));
  let i = 0;
  let numNaVenda = 1;

  while (i < resultado.length && !resultado[i].dataVenda) {
    resultado[i] = { ...resultado[i], numero: numNaVenda++ };
    i++;
  }

  while (i < resultado.length) {
    numNaVenda = 1;
    resultado[i] = { ...resultado[i], numero: numNaVenda++ };
    i++;
    while (i < resultado.length && !resultado[i].dataVenda) {
      resultado[i] = { ...resultado[i], numero: numNaVenda++ };
      i++;
    }
  }

  return resultado;
}

/** Remove todas as parcelas de uma venda (Venda Inicial, Venda 2...) e renumera o que restou. */
export function removerParcelasDoGrupo(
  parcelas: ParcelaPagamento[],
  indices: number[]
): ParcelaPagamento[] {
  if (!indices.length) return parcelas;
  const remover = new Set(indices);
  return renumberarParcelas(parcelas.filter((_, i) => !remover.has(i)));
}

export function recalcularTotaisParcelas(parcelas: ParcelaPagamento[]) {
  const valorTotal = parcelas.reduce((sum, p) => sum + (p.valor || 0), 0);
  const valorPago = parcelas
    .filter((p) => p.status === 'paga')
    .reduce((sum, p) => sum + (p.valor || 0), 0);
  return { valorTotal, valorPago, valorPendente: valorTotal - valorPago };
}

export function derivarStatusPagamentoDeParcelas(
  parcelas: ParcelaPagamento[]
): 'pago' | 'iniciou_pagamento' | 'em_aberto' {
  if (!parcelas.length) return 'em_aberto';
  const todasPagas = parcelas.every((p) => p.status === 'paga');
  const algumaPagaComPendente =
    parcelas.some((p) => p.status === 'paga') &&
    parcelas.some((p) => p.status === 'pendente' || p.status === 'atrasada');
  return todasPagas ? 'pago' : algumaPagaComPendente ? 'iniciou_pagamento' : 'em_aberto';
}
