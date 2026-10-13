// Tipos para controle financeiro de pagamento de pacientes

export interface PagamentoPaciente {
  pacienteId: string;
  statusPagamento: 'negociacao' | 'iniciou_pagamento' | 'em_aberto' | 'pago';
  formaPagamento: 'a_vista' | 'dividido' | 'cartao' | null;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  parcelas?: ParcelaPagamento[];
  observacoes?: string;
  /** Observação detalhada por venda (índice 0 = Venda Inicial, 1 = Venda 2...). */
  observacoesPorVenda?: Record<string, ObservacaoVenda>;
  dataUltimaAtualizacao: Date;
  dataVencimento?: Date;
  dataPagamento?: Date;
  /** Data da venda inicial (opcional; usado no Controle Financeiro). */
  dataVenda?: Date;
}

export interface ParcelaPagamento {
  numero: number;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  status: 'pendente' | 'paga' | 'atrasada';
  formaPagamento?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'boleto';
  observacoes?: string;
  /** Presente apenas na primeira parcela de vendas adicionais (Venda 2, 3...). */
  dataVenda?: Date;
}

// Tipo para vendas avulsas (sem paciente)
export interface VendaAvulsa {
  id: string;
  descricao: string;
  cliente?: string; // Nome do cliente (opcional)
  statusPagamento: 'negociacao' | 'iniciou_pagamento' | 'em_aberto' | 'pago';
  formaPagamento: 'a_vista' | 'dividido' | 'cartao' | null;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  parcelas?: ParcelaPagamento[];
  observacoes?: string;
  /** Composição detalhada desta venda avulsa (aplicações, injetáveis, consulta, outros). */
  observacaoVenda?: ObservacaoVenda;
  dataUltimaAtualizacao: Date;
  dataVencimento?: Date;
  dataPagamento?: Date;
  dataVenda: Date;
  medicoId: string; // ID do médico que criou a venda
}

export type ObservacaoVendaPasta = 'aplicacoes' | 'injetaveis' | 'consulta' | 'outros';

export type ObservacaoVendaAplicacaoItem = {
  id: string;
  quantidade: number;
  mg: number;
  valorUnitario: number;
  valorTotal: number;
};

export type ObservacaoVendaInjetavelItem = {
  id: string;
  tipo: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type ObservacaoVendaConsultaItem = {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type ObservacaoVendaOutroItem = {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type ObservacaoVenda = {
  aplicacoes: ObservacaoVendaAplicacaoItem[];
  notasAplicacoes?: string;
  injetaveis: ObservacaoVendaInjetavelItem[];
  notasInjetaveis?: string;
  consultas: ObservacaoVendaConsultaItem[];
  notasConsulta?: string;
  outros: ObservacaoVendaOutroItem[];
  notasOutros?: string;
};

