import { describe, expect, it } from 'vitest';
import {
  alertaDivergenciaObservacaoVenda,
  arredondarMoeda,
  chaveObservacaoVenda,
  criarItemAplicacao,
  criarItemInjetavel,
  criarObservacaoVendaVazia,
  hidratarObservacoesPorVenda,
  linhasTextoObservacaoVenda,
  observacaoVendaTemConteudo,
  totaisObservacaoVenda,
} from './observacaoVenda';

describe('observacaoVenda', () => {
  it('chaveia cada venda pelo índice', () => {
    expect(chaveObservacaoVenda(0)).toBe('0');
    expect(chaveObservacaoVenda(2)).toBe('2');
  });

  it('calcula totais de aplicações, injetáveis, consulta e outros', () => {
    const obs = criarObservacaoVendaVazia();
    obs.aplicacoes = [
      criarItemAplicacao({ quantidade: 4, mg: 2.5, valorUnitario: 150 }),
      criarItemAplicacao({ quantidade: 2, mg: 5, valorUnitario: 200 }),
    ];
    obs.injetaveis = [criarItemInjetavel({ tipo: 'B12', quantidade: 3, valorUnitario: 80 })];
    obs.consultas = [{ id: 'c1', descricao: 'Consulta inicial', quantidade: 1, valorUnitario: 400, valorTotal: 400 }];
    obs.outros = [{ id: 'o1', descricao: 'Bioimpedância', quantidade: 1, valorUnitario: 100, valorTotal: 100 }];

    const totais = totaisObservacaoVenda(obs);
    expect(totais.aplicacoes).toBe(1000);
    expect(totais.injetaveis).toBe(240);
    expect(totais.consulta).toBe(400);
    expect(totais.outros).toBe(100);
    expect(totais.aplicacoesInjetaveis).toBe(1240);
    expect(totais.composicao).toBe(1740);
  });

  it('alerta quando a soma da composição diverge do total da venda', () => {
    const obs = criarObservacaoVendaVazia();
    obs.aplicacoes = [criarItemAplicacao({ quantidade: 2, mg: 2.5, valorUnitario: 100 })];
    obs.injetaveis = [criarItemInjetavel({ tipo: 'B12', quantidade: 1, valorUnitario: 50 })];

    const alerta = alertaDivergenciaObservacaoVenda(obs, 400);
    expect(alerta.diverge).toBe(true);
    expect(alerta.totais.aplicacoesInjetaveis).toBe(250);
    expect(alerta.diferenca).toBe(-150);
  });

  it('não alerta quando a composição fecha com o total da venda', () => {
    const obs = criarObservacaoVendaVazia();
    obs.aplicacoes = [criarItemAplicacao({ quantidade: 2, mg: 2.5, valorUnitario: 100 })];
    obs.injetaveis = [criarItemInjetavel({ tipo: 'B12', quantidade: 1, valorUnitario: 50 })];
    obs.consultas = [{ id: 'c1', descricao: 'Consulta', quantidade: 1, valorUnitario: 150, valorTotal: 150 }];

    const alerta = alertaDivergenciaObservacaoVenda(obs, 400);
    expect(alerta.diverge).toBe(false);
    expect(alerta.diferenca).toBe(0);
  });

  it('não alerta se ainda não há valores preenchidos', () => {
    const alerta = alertaDivergenciaObservacaoVenda(criarObservacaoVendaVazia(), 500);
    expect(alerta.diverge).toBe(false);
  });

  it('hidrata observação legada na primeira venda', () => {
    const hidratado = hidratarObservacoesPorVenda({
      observacoes: 'Pacote antigo de 8 semanas',
    });
    expect(hidratado['0']?.notasOutros).toBe('Pacote antigo de 8 semanas');
    expect(observacaoVendaTemConteudo(hidratado['0'])).toBe(true);
  });

  it('não sobrescreve observação estruturada já existente', () => {
    const atual = criarObservacaoVendaVazia();
    atual.notasAplicacoes = 'Dose inicial';
    const hidratado = hidratarObservacoesPorVenda({
      observacoes: 'texto legado',
      observacoesPorVenda: { '0': atual },
    });
    expect(hidratado['0']?.notasAplicacoes).toBe('Dose inicial');
    expect(hidratado['0']?.notasOutros).toBeUndefined();
  });

  it('gera linhas de texto para o relatório', () => {
    const obs = criarObservacaoVendaVazia();
    obs.aplicacoes = [criarItemAplicacao({ quantidade: 4, mg: 2.5, valorUnitario: 150 })];
    obs.injetaveis = [criarItemInjetavel({ tipo: 'B12', quantidade: 2, valorUnitario: 80 })];
    const linhas = linhasTextoObservacaoVenda(obs);
    expect(linhas.some((l) => l.includes('Aplicações'))).toBe(true);
    expect(linhas.some((l) => l.includes('2.5 mg'))).toBe(true);
    expect(linhas.some((l) => l.includes('B12'))).toBe(true);
    expect(linhas.some((l) => l.includes('Soma aplicações + injetáveis'))).toBe(true);
  });

  it('arredonda moeda em centavos', () => {
    expect(arredondarMoeda(10.555)).toBe(10.56);
    expect(arredondarMoeda(10.554)).toBe(10.55);
  });
});
