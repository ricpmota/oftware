import { describe, expect, it } from 'vitest';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { INTENSIDADE_DESEJADA_PADRAO, type AnamneseWizardInput } from '@/lib/nutri/anamneseNutricional';
import { planoTemCalculosNutricionais } from '@/lib/nutri/anamneseNutricional';
import {
  PESO_PLANO_FALLBACK_KG,
  calcularProteinaDiariaG,
  escolherEstiloPlano,
  montarCamposPlanoFromAnamnese,
  obterImcParaPlano,
  obterPesoKgParaPlano,
} from '@/lib/nutri/gerarPlanoFromAnamnese';

function wizardCompleto(overrides: Partial<AnamneseWizardInput> = {}): AnamneseWizardInput {
  return {
    objetivoPrincipal: 'perda_peso',
    intensidadeDesejada: INTENSIDADE_DESEJADA_PADRAO,
    horarioTrabalho: 'diurno',
    horasSentado: '4-8h',
    dietaUltimos12Meses: 'sim',
    efeitoSanfona: 'nao',
    fomeMatinal: 4,
    fomeNoturna: 5,
    vontadeDoce: 4,
    pulaCafeManha: false,
    chegaComMuitaFomeJantar: false,
    atividadeFisica: '3-4x',
    sonoHoras: '6-8h',
    horarioDormir: '22-00',
    acordaDescansado: 'as_vezes',
    numeroRefeicoesDia: '4-5',
    comportamentosAlimentares: [],
    fomeEmocional: false,
    compulsaoNoturna: false,
    dosesAlcoolSemana: '0',
    finalSemanaSaiDieta: 'quase_nunca',
    restricoes: [],
    preferenciasProteina: ['Frango'],
    sintomasGI: 'nenhum',
    ...overrides,
  };
}

function pacienteBase(
  overrides: {
    pesoInicial?: number;
    altura?: number;
    imcLegado?: number;
    evolucao?: Partial<SeguimentoSemanal>[];
  } = {}
): PacienteCompleto {
  const { pesoInicial = 80, altura = 170, imcLegado, evolucao = [] } = overrides;
  return {
    id: 'p1',
    userId: 'u1',
    email: 't@t.com',
    nome: 'Teste',
    medicoResponsavelId: null,
    dadosIdentificacao: {
      nomeCompleto: 'Teste',
      email: 't@t.com',
      dataNascimento: '1980-01-15' as unknown as Date,
      sexoBiologico: 'F',
      endereco: {},
      dataCadastro: new Date('2020-01-01'),
    },
    dadosClinicos: {
      medidasIniciais: {
        peso: pesoInicial,
        altura,
        imc: imcLegado,
      },
      riscos: { gestacao: 'nao', lactacao: 'nao' },
    },
    estiloVida: {},
    examesLaboratoriais: [],
    planoTerapeutico: {},
    evolucaoSeguimento: evolucao as SeguimentoSemanal[],
    alertas: [],
    comunicacao: {},
    indicadores: {},
    dataCadastro: new Date('2020-01-01'),
    status: 'ativo',
    statusTratamento: 'em_tratamento',
  } as PacienteCompleto;
}

describe('calcularProteinaDiariaG', () => {
  it('IMC < 27 usa 1.2 g/kg', () => {
    expect(calcularProteinaDiariaG(80, 24)).toBe(96);
  });
  it('IMC 27–32 usa 1.4 g/kg', () => {
    expect(calcularProteinaDiariaG(80, 30)).toBe(112);
  });
  it('IMC > 32 usa 1.5 g/kg', () => {
    expect(calcularProteinaDiariaG(80, 35)).toBe(120);
  });
});

describe('escolherEstiloPlano', () => {
  it('sintomas GI moderados/graves → digestiva', () => {
    expect(escolherEstiloPlano(wizardCompleto({ sintomasGI: 'grave' }), 24).estilo).toBe('digestiva');
  });
  it('vegetariano/vegano → plant_based', () => {
    expect(escolherEstiloPlano(wizardCompleto({ restricoes: ['vegetariano'] }), 24).estilo).toBe(
      'plant_based'
    );
  });
  it('sedentário com pulo de refeições → mediterranea', () => {
    expect(
      escolherEstiloPlano(
        wizardCompleto({
          atividadeFisica: 'nunca',
          comportamentosAlimentares: ['pulo refeições'],
        }),
        24
      ).estilo
    ).toBe('mediterranea');
  });
  it('IMC alto → rico_proteina', () => {
    expect(escolherEstiloPlano(wizardCompleto(), 35).estilo).toBe('rico_proteina');
  });
  it('padrão → low_carb_moderada', () => {
    expect(escolherEstiloPlano(wizardCompleto(), 24).estilo).toBe('low_carb_moderada');
  });
});

describe('montarCamposPlanoFromAnamnese', () => {
  it('fecha o plano com estilo e proteína para a Nutrologia', () => {
    const paciente = pacienteBase({ pesoInicial: 80, altura: 175, imcLegado: 24 });
    const plano = montarCamposPlanoFromAnamnese(paciente, wizardCompleto());
    expect(planoTemCalculosNutricionais(plano)).toBe(true);
    expect(plano.estilo).toBe('low_carb_moderada');
    expect(plano.protDia_g).toBe(
      calcularProteinaDiariaG(80, obterImcParaPlano(paciente, 80))
    );
    expect(plano.aguaDia_ml).toBe(80 * 35);
    expect(plano.anamneseNutricional.objetivoPrincipal).toBe('perda_peso');
    expect(plano.hipoteseComportamental).toMatch(/atividade física regular/);
  });

  it('usa o último peso da evolução quando existir', () => {
    const paciente = pacienteBase({
      pesoInicial: 90,
      imcLegado: 24,
      evolucao: [{ peso: 82, dataRegistro: '2026-08-01' }],
    });
    expect(obterPesoKgParaPlano(paciente)).toBe(82);
    const plano = montarCamposPlanoFromAnamnese(paciente, wizardCompleto());
    expect(plano.protDia_g).toBe(
      calcularProteinaDiariaG(82, obterImcParaPlano(paciente, 82))
    );
  });

  it('sem peso no cadastro ainda gera o plano (fallback 70 kg)', () => {
    const paciente = pacienteBase({ pesoInicial: 0, imcLegado: 0 });
    paciente.dadosClinicos.medidasIniciais.peso = undefined as unknown as number;
    expect(obterPesoKgParaPlano(paciente)).toBe(PESO_PLANO_FALLBACK_KG);
    const plano = montarCamposPlanoFromAnamnese(paciente, wizardCompleto());
    expect(planoTemCalculosNutricionais(plano)).toBe(true);
    expect(plano.protDia_g).toBeGreaterThan(0);
  });
});
