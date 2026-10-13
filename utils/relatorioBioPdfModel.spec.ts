import { describe, expect, it } from 'vitest';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { getBioRange } from '@/utils/bioImpedanciaRanges';
import {
  classificarBio,
  formatarVariacaoBio,
  montarBioPdfModel,
  ordenarBioExames,
  posicaoMarcadorBio,
} from '@/utils/relatorioBioPdfModel';

function exame(parcial: Partial<BioImpedanciaRegistro> & { dataRegistro: Date; peso: number }): BioImpedanciaRegistro {
  return {
    composicaoCorporal: {
      aguaTotalLitros: 0,
      proteinasKg: 0,
      mineraisKg: 0,
      massaGorduraKg: 0,
    },
    analiseMusculoGordura: { massaMuscularKg: 0, massaGorduraKg: 0 },
    analiseObesidade: { percentualGordura: 0 },
    massaMagraSegmentar: {
      arm_r: { kg: 0, percentual: 0 },
      arm_l: { kg: 0, percentual: 0 },
      trunk: { kg: 0, percentual: 0 },
      leg_r: { kg: 0, percentual: 0 },
      leg_l: { kg: 0, percentual: 0 },
    },
    ...parcial,
  };
}

describe('ordenarBioExames', () => {
  it('ordena pela data e desempatam id e ordem original', () => {
    const dia = new Date('2026-09-14T12:00:00');
    const antigo = exame({ id: 'a', dataRegistro: new Date('2026-01-02T12:00:00'), peso: 120 });
    const b = exame({ id: 'b', dataRegistro: dia, peso: 116 });
    const c = exame({ id: 'a2', dataRegistro: dia, peso: 116.1 });
    const ordenados = ordenarBioExames([c, antigo, b]);
    expect(ordenados.map((item) => item.id)).toEqual(['a', 'a2', 'b']);
    expect(ordenarBioExames([c, antigo, b])[2].peso).toBe(116);
  });
});

describe('escala de bioimpedância', () => {
  it('marca acima da referência sem cair na faixa normal', () => {
    const range = getBioRange('percentualGordura', 'M', 116.1);
    expect(range).not.toBeNull();
    const pct = posicaoMarcadorBio(32.5, range!);
    expect(classificarBio(32.5, range!)).toBe('Acima');
    expect(pct).toBeGreaterThan(60);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it('prende o marcador na extremidade quando o valor passa da escala', () => {
    const range = getBioRange('percentualGordura', 'M', 80);
    expect(range).not.toBeNull();
    expect(posicaoMarcadorBio(400, range!)).toBe(100);
    expect(posicaoMarcadorBio(-20, range!)).toBe(0);
    expect(classificarBio(400, range!)).toBe('Acima');
    expect(classificarBio(-20, range!)).toBe('Abaixo');
  });

  it('não cria escala para gordura visceral', () => {
    const model = montarBioPdfModel(
      [
        exame({
          dataRegistro: new Date('2026-09-14T12:00:00'),
          peso: 116.1,
          gorduraVisceral: 17,
          massaGorduraKg: 37.7,
          analiseMusculoGordura: { massaMuscularKg: 44.9, massaGorduraKg: 37.7 },
          composicaoCorporal: { aguaTotalLitros: 0, proteinasKg: 0, mineraisKg: 0, massaGorduraKg: 37.7 },
        }),
      ],
      'M'
    );
    expect(model.atuais.map((item) => item.texto)).toContain('116,1 kg');
    expect(model.atuais.map((item) => item.texto)).toContain('37,7 kg');
    expect(model.atuais.map((item) => item.texto)).toContain('17');
    expect(model.escalas.some((item) => item.label === 'Gordura visceral')).toBe(false);
    expect(model.escalas.some((item) => item.label === 'Massa de gordura')).toBe(true);
  });
});

describe('formatarVariacaoBio', () => {
  it('trata queda de percentual como pontos percentuais', () => {
    expect(formatarVariacaoBio(33.9, 32.5, '%')).toBe('-1,4 p.p.');
  });
});
