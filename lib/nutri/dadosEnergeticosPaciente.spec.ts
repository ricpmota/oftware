import { describe, expect, it } from 'vitest';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import {
  calcularImcEnergeticoAtual,
  montarDadosEnergeticosPaciente,
  normalizarSexoBiologicoEnergetico,
  obterAlturaEnergeticaCm,
  obterIdadeEnergeticaAnos,
  obterPesoEnergeticoPaciente,
  IMC_LEGADO_DIVERGENCIA_MIN,
} from '@/lib/nutri/dadosEnergeticosPaciente';

function pacienteBase(
  overrides: {
    evolucao?: Partial<SeguimentoSemanal>[];
    pesoInicial?: number;
    altura?: number;
    imcLegado?: number;
    dataNascimento?: unknown;
    sexoBiologico?: 'M' | 'F' | 'Outro' | undefined;
    gestacao?: 'sim' | 'nao' | 'desconheco' | undefined;
    lactacao?: 'sim' | 'nao' | undefined;
    omitLactacao?: boolean;
  } = {}
): PacienteCompleto {
  const {
    evolucao = [],
    pesoInicial = 80,
    altura = 170,
    imcLegado,
    dataNascimento = '1980-01-15',
    sexoBiologico = 'F',
    gestacao = 'nao',
    lactacao = 'nao',
    omitLactacao = false,
  } = overrides;

  return {
    id: 'p1',
    userId: 'u1',
    email: 't@t.com',
    nome: 'Teste',
    medicoResponsavelId: null,
    dadosIdentificacao: {
      nomeCompleto: 'Teste',
      email: 't@t.com',
      dataNascimento: dataNascimento as Date,
      sexoBiologico,
      endereco: {},
      dataCadastro: new Date('2020-01-01'),
    },
    dadosClinicos: {
      medidasIniciais: {
        peso: pesoInicial,
        altura,
        imc: imcLegado,
      },
      riscos: {
        gestacao: gestacao as 'sim' | 'nao' | 'desconheco',
        ...(omitLactacao ? {} : { lactacao }),
      } as PacienteCompleto['dadosClinicos']['riscos'],
    } as PacienteCompleto['dadosClinicos'],
    estiloVida: {} as PacienteCompleto['estiloVida'],
    examesLaboratoriais: [],
    planoTerapeutico: {} as PacienteCompleto['planoTerapeutico'],
    evolucaoSeguimento: evolucao as SeguimentoSemanal[],
    alertas: [],
    comunicacao: {} as PacienteCompleto['comunicacao'],
    indicadores: {} as PacienteCompleto['indicadores'],
    dataCadastro: new Date('2020-01-01'),
    status: 'ativo',
    statusTratamento: 'em_tratamento',
  } as PacienteCompleto;
}

describe('normalizarSexoBiologicoEnergetico', () => {
  it('12. M → masculino', () => {
    expect(normalizarSexoBiologicoEnergetico('M')).toBe('masculino');
  });
  it('13. F → feminino', () => {
    expect(normalizarSexoBiologicoEnergetico('F')).toBe('feminino');
  });
  it('14. Outro → null', () => {
    expect(normalizarSexoBiologicoEnergetico('Outro')).toBeNull();
  });
  it('15. ausente → null', () => {
    expect(normalizarSexoBiologicoEnergetico(undefined)).toBeNull();
    expect(normalizarSexoBiologicoEnergetico(null)).toBeNull();
  });
});

describe('obterIdadeEnergeticaAnos', () => {
  it('16. data válida calcula idade correta', () => {
    expect(obterIdadeEnergeticaAnos('1980-06-15', new Date(2026, 6, 15))).toBe(46);
  });
  it('17. aniversário ainda não ocorrido reduz um ano', () => {
    expect(obterIdadeEnergeticaAnos('1980-12-31', new Date(2026, 6, 15))).toBe(45);
  });
  it('18. formato inválido retorna null', () => {
    expect(obterIdadeEnergeticaAnos('não-é-data')).toBeNull();
    expect(obterIdadeEnergeticaAnos(undefined)).toBeNull();
  });
});

