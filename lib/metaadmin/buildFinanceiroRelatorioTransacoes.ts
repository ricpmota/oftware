import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, ParcelaPagamento, VendaAvulsa } from '@/types/pagamento';
import type { RelatorioFinanceiroVenda } from '@/utils/relatorioFinanceiroPdfGenerate';
import {
  chaveObservacaoVenda,
  hidratarObservacoesPorVenda,
} from '@/lib/metaadmin/observacaoVenda';

export type FinanceiroRelatorioTipo = 'vendido' | 'recebido' | 'aberto';

export type FinanceiroRelatorioLinha = {
  id: string;
  tipo: 'paciente' | 'venda_avulsa';
  nome: string;
  detalhe: string;
  data: Date;
  dataLabel: string;
  status: 'pago' | 'iniciou_pagamento' | 'em_aberto';
  valor: number;
  /** Totais do paciente (úteis para PDF / contexto). */
  valorTotal?: number;
  valorPago?: number;
  valorPendente?: number;
  qtdVendas?: number;
  pacienteId?: string;
  vendaAvulsaId?: string;
};

type VendaAgrupada = {
  label: string;
  data: Date;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
};

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getValoresPacienteDeParcelas(
  pag: PagamentoPaciente | null | undefined
): { valorTotal: number; valorPago: number; valorPendente: number } {
  if (!pag?.parcelas?.length) return { valorTotal: 0, valorPago: 0, valorPendente: 0 };
  const valorTotal = pag.parcelas.reduce((s, p) => s + (p.valor || 0), 0);
  const valorPago = pag.parcelas.filter((p) => p.status === 'paga').reduce((s, p) => s + (p.valor || 0), 0);
  return { valorTotal, valorPago, valorPendente: valorTotal - valorPago };
}

/**
 * Parcela elegível para cobrança: não paga e com vencimento anterior a hoje
 * (ou marcada explicitamente como atrasada).
 */
export function isParcelaVencidaParaCobranca(
  parcela: ParcelaPagamento,
  agora: Date = new Date()
): boolean {
  if (parcela.status === 'paga') return false;
  if ((parcela.valor || 0) <= 0) return false;

  const dv = toDate(parcela.dataVencimento);
  if (dv) {
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const venc = new Date(dv.getFullYear(), dv.getMonth(), dv.getDate());
    return venc.getTime() < hoje.getTime();
  }

  // Sem data: só cobra se já estiver marcada como atrasada.
  return parcela.status === 'atrasada';
}

/** Soma das parcelas pendentes/atrasadas com vencimento anterior a hoje. */
export function getValorCobrancaParcelasVencidas(
  parcelas: ParcelaPagamento[] | null | undefined,
  agora: Date = new Date()
): number {
  if (!parcelas?.length) return 0;
  return parcelas
    .filter((p) => isParcelaVencidaParaCobranca(p, agora))
    .reduce((s, p) => s + (p.valor || 0), 0);
}

export function getStatusPagamentoPaciente(
  pag: PagamentoPaciente | null | undefined
): 'pago' | 'iniciou_pagamento' | 'em_aberto' {
  if (!pag?.parcelas?.length) return 'em_aberto';
  const todasPagas = pag.parcelas.every((p) => p.status === 'paga');
  const algumaPagaComPendente =
    pag.parcelas.some((p) => p.status === 'paga') &&
    pag.parcelas.some((p) => p.status === 'pendente' || p.status === 'atrasada');
  return todasPagas ? 'pago' : algumaPagaComPendente ? 'iniciou_pagamento' : 'em_aberto';
}

export function agruparParcelasPorVenda(
  parcelas: ParcelaPagamento[],
  dataVendaFallback: Date
): VendaAgrupada[] {
  const filtered = parcelas.filter((p) => (p.valor || 0) > 0);
  if (!filtered.length) return [];

  const vendas: VendaAgrupada[] = [];
  let vendaIdx = 0;
  let i = 0;

  if (!filtered[0].dataVenda) {
    let vt = 0;
    let vp = 0;
    while (i < filtered.length && !filtered[i].dataVenda) {
      const val = filtered[i].valor || 0;
      vt += val;
      if (filtered[i].status === 'paga') vp += val;
      i++;
    }
    vendas.push({
      label: 'Venda Inicial',
      data: dataVendaFallback,
      valorTotal: vt,
      valorPago: vp,
      valorPendente: vt - vp,
    });
    vendaIdx = 1;
  }

  while (i < filtered.length) {
    const primeira = filtered[i];
    const dataVenda = primeira.dataVenda ? toDate(primeira.dataVenda) : null;
    const data = dataVenda || dataVendaFallback;
    let vt = primeira.valor || 0;
    let vp = primeira.status === 'paga' ? primeira.valor || 0 : 0;
    i++;

    while (i < filtered.length && !filtered[i].dataVenda) {
      const val = filtered[i].valor || 0;
      vt += val;
      if (filtered[i].status === 'paga') vp += val;
      i++;
    }

    vendaIdx++;
    vendas.push({
      label: `Venda ${vendaIdx}`,
      data,
      valorTotal: vt,
      valorPago: vp,
      valorPendente: vt - vp,
    });
  }

  return vendas;
}

