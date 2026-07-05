import { describe, expect, it } from 'vitest';
import {
  assignFaixaMeta,
  buildBenchmarks,
  buildPacienteConsolidado,
  generatePacienteAnonId,
  MIN_BENCHMARK_SAMPLE,
} from '@/lib/oi/weightLossExport';
import { normalizePacienteDocument } from '@/lib/oi/normalizePacienteFirestore';

const SALT = 'test-salt-min-16-chars';

describe('generatePacienteAnonId', () => {
  it('é determinístico e não contém o id real', () => {
    const a = generatePacienteAnonId('abc123', SALT);
    const b = generatePacienteAnonId('abc123', SALT);
    expect(a).toBe(b);
    expect(a.startsWith('oi_')).toBe(true);
    expect(a).not.toContain('abc123');
  });
});

describe('assignFaixaMeta', () => {
  it('mapeia faixas corretamente', () => {
    expect(assignFaixaMeta(4)).toBe('ate_5');
    expect(assignFaixaMeta(8)).toBe('5_a_10');
    expect(assignFaixaMeta(12)).toBe('10_a_15');
    expect(assignFaixaMeta(18)).toBe('15_a_20');
    expect(assignFaixaMeta(25)).toBe('acima_20');
    expect(assignFaixaMeta(null)).toBe(null);
  });
});

describe('buildPacienteConsolidado', () => {
  it('consolida paciente elegível sem PII', () => {
    const raw = normalizePacienteDocument('real-id-secreto', {
      statusTratamento: 'em_tratamento',
      dadosIdentificacao: {
        nomeCompleto: 'Maria Secreta',
        email: 'maria@example.com',
        sexoBiologico: 'F',
        dataNascimento: new Date('1980-06-15'),
      },
      dadosClinicos: {
        medidasIniciais: { peso: 100, altura: 170, imc: 34.6 },
      },
      planoTerapeutico: {
        metas: { weightLossTargetType: 'PERCENTUAL', weightLossTargetValue: 10 },
        currentDoseMg: 5,
        startDate: new Date('2025-01-01'),
      },
      evolucaoSeguimento: [
        {
          id: '1',
          weekIndex: 1,
          dataRegistro: new Date('2025-01-08'),
          peso: 100,
          doseAplicada: { quantidade: 2.5, data: new Date('2025-01-08'), horario: '08:00' },
          adherence: 'ON_TIME',
        },
        {
          id: '2',
          weekIndex: 8,
          dataRegistro: new Date('2025-02-26'),
          peso: 90,
          doseAplicada: { quantidade: 5, data: new Date('2025-02-26'), horario: '08:00' },
          adherence: 'ON_TIME',
        },
      ],
    });

    const result = buildPacienteConsolidado(raw, SALT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const r = result.record;
    expect(r.pacienteAnonId).not.toContain('real-id');
    expect(JSON.stringify(r)).not.toContain('Maria');
    expect(JSON.stringify(r)).not.toContain('maria@');
    expect(r.pesoInicialKg).toBe(100);
    expect(r.pesoAtualKg).toBe(90);
    expect(r.pesoPerdidoKg).toBe(10);
    expect(r.percentualPesoPerdido).toBe(10);
    expect(r.atingiu10).toBe(true);
    expect(r.faixaMeta).toBe('5_a_10');
    expect(r.medicamento).toBe('tirzepatida');
    expect(r.quantidadeTotalMgUtilizada).toBe(7.5);
  });

  it('rejeita sem evolução', () => {
    const raw = normalizePacienteDocument('x', {
      dadosClinicos: { medidasIniciais: { peso: 90 } },
      evolucaoSeguimento: [],
    });
    expect(buildPacienteConsolidado(raw, SALT)).toEqual({ ok: false, reason: 'sem_evolucao' });
  });
});

describe('buildBenchmarks', () => {
  it('marca dadosInsuficientes quando n < 30', () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      pacienteAnonId: `oi_${i}`,
      sexo: 'F' as const,
      idade: 40,
      faixaEtaria: '40_49',
      altura: 165,
      pesoInicialKg: 100,
      pesoAtualKg: 90,
      pesoPerdidoKg: 10,
      percentualPesoPerdido: 10,
      imcInicial: 36,
      imcAtual: 33,
      metaKg: 10,
      metaPercentual: 10,
      medicamento: 'tirzepatida',
      doseAtualMg: 5,
      doseMaximaMg: 5,
      quantidadeTotalMgUtilizada: 50 + i,
      numeroAplicacoes: 10,
      tempoTratamentoSemanas: 12 + i,
      statusTratamento: 'em_tratamento',
      motivoEncerramento: 'em_andamento',
      atingiu5: true,
      atingiu10: true,
      atingiu15: false,
      atingiu20: false,
      atingiuMeta: true,
      faixaMeta: '5_a_10' as const,
    }));

    const faixas = buildBenchmarks(records);
    expect(faixas['5_a_10'].n).toBe(5);
    expect(faixas['5_a_10'].dadosInsuficientes).toBe(true);
    expect(MIN_BENCHMARK_SAMPLE).toBe(30);
  });
});
