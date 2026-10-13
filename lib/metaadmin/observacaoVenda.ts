import type {
  ObservacaoVenda,
  ObservacaoVendaAplicacaoItem,
  ObservacaoVendaConsultaItem,
  ObservacaoVendaInjetavelItem,
  ObservacaoVendaOutroItem,
  ObservacaoVendaPasta,
  PagamentoPaciente,
} from '@/types/pagamento';

export const OBSERVACAO_VENDA_PASTAS: Array<{
  id: ObservacaoVendaPasta;
  label: string;
}> = [
  { id: 'aplicacoes', label: 'Aplicações' },
  { id: 'injetaveis', label: 'Injetáveis' },
  { id: 'consulta', label: 'Consulta' },
  { id: 'outros', label: 'Outros' },
];

export function chaveObservacaoVenda(indice: number): string {
  return String(indice);
}

/** Tira a observação da venda excluída e desloca as seguintes (0 = Venda Inicial). */
export function removerObservacaoDaVenda(
  mapa: Record<string, ObservacaoVenda> | undefined,
  indiceRemovido: number
): Record<string, ObservacaoVenda> {
  const proximo: Record<string, ObservacaoVenda> = {};
  for (const [chave, valor] of Object.entries(mapa ?? {})) {
    const n = Number(chave);
    if (!Number.isInteger(n) || n < 0 || n === indiceRemovido) continue;
    proximo[chaveObservacaoVenda(n > indiceRemovido ? n - 1 : n)] = valor;
  }
  return proximo;
}

export function criarIdObservacaoVenda(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function arredondarMoeda(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 100) / 100;
}

export function valoresMoedaIguais(a: number, b: number, tolerancia = 0.009): boolean {
  return Math.abs(arredondarMoeda(a) - arredondarMoeda(b)) <= tolerancia;
}

export function criarObservacaoVendaVazia(): ObservacaoVenda {
  return {
    aplicacoes: [],
    injetaveis: [],
    consultas: [],
    outros: [],
  };
}

export function criarItemAplicacao(parcial?: Partial<ObservacaoVendaAplicacaoItem>): ObservacaoVendaAplicacaoItem {
  const quantidade = Number(parcial?.quantidade) || 0;
  const mg = Number(parcial?.mg) || 0;
  const valorUnitario = Number(parcial?.valorUnitario) || 0;
  return {
    id: parcial?.id || criarIdObservacaoVenda(),
    quantidade,
    mg,
    valorUnitario,
    valorTotal: arredondarMoeda(quantidade * valorUnitario),
  };
}

export function criarItemInjetavel(parcial?: Partial<ObservacaoVendaInjetavelItem>): ObservacaoVendaInjetavelItem {
  const quantidade = Number(parcial?.quantidade) || 0;
  const valorUnitario = Number(parcial?.valorUnitario) || 0;
  return {
    id: parcial?.id || criarIdObservacaoVenda(),
    tipo: parcial?.tipo ?? '',
    quantidade,
    valorUnitario,
    valorTotal: arredondarMoeda(quantidade * valorUnitario),
  };
}

export function criarItemConsulta(parcial?: Partial<ObservacaoVendaConsultaItem>): ObservacaoVendaConsultaItem {
  const quantidade = Number(parcial?.quantidade) || 0;
  const valorUnitario = Number(parcial?.valorUnitario) || 0;
  return {
    id: parcial?.id || criarIdObservacaoVenda(),
    descricao: parcial?.descricao ?? '',
    quantidade,
    valorUnitario,
    valorTotal: arredondarMoeda(quantidade * valorUnitario),
  };
}

export function criarItemOutro(parcial?: Partial<ObservacaoVendaOutroItem>): ObservacaoVendaOutroItem {
  const quantidade = Number(parcial?.quantidade) || 0;
  const valorUnitario = Number(parcial?.valorUnitario) || 0;
  return {
    id: parcial?.id || criarIdObservacaoVenda(),
    descricao: parcial?.descricao ?? '',
    quantidade,
    valorUnitario,
    valorTotal: arredondarMoeda(quantidade * valorUnitario),
  };
}

function somarItens(itens: Array<{ valorTotal?: number }> | undefined): number {
  if (!itens?.length) return 0;
  return arredondarMoeda(itens.reduce((s, item) => s + (Number(item.valorTotal) || 0), 0));
}

export type TotaisObservacaoVenda = {
  aplicacoes: number;
  injetaveis: number;
  consulta: number;
  outros: number;
  aplicacoesInjetaveis: number;
  composicao: number;
};

export function totaisObservacaoVenda(obs: ObservacaoVenda | null | undefined): TotaisObservacaoVenda {
  const aplicacoes = somarItens(obs?.aplicacoes);
  const injetaveis = somarItens(obs?.injetaveis);
  const consulta = somarItens(obs?.consultas);
  const outros = somarItens(obs?.outros);
  const aplicacoesInjetaveis = arredondarMoeda(aplicacoes + injetaveis);
  return {
    aplicacoes,
    injetaveis,
    consulta,
    outros,
    aplicacoesInjetaveis,
    composicao: arredondarMoeda(aplicacoesInjetaveis + consulta + outros),
  };
}

function temTexto(valor: string | undefined): boolean {
  return Boolean(valor?.trim());
}

export function observacaoVendaTemConteudo(obs: ObservacaoVenda | null | undefined): boolean {
  if (!obs) return false;
  const totais = totaisObservacaoVenda(obs);
  return (
    (obs.aplicacoes?.length ?? 0) > 0 ||
    (obs.injetaveis?.length ?? 0) > 0 ||
    (obs.consultas?.length ?? 0) > 0 ||
    (obs.outros?.length ?? 0) > 0 ||
    temTexto(obs.notasAplicacoes) ||
    temTexto(obs.notasInjetaveis) ||
    temTexto(obs.notasConsulta) ||
    temTexto(obs.notasOutros) ||
    totais.composicao > 0
  );
}

