import { describe, expect, it } from 'vitest';
import type { ParcelaPagamento } from '@/types/pagamento';
import {
  FIN_AUSENTE,
  montarFinanceiroPdfModel,
  pagamentoPosteriorAEmissao,
  rotuloStatusParcela,
} from '@/utils/relatorioFinanceiroPdfModel';

function parcela(parcial: Partial<ParcelaPagamento> & Pick<ParcelaPagamento, 'numero' | 'valor' | 'status'>): ParcelaPagamento {
  return {
    dataVencimento: new Date('2026-09-01T12:00:00'),
    ...parcial,
  };
}

describe('pagamentoPosteriorAEmissao', () => {
  const emissao = new Date('2026-09-24T08:00:00');

  it('marca data de pagamento posterior à emissão', () => {
    expect(pagamentoPosteriorAEmissao('2026-10-05', emissao)).toBe(true);
    expect(pagamentoPosteriorAEmissao('2026-09-24', emissao)).toBe(false);
  });
});

describe('montarFinanceiroPdfModel', () => {
  it('soma vendas e parcelas pela regra do controle financeiro e preserva status', () => {
    const emissao = new Date('2026-09-24T08:00:00');
    const model = montarFinanceiroPdfModel(
      [
        parcela({ numero: 1, valor: 1000, status: 'paga', dataPagamento: new Date('2026-08-01T12:00:00') }),
        parcela({
          numero: 2,
          valor: 500,
          status: 'atrasada',
          dataVenda: new Date('2026-07-01T12:00:00'),
        }),
        parcela({ numero: 1, valor: 200, status: 'pendente' }),
      ],
      new Date('2026-06-01T12:00:00'),
      emissao
    );
    expect(model.total).toBe(1700);
    expect(model.pago).toBe(1000);
    expect(model.pendente).toBe(700);
    expect(model.vendas.map((v) => v.label)).toEqual(['Venda Inicial', 'Venda 2']);
    expect(model.parcelas.map((p) => p.status)).toEqual(['Paga', 'Atrasada', 'Pendente']);
    expect(rotuloStatusParcela('cancelada').texto).toBe('Cancelada');
    expect(model.parcelas[2].forma).toBe(FIN_AUSENTE);
  });

  it('não altera o pago quando a data de pagamento é futura', () => {
    const model = montarFinanceiroPdfModel(
      [
        parcela({
          numero: 2,
          valor: 1200,
          status: 'paga',
          dataPagamento: new Date('2026-10-05T12:00:00'),
          dataVenda: new Date('2026-08-01T12:00:00'),
        }),
      ],
      new Date('2026-08-01T12:00:00'),
      new Date('2026-09-24T08:00:00')
    );
    expect(model.pago).toBe(1200);
    expect(model.parcelas[0].status).toBe('Paga');
    expect(model.parcelas[0].dataAConferir).toBe(true);
  });
});