/** Mesma agrupagem do modal, com índices das parcelas (para PDF). */
function obterGruposParcelasPorVenda(
  parcelas: ParcelaPagamento[],
  dataVendaFallback: Date
): Array<VendaAgrupada & { indices: number[] }> {
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

  const grupos: Array<VendaAgrupada & { indices: number[] }> = [];
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

function nomePacienteRelatorio(
  paciente: PacienteCompleto | undefined,
  pacienteId: string
): string {
  if (!paciente) return `Paciente ${pacienteId.slice(0, 8)}`;
  return (
    paciente.dadosIdentificacao?.nomeCompleto ||
    (paciente as { nomeCompleto?: string }).nomeCompleto ||
    (paciente as { nome?: string }).nome ||
    `Paciente ${pacienteId.slice(0, 8)}`
  );
}

function dataVendaFallbackPaciente(
  paciente: PacienteCompleto | undefined,
  pag: PagamentoPaciente
): Date {
  const dataCadastroPaciente = paciente
    ? toDate(paciente.dadosIdentificacao?.dataCadastro) ||
      toDate((paciente as { dataCadastro?: unknown }).dataCadastro)
    : null;
  return dataCadastroPaciente || toDate(pag.dataUltimaAtualizacao) || new Date();
}

function statusLabel(status: FinanceiroRelatorioLinha['status']): string {
  if (status === 'pago') return 'Pago';
  if (status === 'iniciou_pagamento') return 'Parcial';
  return 'Aberto';
}

export function financeiroRelatorioStatusLabel(status: FinanceiroRelatorioLinha['status']): string {
  return statusLabel(status);
}

export function financeiroRelatorioTitulo(tipo: FinanceiroRelatorioTipo): string {
  if (tipo === 'vendido') return 'Relatório — Total Vendido';
  if (tipo === 'recebido') return 'Relatório — Total Recebido';
  return 'Relatório — Total Aberto';
}

export function financeiroRelatorioDescricao(tipo: FinanceiroRelatorioTipo): string {
  if (tipo === 'vendido') {
    return 'Somatório por paciente e vendas avulsas que compõem o Total Vendido.';
  }
  if (tipo === 'recebido') {
    return 'Somatório por paciente e vendas avulsas quitadas que compõem o Total Recebido.';
  }
  return 'Somatório por paciente e vendas avulsas em aberto/parcial que compõem o Total Aberto.';
}

/**
 * Monta o extrato analítico: 1 linha por paciente (somatório) + 1 por venda avulsa.
 * A soma de `valor` deve bater com o total do card correspondente.
 */
export function buildFinanceiroRelatorioTransacoes(params: {
  tipo: FinanceiroRelatorioTipo;
  pagamentosPacientes: Record<string, PagamentoPaciente>;
  vendasAvulsas: VendaAvulsa[];
  pacientes: PacienteCompleto[];
}): FinanceiroRelatorioLinha[] {
  const { tipo, pagamentosPacientes, vendasAvulsas, pacientes } = params;
  const linhas: FinanceiroRelatorioLinha[] = [];

  Object.entries(pagamentosPacientes || {}).forEach(([pacienteId, pag]) => {
    const { valorTotal, valorPago, valorPendente } = getValoresPacienteDeParcelas(pag);
    if (valorTotal <= 0) return;

    const status = getStatusPagamentoPaciente(pag);
    const paciente = pacientes.find((p) => p.id === pacienteId);
    const nome = nomePacienteRelatorio(paciente, pacienteId);
    const fallback = dataVendaFallbackPaciente(paciente, pag);
    const vendas = agruparParcelasPorVenda(pag.parcelas || [], fallback);
    const qtdVendas = vendas.length || 1;
    const dataRef =
      vendas.length > 0
        ? vendas.reduce((min, v) => (v.data.getTime() < min.getTime() ? v.data : min), vendas[0].data)
        : fallback;

    let valor = 0;
    if (tipo === 'vendido') {
      valor = valorTotal;
    } else if (tipo === 'recebido') {
      if (status !== 'pago') return;
      valor = valorTotal;
    } else {
      if (status === 'pago') return;
      valor = status === 'iniciou_pagamento' ? valorPendente : valorTotal;
      if (valor <= 0) return;
    }

    linhas.push({
      id: `pac-${pacienteId}-${tipo}`,
      tipo: 'paciente',
      nome,
      detalhe: qtdVendas === 1 ? '1 venda' : `${qtdVendas} vendas`,
      data: dataRef,
      dataLabel: fmtData(dataRef),
      status,
      valor,
      valorTotal,
      valorPago,
      valorPendente,
      qtdVendas,
      pacienteId,
    });
  });

  (vendasAvulsas || []).forEach((venda) => {
    const valorTotalVenda =
      venda.valorTotal ??
      ((venda.parcelas || []).reduce((s, p) => s + (p.valor || 0), 0) || 0);
    if (valorTotalVenda <= 0) return;

    const nome = venda.cliente || venda.descricao || 'Venda avulsa';
    const detalhe = venda.descricao || 'Venda avulsa';
    let dataVenda = toDate(venda.dataVenda);
    if (!dataVenda) {
      const primeiraParcela = (venda.parcelas || []).find((p) => p.dataVencimento);
      dataVenda =
        (primeiraParcela ? toDate(primeiraParcela.dataVencimento) : null) ||
        toDate(venda.dataUltimaAtualizacao) ||
        new Date();
    }
    const status =
      venda.statusPagamento === 'pago'
        ? 'pago'
        : venda.statusPagamento === 'iniciou_pagamento'
          ? 'iniciou_pagamento'
          : 'em_aberto';

    let valor = 0;
    if (tipo === 'vendido') {
      valor = valorTotalVenda;
    } else if (tipo === 'recebido') {
      if (venda.statusPagamento !== 'pago') return;
      valor = valorTotalVenda;
    } else {
      if (venda.statusPagamento === 'pago') return;
      valor =
        venda.statusPagamento === 'iniciou_pagamento'
          ? venda.valorPendente || 0
          : valorTotalVenda;
      if (valor <= 0) return;
    }

    linhas.push({
      id: `avulsa-${venda.id}-${tipo}`,
      tipo: 'venda_avulsa',
      nome,
      detalhe,
      data: dataVenda,
      dataLabel: fmtData(dataVenda),
      status,
      valor,
      valorTotal: valorTotalVenda,
      valorPago: venda.valorPago || 0,
      valorPendente: venda.valorPendente || 0,
      qtdVendas: 1,
      vendaAvulsaId: venda.id,
    });
  });

  return linhas.sort((a, b) => b.data.getTime() - a.data.getTime());
}

/** Monta o payload de vendas do PDF financeiro (igual ao modal Controle Financeiro). */
export function buildVendasPdfFromPagamentoPaciente(
  pag: PagamentoPaciente,
  paciente: PacienteCompleto | undefined
): {
  vendas: RelatorioFinanceiroVenda[];
  totaisGerais: { valorTotal: number; valorPago: number; valorPendente: number };
} {
  const parcelas = pag.parcelas || [];
  const fallback = dataVendaFallbackPaciente(paciente, pag);
  const grupos = obterGruposParcelasPorVenda(parcelas, fallback);

  const obsMap = hidratarObservacoesPorVenda(pag);
  const vendas: RelatorioFinanceiroVenda[] = grupos.map((grupo, idx) => ({
    label: grupo.label,
    data: grupo.data,
    valorTotal: grupo.valorTotal,
    valorPago: grupo.valorPago,
    valorPendente: grupo.valorPendente,
    observacao: obsMap[chaveObservacaoVenda(idx)],
    parcelas: grupo.indices.map((idxParcela) => {
      const p = parcelas[idxParcela];
      return {
        numero: p.numero,
        valor: p.valor || 0,
        status: p.status,
        dataPagamento: p.dataPagamento ? toDate(p.dataPagamento) : null,
        dataVencimento: p.dataVencimento ? toDate(p.dataVencimento) : null,
      };
    }),
  }));

  const totais = getValoresPacienteDeParcelas(pag);
  return { vendas, totaisGerais: totais };
}

/** Payload de PDF para uma venda avulsa (relatório / download local). */
export function buildVendasPdfFromVendaAvulsa(venda: VendaAvulsa): {
  vendas: RelatorioFinanceiroVenda[];
  totaisGerais: { valorTotal: number; valorPago: number; valorPendente: number };
} {
  const parcelas = venda.parcelas || [];
  const data = toDate(venda.dataVenda) || new Date();
  const valorTotal =
    venda.valorTotal ?? parcelas.reduce((s, p) => s + (p.valor || 0), 0) ?? 0;
  const valorPago = venda.valorPago ?? parcelas.filter((p) => p.status === 'paga').reduce((s, p) => s + (p.valor || 0), 0);
  const valorPendente = venda.valorPendente ?? valorTotal - valorPago;

  return {
    vendas: [
      {
        label: venda.descricao || 'Venda avulsa',
        data,
        valorTotal,
        valorPago,
        valorPendente,
        observacao: venda.observacaoVenda,
        parcelas: parcelas.map((p) => ({
          numero: p.numero,
          valor: p.valor || 0,
          status: p.status,
          dataPagamento: p.dataPagamento ? toDate(p.dataPagamento) : null,
          dataVencimento: p.dataVencimento ? toDate(p.dataVencimento) : null,
        })),
      },
    ],
    totaisGerais: { valorTotal, valorPago, valorPendente },
  };
}
