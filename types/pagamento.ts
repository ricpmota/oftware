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
  dataUltimaAtualizacao: Date;
  dataVencimento?: Date;
  dataPagamento?: Date;
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
  dataUltimaAtualizacao: Date;
  dataVencimento?: Date;
  dataPagamento?: Date;
  dataVenda: Date;
  medicoId: string; // ID do médico que criou a venda
}

