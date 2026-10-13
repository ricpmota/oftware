import { describe, expect, it } from 'vitest';
import { alternarComorbidade, comorbidadesLegadoMarcadas, rotulosComorbidades } from './comorbidades';

describe('comorbidades', () => {
  it('nenhuma desmarca todas as condições, inclusive as antigas', () => {
    const next = alternarComorbidade(
      { hipertensaoArterial: true, anorexia: true, outraDescricao: 'Asma' },
      'nenhuma'
    );
    expect(next.nenhuma).toBe(true);
    expect(next.hipertensaoArterial).toBe(false);
    expect(next.anorexia).toBe(false);
    expect(next.outraDescricao).toBe('Asma');
  });

  it('marcar uma condição tira o nenhuma', () => {
    const next = alternarComorbidade({ nenhuma: true }, 'gastroparesia');
    expect(next.gastroparesia).toBe(true);
    expect(next.nenhuma).toBe(false);
  });

  it('histórico antigo só aparece se já estava marcado', () => {
    expect(comorbidadesLegadoMarcadas({ sop: true, anorexia: true }).map((opcao) => opcao.key)).toEqual(['sop']);
  });

  it('rótulos novos e antigos seguem o que foi salvo', () => {
    expect(
      rotulosComorbidades({
        retinopatiaDiabetica: true,
        doencaRenalCronica: true,
        outra: true,
        outraDescricao: 'Lúpus',
      })
    ).toEqual(['Retinopatia Diabética', 'Doença renal crônica', 'Lúpus']);
  });
});
