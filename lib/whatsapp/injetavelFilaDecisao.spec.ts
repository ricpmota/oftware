import { describe, expect, it } from 'vitest';
import type { PacienteCompleto, PlanoInjetavelAplicacao } from '@/types/obesidade';
import {
  decisaoLembreteInjetavelWhatsapp,
  idsProtocolosInjetaveis,
} from '@/lib/whatsapp/injetavelFilaDecisao';

function aplicacao(parcial: Partial<PlanoInjetavelAplicacao> = {}): PlanoInjetavelAplicacao {
  return {
    id: 'inj-1',
    protocoloId: 'prot-1',
    protocoloNome: 'Vitamina',
    numeroSemanasTratamento: 4,
    ...parcial,
  };
}

function paciente(parcial: Partial<PacienteCompleto> = {}): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Teste',
    email: 't@test.com',
    statusTratamento: 'em_tratamento',
    evolucaoSeguimento: [],
    planoTerapeutico: {
      metas: {},
      injetaveisAplicacoes: [aplicacao()],
    },
    ...parcial,
  } as PacienteCompleto;
}

describe('decisaoLembreteInjetavelWhatsapp', () => {
  it('não envia se o paciente não está em tratamento', () => {
    const d = decisaoLembreteInjetavelWhatsapp(
      paciente({ statusTratamento: 'concluido' }),
      'inj-1',
      1,
    );
    expect(d).toEqual({
      pular: true,
      motivo: 'Paciente não está em tratamento.',
      sairDaFila: false,
    });
  });

  it('sai da fila se o protocolo foi apagado', () => {
    const d = decisaoLembreteInjetavelWhatsapp(
      paciente({
        planoTerapeutico: { metas: {}, injetaveisAplicacoes: [] },
      }),
      'inj-1',
      2,
    );
    expect(d.pular).toBe(true);
    if (d.pular) {
      expect(d.sairDaFila).toBe(true);
      expect(d.motivo).toMatch(/não existe mais/);
    }
  });

  it('sai da fila se a semana foi cancelada', () => {
    const d = decisaoLembreteInjetavelWhatsapp(
      paciente({
        planoTerapeutico: {
          metas: {},
          injetaveisAplicacoes: [aplicacao({ semanasCanceladas: [2] })],
        },
      }),
      'inj-1',
      2,
    );
    expect(d).toMatchObject({ pular: true, sairDaFila: true });
  });

  it('mantém na fila se o protocolo ainda está no plano', () => {
    const d = decisaoLembreteInjetavelWhatsapp(paciente(), 'inj-1', 1);
    expect(d).toEqual({ pular: false, realizada: false });
  });

  it('não reenvia semana já marcada como aplicada', () => {
    const d = decisaoLembreteInjetavelWhatsapp(
      paciente({
        planoTerapeutico: {
          metas: {},
          injetaveisAplicacoes: [aplicacao({ realizadoPorSemana: { '1': true } })],
        },
      }),
      'inj-1',
      1,
    );
    expect(d).toEqual({ pular: false, realizada: true });
  });
});

describe('idsProtocolosInjetaveis', () => {
  it('lista só os ids ainda no plano', () => {
    const ids = idsProtocolosInjetaveis({
      injetaveisAplicacoes: [{ id: ' a ' }, { id: '' }, { protocoloNome: 'sem id' }, { id: 'b' }],
    });
    expect([...ids]).toEqual(['a', 'b']);
  });
});
