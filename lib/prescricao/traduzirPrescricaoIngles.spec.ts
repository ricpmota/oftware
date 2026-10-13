import { describe, expect, it } from 'vitest';
import {
  parseTraducaoPrescricaoIngles,
  TraducaoPrescricaoError,
} from '@/lib/prescricao/traduzirPrescricaoIngles';

const source = {
  nome: 'Emagrecimento',
  descricao: '1. Metformina | Dosagem: 500 mg | Frequência: 2x ao dia',
  observacoes: 'Tomar após o café.',
  itens: [
    {
      medicamento: 'Metformina',
      dosagem: '500 mg',
      frequencia: '2x ao dia',
      instrucoes: 'Tomar após o café.',
      quantidade: '60 comprimidos',
    },
  ],
};

describe('parseTraducaoPrescricaoIngles', () => {
  it('aceita JSON em inglês com a mesma estrutura', () => {
    const raw = JSON.stringify({
      nome: 'Weight loss',
      descricao: '1. Metformin | Dosage: 500 mg | Frequency: twice a day',
      observacoes: 'Take after breakfast.',
      itens: [
        {
          medicamento: 'Metformin',
          dosagem: '500 mg',
          frequencia: 'twice a day',
          instrucoes: 'Take after breakfast.',
          quantidade: '60 tablets',
        },
      ],
    });
    expect(parseTraducaoPrescricaoIngles(raw, source).nome).toBe('Weight loss');
  });

  it('aceita JSON cercado por markdown', () => {
    const raw = '```json\n{"nome":"Weight loss","descricao":"Take 500 mg.","observacoes":"After breakfast.","itens":[{"medicamento":"Metformin","dosagem":"500 mg","frequencia":"twice a day","instrucoes":"Take after breakfast.","quantidade":"60 tablets"}]}\n```';
    expect(parseTraducaoPrescricaoIngles(raw, source).descricao).toBe('Take 500 mg.');
  });

  it('recusa quando a tradução apaga um item', () => {
    const raw = JSON.stringify({
      nome: 'Weight loss',
      descricao: 'Take 500 mg.',
      observacoes: 'After breakfast.',
      itens: [],
    });
    expect(() => parseTraducaoPrescricaoIngles(raw, source)).toThrow(TraducaoPrescricaoError);
  });
});
