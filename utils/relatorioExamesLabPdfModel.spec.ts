import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { LAB_AUSENTE, montarLabPdfModel } from '@/utils/relatorioExamesLabPdfModel';

function paciente(): PacienteCompleto {
  return {
    id: 'antonio',
    nome: 'Antônio Costa',
    dadosIdentificacao: {
      nomeCompleto: 'Antônio Costa',
      sexoBiologico: 'M',
      dataNascimento: '1978-03-02',
    },
    examesLaboratoriais: [
      {
        id: 'c2',
        dataColeta: '2026-08-08',
        glicemiaJejum: 89,
        hemoglobinaGlicada: 5.4,
        hdl: 34,
        vitaminaD: 23.9,
        homaIr: 2.8,
        ferritina: 180,
      },
      {
        id: 'c1',
        dataColeta: '2026-03-05',
        glicemiaJejum: 85,
        hemoglobinaGlicada: 5.6,
        hdl: 38,
        vitaminaD: 29.2,
        ureia: 32,
        creatinina: 0.9,
        sodio: 140,
        potassio: 4.2,
        t4Livre: 1.2,
      },
    ],
  } as unknown as PacienteCompleto;
}

describe('montarLabPdfModel', () => {
  const model = montarLabPdfModel(paciente());
  const linha = (key: string) => model.grupos.flatMap((g) => g.marcadores).find((item) => item.key === key);

  it('ordena as coletas da mais antiga para a mais recente', () => {
    expect(model.coletas).toHaveLength(2);
    expect(model.coletas[0].tempo).toBeLessThan(model.coletas[1].tempo || 0);
  });

  it('mantém o marcador na mesma linha e preserva ausência com travessão', () => {
    const glicemia = linha('glicemiaJejum');
    const hba = linha('hemoglobinaGlicada');
    const hdl = linha('hdl');
    const vitamina = linha('vitaminaD');
    const homa = linha('homaIr');
    const ureia = linha('ureia');
    expect(glicemia?.celulas.map((c) => c.texto)).toEqual(['85', '89']);
    expect(hba?.celulas.map((c) => c.texto)).toEqual(['5,6', '5,4']);
    expect(hdl?.celulas.map((c) => c.texto)).toEqual(['38', '34']);
    expect(vitamina?.celulas.map((c) => c.texto)).toEqual(['29,2', '23,9']);
    expect(homa?.celulas.map((c) => c.texto)).toEqual([LAB_AUSENTE, '2,8']);
    expect(ureia?.celulas.map((c) => c.texto)).toEqual(['32', LAB_AUSENTE]);
    expect(linha('ferritina')).toBeTruthy();
    expect(linha('t4Livre')?.celulas[1].texto).toBe(LAB_AUSENTE);
  });

  it('classifica a medição mais recente pela faixa do sistema, sem usar o ideal', () => {
    expect(linha('hdl')?.situacao).toBe('Abaixo');
    expect(linha('vitaminaD')?.situacao).toBe('Abaixo');
    expect(linha('glicemiaJejum')?.situacao).toBe('Dentro');
    expect(linha('hdl')?.referencia).toContain('(M)');
    expect(linha('hemoglobinaGlicada')?.referencia).not.toContain('HbA1c');
    expect(linha('hdl')?.referencia.toLowerCase()).not.toContain('ideal');
  });
});
