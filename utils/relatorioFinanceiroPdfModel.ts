/**
 * Resumo financeiro do PDF. Os totais seguem o Controle Financeiro:
 * soma das vendas agrupadas, e pago somente quando a parcela está com status paga.
 */
import type { ParcelaPagamento } from '@/types/pagamento';
import {
  obterGruposParcelasPorVenda,
  toDatePagamento,
  type GrupoVendaParcelas,
} from '@/lib/profissional/controleFinanceiroParcelas';

export const FIN_AUSENTE = '\u2014';

export type DestaqueParcela = 'pago' | 'pendente' | 'atrasada' | 'atencao' | 'neutro';

export type ParcelaPdf = {
  venda: string;
  numero: string;
  valor: number | null;
  vencimento: unknown;
  pagamento: unknown;
  dataAConferir: boolean;
  status: string;
  destaque: DestaqueParcela;
  forma: string;
};

export type VendaPdf = {
  label: string;
  data: Date;
  total: number;
  pago: number;
  pendente: number;
  ordemOriginal: number;
};

export type FinanceiroPdfModel = {
  vendas: VendaPdf[];
  parcelas: ParcelaPdf[];
  quantidadeVendas: number;
  quantidadeParcelas: number;
  total: number;
  pago: number;
  pendente: number;
};

export function calendarioLocal(valor: unknown): string | null {
  if (typeof valor === 'string') {
    const m = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const data = valor instanceof Date ? valor : toDatePagamento(valor);
  if (!data) return null;
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Pagamento registrado depois do dia de emissão do relatório. */
export function pagamentoPosteriorAEmissao(dataPagamento: unknown, emissao: Date): boolean {
  const pagamento = calendarioLocal(dataPagamento);
  const emitido = calendarioLocal(emissao);
  if (!pagamento || !emitido) return false;
  return pagamento > emitido;
}

export function rotuloStatusParcela(status: string | undefined): { texto: string; destaque: DestaqueParcela } {
  if (status === 'paga') return { texto: 'Paga', destaque: 'pago' };
  if (status === 'pendente') return { texto: 'Pendente', destaque: 'pendente' };
  if (status === 'atrasada') return { texto: 'Atrasada', destaque: 'atrasada' };
  if (status === 'cancelada') return { texto: 'Cancelada', destaque: 'atencao' };
  if (status === 'estornada') return { texto: 'Estornada', destaque: 'atencao' };
  const bruto = (status || '').trim();
  if (!bruto) return { texto: FIN_AUSENTE, destaque: 'neutro' };
  return { texto: bruto, destaque: 'atencao' };
}

function rotuloForma(forma: ParcelaPagamento['formaPagamento'] | undefined): string {
  if (forma === 'dinheiro') return 'Dinheiro';
  if (forma === 'pix') return 'Pix';
  if (forma === 'cartao_credito') return 'Crédito';
  if (forma === 'cartao_debito') return 'Débito';
  if (forma === 'transferencia') return 'Transf.';
  if (forma === 'boleto') return 'Boleto';
  return FIN_AUSENTE;
}

function numeroOuNulo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function ordenarVendas(grupos: GrupoVendaParcelas[]): Array<GrupoVendaParcelas & { ordemOriginal: number }> {
  return grupos
    .map((grupo, ordemOriginal) => ({ ...grupo, ordemOriginal }))
    .sort((a, b) => {
      const ta = a.data instanceof Date && !Number.isNaN(a.data.getTime()) ? a.data.getTime() : null;
      const tb = b.data instanceof Date && !Number.isNaN(b.data.getTime()) ? b.data.getTime() : null;
      if (ta == null && tb == null) return a.ordemOriginal - b.ordemOriginal;
      if (ta == null) return 1;
      if (tb == null) return -1;
      if (ta !== tb) return ta - tb;
      return a.ordemOriginal - b.ordemOriginal;
    });
}

export function montarFinanceiroPdfModel(
  parcelas: ParcelaPagamento[],
  dataVendaFallback: Date,
  emissao: Date
): FinanceiroPdfModel {
  const grupos = parcelas.length ? ordenarVendas(obterGruposParcelasPorVenda(parcelas, dataVendaFallback)) : [];
  const vendas: VendaPdf[] = grupos.map((grupo) => ({
    label: grupo.label,
    data: grupo.data,
    total: grupo.valorTotal,
    pago: grupo.valorPago,
    pendente: grupo.valorPendente,
    ordemOriginal: grupo.ordemOriginal,
  }));
  const linhas: ParcelaPdf[] = [];
  for (const grupo of grupos) {
    grupo.indices.forEach((indice, posicao) => {
      const parcela = parcelas[indice];
      const status = rotuloStatusParcela(parcela?.status);
      const dataAConferir =
        parcela?.status === 'paga' && pagamentoPosteriorAEmissao(parcela.dataPagamento, emissao);
      linhas.push({
        venda: grupo.label,
        numero: Number.isFinite(parcela?.numero) ? String(parcela.numero) : String(posicao + 1),
        valor: numeroOuNulo(parcela?.valor),
        vencimento: parcela?.dataVencimento,
        pagamento: parcela?.dataPagamento,
        dataAConferir,
        status: status.texto,
        destaque: dataAConferir ? 'atencao' : status.destaque,
        forma: rotuloForma(parcela?.formaPagamento),
      });
    });
  }
  const total = vendas.reduce((soma, venda) => soma + venda.total, 0);
  const pago = vendas.reduce((soma, venda) => soma + venda.pago, 0);
  const pendente = vendas.reduce((soma, venda) => soma + venda.pendente, 0);
  return {
    vendas,
    parcelas: linhas,
    quantidadeVendas: vendas.length,
    quantidadeParcelas: linhas.length,
    total,
    pago,
    pendente,
  };
}
