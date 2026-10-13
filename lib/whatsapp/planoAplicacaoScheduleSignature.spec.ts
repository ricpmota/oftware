import { describe, expect, it } from 'vitest';
import {
  planoAplicacaoScheduleSignature,
  planosAplicacaoScheduleSignatureChanged,
} from '@/lib/whatsapp/planoAplicacaoScheduleSignature';

describe('planoAplicacaoScheduleSignature', () => {
  it('é estável independentemente da ordem do mapa', () => {
    const a = planoAplicacaoScheduleSignature({
      startDate: '2026-01-05',
      injectionDayOfWeek: 'seg',
      numeroSemanasTratamento: 18,
      semanasCanceladas: [3, 1],
      datasAplicacaoIndividuais: { '2': '2026-01-12', '1': '2026-01-05' },
    });
    const b = planoAplicacaoScheduleSignature({
      startDate: new Date(2026, 0, 5),
      injectionDayOfWeek: 'seg',
      numeroSemanasTratamento: 18,
      semanasCanceladas: [1, 3],
      datasAplicacaoIndividuais: { '1': '2026-01-05', '2': '2026-01-12' },
    });
    expect(a).toBe(b);
  });

  it('detecta mudança de data individual', () => {
    const before = {
      startDate: '2026-01-05',
      injectionDayOfWeek: 'seg',
      numeroSemanasTratamento: 18,
      datasAplicacaoIndividuais: { '1': '2026-01-05' },
    };
    const after = {
      ...before,
      datasAplicacaoIndividuais: { '1': '2026-01-07' },
    };
    expect(planosAplicacaoScheduleSignatureChanged(before, after)).toBe(true);
  });

  it('ignora mudança irrelevante ao calendário', () => {
    const before = {
      startDate: '2026-01-05',
      injectionDayOfWeek: 'seg',
      numeroSemanasTratamento: 18,
    };
    const after = {
      ...before,
      currentDoseMg: 5,
    };
    expect(planosAplicacaoScheduleSignatureChanged(before, after)).toBe(false);
  });

  it('detecta mudança de datas ou realizado de injetáveis', () => {
    const before = {
      injetaveisAplicacoes: [
        {
          id: 'inj-1',
          startDate: '2026-07-01',
          numeroSemanasTratamento: 4,
          datasAplicacaoIndividuais: { '1': '2026-07-01' },
          realizadoPorSemana: {},
        },
      ],
    };
    const afterDate = {
      injetaveisAplicacoes: [
        {
          id: 'inj-1',
          startDate: '2026-07-01',
          numeroSemanasTratamento: 4,
          datasAplicacaoIndividuais: { '1': '2026-07-02' },
          realizadoPorSemana: {},
        },
      ],
    };
    const afterRealizado = {
      injetaveisAplicacoes: [
        {
          id: 'inj-1',
          startDate: '2026-07-01',
          numeroSemanasTratamento: 4,
          datasAplicacaoIndividuais: { '1': '2026-07-01' },
          realizadoPorSemana: { '1': true },
        },
      ],
    };
    expect(planosAplicacaoScheduleSignatureChanged(before, afterDate)).toBe(true);
    expect(planosAplicacaoScheduleSignatureChanged(before, afterRealizado)).toBe(true);
  });
});
