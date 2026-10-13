import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  aplicarDadosAplicacaoSeMudou,
  assinaturaAplicacaoPaciente,
  mesclarDadosAplicacaoDoServidor,
} from '@/lib/metaadmin/mesclarDadosAplicacaoPaciente';

function paciente(partial: Partial<PacienteCompleto> = {}): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Ana',
    email: 'a@test.com',
    evolucaoSeguimento: [],
    planoTerapeutico: {
      metas: {},
      numeroSemanasTratamento: 16,
      esquemaDosesCustomizado: { 1: 7.5 },
    },
    ...partial,
  } as PacienteCompleto;
}

describe('mesclarDadosAplicacaoDoServidor', () => {
  it('traz o novo registro de aplicação e preserva semanas/doses locais', () => {
    const local = paciente();
    const fresh = paciente({
      evolucaoSeguimento: [
        {
          id: 's1',
          weekIndex: 1,
          peso: 90,
          doseAplicada: { quantidade: 2.5, data: new Date(), horario: '10:00' },
          adherence: 'ON_TIME',
        },
      ],
      planoTerapeutico: {
        metas: {},
        numeroSemanasTratamento: 16,
        datasAplicacaoIndividuais: { '1': '2026-06-01' },
      },
    });

    const out = mesclarDadosAplicacaoDoServidor(local, fresh);
    expect(out.evolucaoSeguimento).toHaveLength(1);
    expect(out.evolucaoSeguimento?.[0].peso).toBe(90);
    expect(out.planoTerapeutico?.datasAplicacaoIndividuais?.['1']).toBe('2026-06-01');
    expect(out.planoTerapeutico?.numeroSemanasTratamento).toBe(16);
    expect(out.planoTerapeutico?.esquemaDosesCustomizado?.[1]).toBe(7.5);
  });

  it('não recria o objeto quando a assinatura é igual', () => {
    const local = paciente({
      evolucaoSeguimento: [
        { id: 's1', weekIndex: 1, peso: 90, adherence: 'ON_TIME' },
      ],
    });
    expect(aplicarDadosAplicacaoSeMudou(local, { ...local })).toBe(local);
  });

  it('assinatura muda quando surge dose aplicada', () => {
    const a = paciente();
    const b = paciente({
      evolucaoSeguimento: [
        {
          id: 's1',
          weekIndex: 1,
          doseAplicada: { quantidade: 2.5, data: new Date(), horario: '10:00' },
        },
      ],
    });
    expect(assinaturaAplicacaoPaciente(a)).not.toBe(assinaturaAplicacaoPaciente(b));
  });
});
