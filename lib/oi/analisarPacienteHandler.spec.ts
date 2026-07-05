import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { FaixaEtaria, FaixaIMC, FaixaMeta, FaixaPeso, OIConfiabilidade, type OIAnalysis } from '@/types/oi';
import {
  executarAnalisePacienteOi,
  parseAnalisarPacienteBody,
  rawFirestoreDocToPacienteCompleto,
} from '@/lib/oi/analisarPacienteHandler';
import { OI_MODEL_VERSION } from '@/lib/oi/OIVersion';

const mockAnalysis: OIAnalysis = {
  versaoModelo: OI_MODEL_VERSION,
  pacientesSemelhantes: 80,
  confiabilidade: OIConfiabilidade.Media,
  faixaMeta: FaixaMeta.Entre5_10,
  faixaIMC: FaixaIMC.Imc30_35,
  faixaPeso: FaixaPeso.Entre80_100,
  faixaEtaria: FaixaEtaria.Faixa40_49,
  tempoEstimadoSemanas: 24,
  tempoMinimoSemanas: 20,
  tempoMaximoSemanas: 28,
  mgEstimado: 130,
  mgMinimo: 115,
  mgMaximo: 145,
  aplicacoesEstimadas: 24,
  aplicacoesMinimas: 20,
  aplicacoesMaximas: 28,
  perdaMediaKg: 9,
  perdaMediaPercentual: 9,
  probabilidadeAtingirMeta: 0.7,
  benchmarkUtilizado: 'test/fixture',
  observacoes: ['teste'],
};

describe('parseAnalisarPacienteBody', () => {
  it('rejeita body sem pacienteId', () => {
    expect(parseAnalisarPacienteBody({})).toEqual({ error: 'Informe pacienteId.' });
    expect(parseAnalisarPacienteBody(null)).toEqual({ error: 'Body JSON inválido.' });
  });

  it('aceita pacienteId válido', () => {
    expect(parseAnalisarPacienteBody({ pacienteId: ' abc ' })).toEqual({ pacienteId: 'abc' });
  });
});

describe('executarAnalisePacienteOi', () => {
  it('retorna 404 quando paciente não existe', async () => {
    const result = await executarAnalisePacienteOi('missing', {
      fetchPacienteRaw: async () => null,
    });
    expect(result).toEqual({
      ok: false,
      status: 404,
      error: 'Paciente não encontrado.',
    });
  });

  it('retorna OIAnalysis sem expor documento bruto', async () => {
    const rawDoc = {
      dadosIdentificacao: {
        nomeCompleto: 'Nome Secreto',
        email: 'secreto@example.com',
        endereco: {},
        dataCadastro: new Date(),
      },
      dadosClinicos: {
        medidasIniciais: { peso: 100, altura: 170 },
      },
      planoTerapeutico: {
        metas: { weightLossTargetType: 'PERCENTUAL', weightLossTargetValue: 10 },
      },
      evolucaoSeguimento: [
        {
          id: '1',
          weekIndex: 1,
          dataRegistro: new Date(),
          peso: 100,
          doseAplicada: { quantidade: 2.5, data: new Date(), horario: '08:00' },
          adherence: 'ON_TIME',
        },
      ],
      estiloVida: {},
      examesLaboratoriais: [],
      alertas: [],
      comunicacao: {},
      indicadores: {},
      status: 'ativo',
      statusTratamento: 'em_tratamento',
    };

    const result = await executarAnalisePacienteOi('pid-1', {
      fetchPacienteRaw: async () => rawDoc,
      analisar: () => mockAnalysis,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.versaoModelo).toBe(OI_MODEL_VERSION);
    expect(JSON.stringify(result)).not.toContain('Nome Secreto');
    expect(JSON.stringify(result)).not.toContain('secreto@');
    expect(JSON.stringify(result)).not.toContain('pid-1');
  });
});

describe('rawFirestoreDocToPacienteCompleto', () => {
  it('normaliza documento mínimo', () => {
    const p = rawFirestoreDocToPacienteCompleto('id-x', {
      dadosIdentificacao: { nomeCompleto: 'X', email: 'x@y.com', endereco: {}, dataCadastro: new Date() },
      dadosClinicos: { medidasIniciais: { peso: 90 } },
      evolucaoSeguimento: [],
    });
    expect(p.id).toBe('id-x');
    expect((p as PacienteCompleto).dadosClinicos?.medidasIniciais?.peso).toBe(90);
  });
});