describe('obterPesoEnergeticoPaciente', () => {
  it('1. evoluções ordenadas retornam a mais recente', () => {
    const p = pacienteBase({
      evolucao: [
        { peso: 90, dataRegistro: new Date('2024-01-01'), weekIndex: 1, id: 'a' },
        { peso: 85, dataRegistro: new Date('2025-06-01'), weekIndex: 2, id: 'b' },
      ],
    });
    const r = obterPesoEnergeticoPaciente(p);
    expect(r.pesoKg).toBe(85);
    expect(r.origem).toBe('evolucao');
    expect(r.confiavel).toBe(true);
    expect(r.dataPeso).toBe('2025-06-01');
  });

  it('2. evoluções fora de ordem retornam a de data mais recente', () => {
    const p = pacienteBase({
      evolucao: [
        { peso: 88, dataRegistro: new Date('2025-12-01'), weekIndex: 3, id: 'c' },
        { peso: 95, dataRegistro: new Date('2024-01-01'), weekIndex: 1, id: 'a' },
        { peso: 91, dataRegistro: new Date('2025-03-01'), weekIndex: 2, id: 'b' },
      ],
    });
    expect(obterPesoEnergeticoPaciente(p).pesoKg).toBe(88);
  });

  it('3. último índice sem peso não ignora peso válido anterior', () => {
    const p = pacienteBase({
      evolucao: [
        { peso: 92, dataRegistro: new Date('2025-01-01'), weekIndex: 1, id: 'a' },
        { dataRegistro: new Date('2025-06-01'), weekIndex: 2, id: 'b' },
      ],
    });
    expect(obterPesoEnergeticoPaciente(p).pesoKg).toBe(92);
  });

  it('4. peso NaN é ignorado', () => {
    const p = pacienteBase({
      pesoInicial: 75,
      evolucao: [
        { peso: Number.NaN, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' },
      ],
    });
    const r = obterPesoEnergeticoPaciente(p);
    expect(r.pesoKg).toBe(75);
    expect(r.origem).toBe('medida_inicial');
  });

  it('5. peso zero é ignorado', () => {
    const p = pacienteBase({
      pesoInicial: 78,
      evolucao: [{ peso: 0, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' }],
    });
    expect(obterPesoEnergeticoPaciente(p).pesoKg).toBe(78);
  });

  it('6. peso abaixo de 20 é ignorado', () => {
    const p = pacienteBase({
      pesoInicial: 70,
      evolucao: [{ peso: 15, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' }],
    });
    expect(obterPesoEnergeticoPaciente(p).pesoKg).toBe(70);
  });

  it('7. peso acima de 400 é ignorado', () => {
    const p = pacienteBase({
      pesoInicial: 70,
      evolucao: [{ peso: 401, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' }],
    });
    expect(obterPesoEnergeticoPaciente(p).pesoKg).toBe(70);
  });

  it('8. sem evolução usa medida inicial válida', () => {
    const p = pacienteBase({ evolucao: [], pesoInicial: 82.5 });
    const r = obterPesoEnergeticoPaciente(p);
    expect(r).toMatchObject({
      pesoKg: 82.5,
      origem: 'medida_inicial',
      confiavel: true,
      dataPeso: null,
    });
  });

  it('9. sem nenhum peso retorna null', () => {
    const p = pacienteBase({
      evolucao: [],
      pesoInicial: undefined as unknown as number,
    });
    // força medida sem peso
    const mi9 = p.dadosClinicos.medidasIniciais!;
    mi9.peso = undefined as unknown as number;
    const r = obterPesoEnergeticoPaciente(p);
    expect(r.pesoKg).toBeNull();
    expect(r.origem).toBe('indisponivel');
  });

  it('10. nunca retorna 70 como fallback', () => {
    const p = pacienteBase({ evolucao: [] });
    const mi10 = p.dadosClinicos.medidasIniciais!;
    mi10.peso = undefined as unknown as number;
    expect(obterPesoEnergeticoPaciente(p).pesoKg).not.toBe(70);
    expect(obterPesoEnergeticoPaciente(p).pesoKg).toBeNull();
  });

  it('11. peso sem data usa último válido e gera alerta', () => {
    const p = pacienteBase({
      evolucao: [
        { peso: 90, weekIndex: 1, id: 'a' } as Partial<SeguimentoSemanal>,
        { peso: 87, weekIndex: 2, id: 'b' } as Partial<SeguimentoSemanal>,
      ],
    });
    // remove dataRegistro
    for (const e of p.evolucaoSeguimento) {
      delete (e as { dataRegistro?: Date }).dataRegistro;
    }
    const r = obterPesoEnergeticoPaciente(p);
    expect(r.pesoKg).toBe(87);
    expect(r.confiavel).toBe(false);
    expect(r.alertasPeso).toContain('PESO_SEM_DATA');
    expect(r.alertasPeso).toContain('PESO_EVOLUCAO_SEM_ORDEM_CONFIRMADA');
  });
});

describe('altura e IMC', () => {
  it('21. altura válida é preservada', () => {
    expect(obterAlturaEnergeticaCm(pacienteBase({ altura: 165 }))).toBe(165);
  });
  it('22. altura inválida retorna null', () => {
    expect(obterAlturaEnergeticaCm(pacienteBase({ altura: 100 }))).toBeNull();
    expect(obterAlturaEnergeticaCm(pacienteBase({ altura: 250 }))).toBeNull();
  });
  it('23. IMC usa peso atual, não IMC salvo', () => {
    const p = pacienteBase({
      pesoInicial: 100,
      altura: 170,
      imcLegado: 40,
      evolucao: [
        { peso: 85, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' },
      ],
    });
    const dados = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '3-4x',
      dataReferencia: new Date(2026, 6, 15),
    });
    expect(dados.imcAtual).toBe(calcularImcEnergeticoAtual(85, 170));
    expect(dados.imcAtual).not.toBe(40);
  });
  it('24. divergência relevante gera alerta', () => {
    const imcAtual = calcularImcEnergeticoAtual(85, 170)!;
    const p = pacienteBase({
      evolucao: [
        { peso: 85, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' },
      ],
      altura: 170,
      imcLegado: imcAtual + IMC_LEGADO_DIVERGENCIA_MIN + 0.5,
    });
    const dados = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '1-2x',
      dataReferencia: new Date(2026, 6, 15),
    });
    expect(dados.alertas).toContain('IMC_LEGADO_DIVERGENTE');
  });
  it('25. peso ou altura ausente → IMC null', () => {
    expect(calcularImcEnergeticoAtual(null, 170)).toBeNull();
    expect(calcularImcEnergeticoAtual(80, null)).toBeNull();
  });
});

describe('montarDadosEnergeticosPaciente — segurança e aptidão', () => {
  const ref = new Date(2026, 6, 15);

  it('19. menor de 18 gera bloqueio', () => {
    const p = pacienteBase({ dataNascimento: '2015-01-01' });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: 'nunca',
      dataReferencia: ref,
    });
    expect(d.bloqueios).toContain('IDADE_FORA_ESCOPO_ADULTO');
    expect(d.aptoParaEstimativaEnergetica).toBe(false);
  });

  it('20. idade superior a 100 gera bloqueio', () => {
    const p = pacienteBase({ dataNascimento: '1920-01-01' });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: 'nunca',
      dataReferencia: ref,
    });
    expect(d.idadeAnos).toBeGreaterThan(100);
    expect(d.bloqueios).toContain('IDADE_FORA_ESCOPO_ADULTO');
  });

  it('26. gestação confirmada gera bloqueio', () => {
    const p = pacienteBase({ gestacao: 'sim' });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '3-4x',
      dataReferencia: ref,
    });
    expect(d.bloqueios).toContain('GESTACAO');
    expect(d.aptoParaEstimativaEnergetica).toBe(false);
  });

  it('27. lactação confirmada gera bloqueio', () => {
    const p = pacienteBase({ lactacao: 'sim' });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '3-4x',
      dataReferencia: ref,
    });
    expect(d.bloqueios).toContain('LACTACAO');
  });

  it('28. desconheco gera alerta', () => {
    const p = pacienteBase({ gestacao: 'desconheco', omitLactacao: true });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '3-4x',
      dataReferencia: ref,
    });
    expect(d.alertas).toContain('GESTACAO_DESCONHECIDA');
    expect(d.alertas).toContain('LACTACAO_DESCONHECIDA');
    expect(d.bloqueios).not.toContain('GESTACAO');
  });

  it('29. dados completos → apto true', () => {
    const p = pacienteBase({
      evolucao: [
        { peso: 92.4, dataRegistro: new Date('2025-06-01'), weekIndex: 1, id: 'a' },
      ],
      altura: 165,
      dataNascimento: '1980-01-15',
      sexoBiologico: 'F',
      gestacao: 'nao',
      lactacao: 'nao',
    });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '5-7x',
      dataReferencia: ref,
    });
    expect(d.aptoParaEstimativaEnergetica).toBe(true);
    expect(d.bloqueios).toEqual([]);
    expect(d.sexoBiologico).toBe('feminino');
    expect(d.peso.pesoKg).toBe(92.4);
  });

  it('30. qualquer bloqueio → apto false', () => {
    const p = pacienteBase({});
    delete p.dadosIdentificacao.sexoBiologico;
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: 'nunca',
      dataReferencia: ref,
    });
    expect(d.bloqueios).toContain('SEXO_INDISPONIVEL');
    expect(d.aptoParaEstimativaEnergetica).toBe(false);
  });

  it('Outro gera SEXO_NAO_BINARIO_PARA_EQUACAO sem estigma no código', () => {
    const p = pacienteBase({ sexoBiologico: 'Outro' });
    const d = montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: 'nunca',
      dataReferencia: ref,
    });
    expect(d.bloqueios).toContain('SEXO_NAO_BINARIO_PARA_EQUACAO');
    expect(d.bloqueios).not.toContain('SEXO_INDISPONIVEL');
  });

  it('31. não altera o objeto paciente', () => {
    const p = pacienteBase({
      evolucao: [
        { peso: 90, dataRegistro: new Date('2025-01-01'), weekIndex: 1, id: 'a' },
      ],
    });
    const before = JSON.stringify(p);
    montarDadosEnergeticosPaciente(p, {
      atividadeFisicaDeclarada: '1-2x',
      dataReferencia: ref,
    });
    expect(JSON.stringify(p)).toBe(before);
  });

  it('atividade ausente → alerta, não bloqueio', () => {
    const p = pacienteBase({});
    const d = montarDadosEnergeticosPaciente(p, { dataReferencia: ref });
    expect(d.alertas).toContain('ATIVIDADE_FISICA_NAO_INFORMADA');
    expect(d.aptoParaEstimativaEnergetica).toBe(true);
  });
});
