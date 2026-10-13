import { describe, expect, it } from 'vitest';
import {
  calcularTotalInjetaveis,
  totalLinhaProtocoloInjetavel,
  valorSemanalProtocoloInjetavel,
  anexarInjetaveisAoGrafico,
} from '@/lib/treatment-negotiation/protocolosInjetaveis';
import type { ProtocoloInjetavelNegociado } from '@/lib/treatment-negotiation/types';

function proto(
  patch: Partial<ProtocoloInjetavelNegociado>
): ProtocoloInjetavelNegociado {
  return {
    id: 'p1',
    protocoloId: 'proto-1',
    protocoloNome: 'NAD',
    itens: [],
    semanas: 8,
    semanasAplicacao: [1, 2, 3, 4, 5, 6, 7, 8],
    observacoesPorSemana: {},
    valorUnitario: 100,
    valorTotalManual: null,
    ...patch,
  };
}

describe('protocolosInjetaveis', () => {
  it('soma semanas × unitário do protocolo quando itens não têm preço', () => {
    const p = proto({ semanas: 8, semanasAplicacao: [1, 2, 3, 4, 5, 6, 7, 8], valorUnitario: 150 });
    expect(valorSemanalProtocoloInjetavel(p)).toBe(150);
    expect(totalLinhaProtocoloInjetavel(p)).toBe(1200);
  });

  it('usa soma dos valores unitários dos itens quando preenchidos', () => {
    const p = proto({
      valorUnitario: 999,
      semanasAplicacao: [1, 2, 3, 4, 5, 6, 7, 8],
      itens: [
        { medicamento: 'NAD', dosagem: '500mg', frequencia: '1x/sem', valorUnitario: 180 },
        { medicamento: 'B12', dosagem: '1ml', frequencia: '1x/sem', valorUnitario: 40 },
      ],
    });
    expect(valorSemanalProtocoloInjetavel(p)).toBe(220);
    expect(totalLinhaProtocoloInjetavel(p)).toBe(1760);
  });

  it('cobra só as semanas selecionadas', () => {
    const p = proto({ semanas: 8, semanasAplicacao: [2, 4, 6], valorUnitario: 100 });
    expect(totalLinhaProtocoloInjetavel(p)).toBe(300);
  });

  it('respeita total manual da linha', () => {
    const p = proto({ valorTotalManual: 500, semanas: 8, valorUnitario: 100 });
    expect(totalLinhaProtocoloInjetavel(p)).toBe(500);
  });

  it('anexa injetáveis nas semanas escolhidas do gráfico', () => {
    const pontos = anexarInjetaveisAoGrafico(
      [
        { semana: 1, semanaLabel: 'S1', pesoPrevisto: 90, pesoPerdaMaxKg: null, pesoPerdaMinKg: null, pesoAlvo: 80, doseSemanalMg: 2.5, marcadores: [] },
        { semana: 2, semanaLabel: 'S2', pesoPrevisto: 89, pesoPerdaMaxKg: null, pesoPerdaMinKg: null, pesoAlvo: 80, doseSemanalMg: 2.5, marcadores: [] },
      ],
      [
        proto({
          itens: [{ medicamento: 'NAD', dosagem: '', frequencia: '', valorUnitario: 0 }],
          semanasAplicacao: [2],
          observacoesPorSemana: { '2': 'NAD 500mg' },
        }),
      ],
      4
    );
    expect(pontos[0].injetaveis).toEqual([]);
    expect(pontos[1].injetaveis?.[0].observacao).toBe('NAD 500mg');
  });
});

