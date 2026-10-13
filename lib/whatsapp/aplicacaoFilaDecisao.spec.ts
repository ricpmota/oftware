import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { decisaoLembreteAplicacaoWhatsapp } from '@/lib/whatsapp/aplicacaoFilaDecisao';

function paciente(parcial: Partial<PacienteCompleto>): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Teste',
    email: 't@test.com',
    statusTratamento: 'em_tratamento',
    evolucaoSeguimento: [],
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2026, 0, 5),
      numeroSemanasTratamento: 4,
      currentDoseMg: 2.5,
    },
    ...parcial,
  } as PacienteCompleto;
}

describe('decisaoLembreteAplicacaoWhatsapp', () => {
  it('não envia se o paciente não está em tratamento', () => {
    const d = decisaoLembreteAplicacaoWhatsapp(
      paciente({ statusTratamento: 'concluido' }),
      1,
    );
    expect(d).toEqual({ pular: true, motivo: 'Paciente não está em tratamento.' });
  });

  it('não envia se o plano não tem mais a semana', () => {
    const d = decisaoLembreteAplicacaoWhatsapp(
      paciente({
        planoTerapeutico: { metas: {} },
      }),
      3,
    );
    expect(d.pular).toBe(true);
    if (d.pular) {
      expect(d.motivo).toMatch(/não existe mais/);
    }
  });

  it('envia se a semana ainda está no plano e não foi aplicada', () => {
    const d = decisaoLembreteAplicacaoWhatsapp(paciente({}), 1);
    expect(d).toEqual({ pular: false, registrada: false });
  });
});
