import { describe, expect, it } from 'vitest';
import {
  buildConsultaAgendaResumo,
  consultaResumoForPaciente,
  type ConsultaAgendaItem,
} from './profissionalPacienteResumo';

function slot(
  overrides: Partial<ConsultaAgendaItem> & Pick<ConsultaAgendaItem, 'date' | 'realizada'>
): ConsultaAgendaItem {
  return {
    pacienteId: 'pac-1',
    startTime: '10:00',
    endTime: '11:00',
    ...overrides,
  };
}

describe('buildConsultaAgendaResumo', () => {
  it('devolve vazio sem agendamentos', () => {
    expect(buildConsultaAgendaResumo([], '2026-08-25')).toEqual({});
  });

  it('escolhe a próxima consulta futura não executada', () => {
    const resumo = buildConsultaAgendaResumo(
      [
        slot({ date: '2026-08-20', realizada: false, startTime: '09:00' }),
        slot({ date: '2026-08-28', realizada: false, startTime: '14:00' }),
        slot({ date: '2026-09-02', realizada: false, startTime: '08:00' }),
      ],
      '2026-08-25'
    );
    expect(resumo.proxima?.date).toBe('2026-08-28');
    expect(resumo.ultimaNaoRealizada?.date).toBe('2026-08-20');
  });

  it('separa realizada e não executada', () => {
    const resumo = buildConsultaAgendaResumo(
      [
        slot({ date: '2026-08-10', realizada: true }),
        slot({ date: '2026-08-18', realizada: false }),
      ],
      '2026-08-25'
    );
    expect(resumo.ultimaRealizada?.date).toBe('2026-08-10');
    expect(resumo.ultimaNaoRealizada?.date).toBe('2026-08-18');
    expect(resumo.proxima).toBeUndefined();
  });
});

describe('consultaResumoForPaciente', () => {
  it('prioriza o id do documento do paciente', () => {
    const map = {
      'doc-1': { proxima: slot({ date: '2026-08-28', realizada: false, pacienteId: 'doc-1' }) },
      uidAuth: { proxima: slot({ date: '2026-09-01', realizada: false, pacienteId: 'uidAuth' }) },
    };
    expect(consultaResumoForPaciente(map, { id: 'doc-1', userId: 'uidAuth' }).proxima?.date).toBe(
      '2026-08-28'
    );
  });
});
