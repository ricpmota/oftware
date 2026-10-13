import { describe, expect, it } from 'vitest';
import {
  addLembreteInterval,
  agruparRecorrencias,
  formatarIntervaloRecorrencia,
  formatDdMmYy,
  gerarDatasRecorrencia,
  maskDdMmYy,
  parseDdMmYy,
} from './lembreteRecorrencia';
import type { Lembrete } from '@/types/lembrete';

describe('addLembreteInterval', () => {
  it('avança semanas', () => {
    expect(addLembreteInterval('2026-01-15', 4, 'semanas')).toBe('2026-02-12');
  });

  it('avança meses preservando o dia', () => {
    expect(addLembreteInterval('2026-01-15', 3, 'meses')).toBe('2026-04-15');
  });

  it('ajusta o último dia do mês quando o dia não existe', () => {
    expect(addLembreteInterval('2026-01-31', 1, 'meses')).toBe('2026-02-28');
  });
});

describe('gerarDatasRecorrencia', () => {
  it('gera a quantidade pedida de ocorrências', () => {
    expect(
      gerarDatasRecorrencia({
        dataInicio: '2026-01-15',
        intervalo: 3,
        unidade: 'meses',
        quantidade: 3,
      })
    ).toEqual(['2026-01-15', '2026-04-15', '2026-07-15']);
  });

  it('para na data final inclusive', () => {
    expect(
      gerarDatasRecorrencia({
        dataInicio: '2026-01-15',
        intervalo: 3,
        unidade: 'meses',
        dataFinal: '2026-08-01',
      })
    ).toEqual(['2026-01-15', '2026-04-15', '2026-07-15']);
  });

  it('não gera série sem prazo final', () => {
    expect(
      gerarDatasRecorrencia({
        dataInicio: '2026-01-15',
        intervalo: 3,
        unidade: 'meses',
      })
    ).toEqual([]);
  });
});

describe('DD/MM/YY', () => {
  it('formata e interpreta data curta', () => {
    expect(formatDdMmYy('2026-09-06')).toBe('06/09/26');
    expect(parseDdMmYy('06/09/26')).toBe('2026-09-06');
    expect(maskDdMmYy('060926')).toBe('06/09/26');
  });

  it('rejeita data inválida', () => {
    expect(parseDdMmYy('31/02/26')).toBeNull();
  });
});

describe('formatarIntervaloRecorrencia', () => {
  it('formata meses e semanas', () => {
    expect(formatarIntervaloRecorrencia(3, 'meses')).toBe('a cada 3 meses');
    expect(formatarIntervaloRecorrencia(1, 'meses')).toBe('a cada 1 mês');
    expect(formatarIntervaloRecorrencia(1, 'semanas')).toBe('a cada 1 semana');
    expect(formatarIntervaloRecorrencia(4, 'semanas')).toBe('a cada 4 semanas');
  });
});

describe('agruparRecorrencias', () => {
  it('agrupa instâncias da mesma série', () => {
    const lembretes = [
      {
        id: 'a',
        pacienteId: 'p1',
        pacienteNome: 'Ana',
        data: '2026-01-15',
        texto: 'Exames laboratoriais',
        tag: 'Exames',
        criadoEm: new Date(),
        recorrenciaId: 'r1',
        recorrenciaIntervalo: 3,
        recorrenciaUnidade: 'meses',
        concluido: true,
      },
      {
        id: 'b',
        pacienteId: 'p1',
        pacienteNome: 'Ana',
        data: '2026-04-15',
        texto: 'Exames laboratoriais',
        tag: 'Exames',
        criadoEm: new Date(),
        recorrenciaId: 'r1',
        recorrenciaIntervalo: 3,
        recorrenciaUnidade: 'meses',
        concluido: false,
      },
    ] as Lembrete[];

    const grupos = agruparRecorrencias(lembretes);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].total).toBe(2);
    expect(grupos[0].pendentes).toBe(1);
    expect(grupos[0].intervalo).toBe(3);
  });
});