export function observacaoVendaTemValores(obs: ObservacaoVenda | null | undefined): boolean {
  return totaisObservacaoVenda(obs).composicao > 0;
}

export type AlertaDivergenciaObservacaoVenda = {
  diverge: boolean;
  diferenca: number;
  totais: TotaisObservacaoVenda;
  valorVenda: number;
};

export function alertaDivergenciaObservacaoVenda(
  obs: ObservacaoVenda | null | undefined,
  valorVenda: number
): AlertaDivergenciaObservacaoVenda {
  const totais = totaisObservacaoVenda(obs);
  const venda = arredondarMoeda(valorVenda);
  const diferenca = arredondarMoeda(totais.composicao - venda);
  const diverge = observacaoVendaTemValores(obs) && !valoresMoedaIguais(totais.composicao, venda);
  return { diverge, diferenca, totais, valorVenda: venda };
}

export function hidratarObservacoesPorVenda(
  pag: Pick<PagamentoPaciente, 'observacoes' | 'observacoesPorVenda'> | null | undefined
): Record<string, ObservacaoVenda> {
  const atual: Record<string, ObservacaoVenda> = { ...(pag?.observacoesPorVenda ?? {}) };
  const chave0 = chaveObservacaoVenda(0);
  const primeira = atual[chave0];
  if (!observacaoVendaTemConteudo(primeira) && pag?.observacoes?.trim()) {
    atual[chave0] = {
      ...(primeira ?? criarObservacaoVendaVazia()),
      notasOutros: pag.observacoes.trim(),
    };
  }
  return atual;
}

export function formatarMoedaObservacao(valor: number): string {
  return arredondarMoeda(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function linhasTextoObservacaoVenda(obs: ObservacaoVenda | null | undefined): string[] {
  if (!observacaoVendaTemConteudo(obs) || !obs) return [];

  const linhas: string[] = [];
  const totais = totaisObservacaoVenda(obs);

  if (obs.aplicacoes?.length) {
    linhas.push('Aplicações:');
    obs.aplicacoes.forEach((item, idx) => {
      const qtd = item.quantidade || 0;
      const mg = item.mg || 0;
      linhas.push(
        `  ${idx + 1}. ${qtd} aplicação${qtd === 1 ? '' : 'ões'} · ${mg} mg · un. ${formatarMoedaObservacao(item.valorUnitario || 0)} · total ${formatarMoedaObservacao(item.valorTotal || 0)}`
      );
    });
    if (totais.aplicacoes > 0) {
      linhas.push(`  Subtotal aplicações: ${formatarMoedaObservacao(totais.aplicacoes)}`);
    }
  }
  if (temTexto(obs.notasAplicacoes)) {
    linhas.push(`  Obs. aplicações: ${obs.notasAplicacoes!.trim()}`);
  }

  if (obs.injetaveis?.length) {
    linhas.push('Injetáveis:');
    obs.injetaveis.forEach((item, idx) => {
      const tipo = item.tipo?.trim() || 'Injetável';
      linhas.push(
        `  ${idx + 1}. ${tipo} · qtd ${item.quantidade || 0} · un. ${formatarMoedaObservacao(item.valorUnitario || 0)} · total ${formatarMoedaObservacao(item.valorTotal || 0)}`
      );
    });
    if (totais.injetaveis > 0) {
      linhas.push(`  Subtotal injetáveis: ${formatarMoedaObservacao(totais.injetaveis)}`);
    }
  }
  if (temTexto(obs.notasInjetaveis)) {
    linhas.push(`  Obs. injetáveis: ${obs.notasInjetaveis!.trim()}`);
  }

  if (obs.consultas?.length) {
    linhas.push('Consulta:');
    obs.consultas.forEach((item, idx) => {
      const desc = item.descricao?.trim() || 'Consulta';
      linhas.push(
        `  ${idx + 1}. ${desc} · qtd ${item.quantidade || 0} · un. ${formatarMoedaObservacao(item.valorUnitario || 0)} · total ${formatarMoedaObservacao(item.valorTotal || 0)}`
      );
    });
    if (totais.consulta > 0) {
      linhas.push(`  Subtotal consulta: ${formatarMoedaObservacao(totais.consulta)}`);
    }
  }
  if (temTexto(obs.notasConsulta)) {
    linhas.push(`  Obs. consulta: ${obs.notasConsulta!.trim()}`);
  }

  if (obs.outros?.length) {
    linhas.push('Outros:');
    obs.outros.forEach((item, idx) => {
      const desc = item.descricao?.trim() || 'Outros';
      linhas.push(
        `  ${idx + 1}. ${desc} · qtd ${item.quantidade || 0} · un. ${formatarMoedaObservacao(item.valorUnitario || 0)} · total ${formatarMoedaObservacao(item.valorTotal || 0)}`
      );
    });
    if (totais.outros > 0) {
      linhas.push(`  Subtotal outros: ${formatarMoedaObservacao(totais.outros)}`);
    }
  }
  if (temTexto(obs.notasOutros)) {
    linhas.push(`  Obs. outros: ${obs.notasOutros!.trim()}`);
  }

  if (totais.composicao > 0) {
    linhas.push(
      `Soma aplicações + injetáveis: ${formatarMoedaObservacao(totais.aplicacoesInjetaveis)}`
    );
    linhas.push(`Total da composição: ${formatarMoedaObservacao(totais.composicao)}`);
  }

  return linhas;
}
