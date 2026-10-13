/**
 * Fecha o Plano Nutri a partir da anamnese (link público ou backfill).
 * Gera estilo, proteína, água, calorias e hipótese — o cardápio (Opção 01)
 * continua sendo montado no load do NutriContent.
 */

import type { PacienteCompleto } from '@/types/obesidade';
import { calcularImcFromPesoAlturaCm } from '@/lib/meta/medidasIniciaisImc';
import {
  criarSnapshotAnamneseNutricional,
  type AnamneseWizardInput,
} from '@/lib/nutri/anamneseNutricional';
import {
  montarDadosEnergeticosPaciente,
  obterPesoEnergeticoPaciente,
} from '@/lib/nutri/dadosEnergeticosPaciente';
import { calcularEstimativaTmb } from '@/lib/nutri/estimativaMetabolica';
import { calcularEstimativaGet } from '@/lib/nutri/estimativaGastoEnergetico';
import { calcularEstrategiaEnergetica } from '@/lib/nutri/estrategiaEnergetica';

/** Mesmo fallback legado de `obterPesoAtual` no NutriContent. */
export const PESO_PLANO_FALLBACK_KG = 70;

export type EstiloPlanoNutricional =
  | 'digestiva'
  | 'plant_based'
  | 'mediterranea'
  | 'rico_proteina'
  | 'low_carb_moderada';

export type CamposPlanoFromAnamnese = {
  estilo: EstiloPlanoNutricional;
  protDia_g: number;
  aguaDia_ml: number;
  caloriasDia_kcal?: number;
  refeicoes: 5;
  distribuicaoProteina: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  modeloDia: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  evitar: string[];
  descricaoEstilo: string;
  hipoteseComportamental: string;
  suplementos: {
    probiotico: string;
    whey: string;
    creatina: string;
  };
  restricoesPaciente: string[];
  preferenciasProteinaPaciente: string[];
  anamneseNutricional: ReturnType<typeof criarSnapshotAnamneseNutricional>;
};

export function obterPesoKgParaPlano(paciente: PacienteCompleto): number {
  const energetico = obterPesoEnergeticoPaciente(paciente);
  if (typeof energetico.pesoKg === 'number' && energetico.pesoKg > 0) {
    return energetico.pesoKg;
  }
  const inicial = paciente?.dadosClinicos?.medidasIniciais?.peso;
  if (typeof inicial === 'number' && Number.isFinite(inicial) && inicial > 0) {
    return inicial;
  }
  return PESO_PLANO_FALLBACK_KG;
}

export function obterImcParaPlano(paciente: PacienteCompleto, pesoKg: number): number {
  const dados = montarDadosEnergeticosPaciente(paciente);
  if (typeof dados.imcAtual === 'number' && dados.imcAtual > 0) {
    return dados.imcAtual;
  }
  const legado = paciente?.dadosClinicos?.medidasIniciais?.imc;
  if (typeof legado === 'number' && Number.isFinite(legado) && legado > 0) {
    return legado;
  }
  const altura = paciente?.dadosClinicos?.medidasIniciais?.altura;
  if (typeof altura === 'number' && altura > 0) {
    return calcularImcFromPesoAlturaCm(pesoKg, altura) ?? 0;
  }
  return 0;
}

export function calcularProteinaDiariaG(pesoKg: number, imc: number): number {
  let fator = 1.5;
  if (imc < 27) fator = 1.2;
  else if (imc <= 32) fator = 1.4;
  return Math.round(pesoKg * fator);
}

export function escolherEstiloPlano(
  wizard: AnamneseWizardInput,
  imc: number
): { estilo: EstiloPlanoNutricional; descricaoEstilo: string } {
  if (wizard.sintomasGI === 'moderado' || wizard.sintomasGI === 'grave') {
    return {
      estilo: 'digestiva',
      descricaoEstilo:
        'Dieta focada em alimentos de fácil digestão, com preparações cozidas e baixa fibra insolúvel para reduzir sintomas gastrointestinais.',
    };
  }
  if (wizard.restricoes.includes('vegetariano') || wizard.restricoes.includes('vegano')) {
    return {
      estilo: 'plant_based',
      descricaoEstilo:
        'Abordagem baseada em plantas, priorizando leguminosas, grãos integrais, oleaginosas e proteínas vegetais completas.',
    };
  }
  if (
    wizard.atividadeFisica === 'nunca' &&
    (wizard.comportamentosAlimentares.includes('pulo refeições') ||
      wizard.comportamentosAlimentares.includes('como rápido') ||
      wizard.comportamentosAlimentares.includes('belisco o dia todo'))
  ) {
    return {
      estilo: 'mediterranea',
      descricaoEstilo:
        'Padrão alimentar mediterrâneo, rico em azeite, peixes, vegetais coloridos e oleaginosas, com foco em qualidade e variedade.',
    };
  }
  if (imc >= 32 || wizard.objetivoPrincipal === 'recomposicao') {
    return {
      estilo: 'rico_proteina',
      descricaoEstilo:
        'Dieta rica em proteína de alto valor biológico, com foco em preservação e ganho de massa magra e controle de apetite.',
    };
  }
  return {
    estilo: 'low_carb_moderada',
    descricaoEstilo:
      'Abordagem com redução moderada de carboidratos, priorizando proteínas magras, gorduras saudáveis e vegetais.',
  };
}

export function gerarHipoteseComportamental(data: AnamneseWizardInput): string {
  const partes: string[] = [];

  if (data.atividadeFisica === 'nunca') {
    partes.push('rotina sedentária');
  } else if (data.atividadeFisica === '1-2x') {
    partes.push('atividade física ocasional');
  } else {
    partes.push('atividade física regular');
  }

  partes.push(`sono em torno de ${data.sonoHoras}`);
  if (data.acordaDescansado === 'nao') {
    partes.push('com qualidade de sono comprometida');
  }

  if (data.vontadeDoce >= 7) {
    partes.push('com vontade de doce frequente');
  }
  if (data.fomeNoturna >= 7) {
    partes.push('fome noturna elevada');
  }
  if (data.pulaCafeManha) {
    partes.push('tendência a pular café da manhã');
  }
  if (data.chegaComMuitaFomeJantar) {
    partes.push('chega com muita fome no jantar');
  }

  if (data.efeitoSanfona === 'sim') {
    const kgText = data.kgSanfona ? ` (~${data.kgSanfona}kg)` : '';
    partes.push(`histórico de efeito sanfona${kgText}`);
  }

  if (data.dosesAlcoolSemana === '>7') {
    partes.push('consumo frequente de álcool');
  }

  if (data.finalSemanaSaiDieta === 'sempre') {
    partes.push('tendência a sair da dieta nos finais de semana');
  }

  return `Paciente com ${partes.join(', ')}.`;
}

function gerarListaEvitar(wizard: AnamneseWizardInput): string[] {
  const evitar: string[] = ['fritos', 'ultraprocessados'];
  if (
    wizard.comportamentosAlimentares.includes('álcool frequente') ||
    ['4-7', '>7'].includes(wizard.dosesAlcoolSemana)
  ) {
    evitar.push('álcool frequente');
  }
  if (wizard.restricoes.includes('intolerância lactose')) {
    evitar.push('laticínios com lactose');
  }
  if (wizard.restricoes.includes('sem glúten')) {
    evitar.push('alimentos com glúten');
  }
  if (wizard.compulsaoNoturna) {
    evitar.push('refeições pesadas após 20h');
  }
  if (wizard.finalSemanaSaiDieta === 'sempre') {
    evitar.push('excessos nos finais de semana');
  }
  return evitar;
}

function caloriasDiaKcal(paciente: PacienteCompleto, wizard: AnamneseWizardInput): number | undefined {
  const dadosEnergeticos = montarDadosEnergeticosPaciente(paciente, {
    atividadeFisicaDeclarada: wizard.atividadeFisica,
  });
  const estimativaTmb = calcularEstimativaTmb(dadosEnergeticos);
  const estimativaGet = calcularEstimativaGet(estimativaTmb, {
    atividadeFisicaDeclarada: wizard.atividadeFisica,
    horasSentado: wizard.horasSentado,
  });
  const estrategia = calcularEstrategiaEnergetica({
    get: estimativaGet,
    intensidadeDesejada: wizard.intensidadeDesejada,
    objetivoPrincipal: wizard.objetivoPrincipal,
    sexoBiologico: dadosEnergeticos.sexoBiologico,
    idadeAnos: dadosEnergeticos.idadeAnos,
    imcAtual: dadosEnergeticos.imcAtual,
    atividadeFisicaDeclarada: wizard.atividadeFisica,
    sintomasGI: wizard.sintomasGI,
    efeitoSanfona: wizard.efeitoSanfona,
    fomeEmocional: wizard.fomeEmocional,
    compulsaoNoturna: wizard.compulsaoNoturna,
    gestacaoConfirmada: paciente?.dadosClinicos?.riscos?.gestacao === 'sim',
    lactacaoConfirmada: paciente?.dadosClinicos?.riscos?.lactacao === 'sim',
  });
  const kcal = estrategia.metaCaloricaAplicadaKcalDia;
  if (typeof kcal === 'number' && Number.isFinite(kcal) && kcal > 0) {
    return Math.round(kcal);
  }
  return undefined;
}

export function montarCamposPlanoFromAnamnese(
  paciente: PacienteCompleto,
  wizard: AnamneseWizardInput
): CamposPlanoFromAnamnese {
  const pesoKg = obterPesoKgParaPlano(paciente);
  const imc = obterImcParaPlano(paciente, pesoKg);
  const protDia_g = calcularProteinaDiariaG(pesoKg, imc);
  const aguaDia_ml = Math.round(pesoKg * 35);
  const { estilo, descricaoEstilo } = escolherEstiloPlano(wizard, imc);

  const protPorRefeicao = protDia_g / 5;
  const distribuicaoProteina = {
    cafe: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
    almoco: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
    jantar: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
    lanche1: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`,
    lanche2: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`,
  };

  const calorias = caloriasDiaKcal(paciente, wizard);

  return {
    estilo,
    protDia_g,
    aguaDia_ml,
    ...(typeof calorias === 'number' ? { caloriasDia_kcal: calorias } : {}),
    refeicoes: 5,
    distribuicaoProteina,
    modeloDia: {
      cafe: '',
      almoco: '',
      jantar: '',
      lanche1: '',
      lanche2: '',
    },
    evitar: gerarListaEvitar(wizard),
    descricaoEstilo,
    hipoteseComportamental: gerarHipoteseComportamental(wizard),
    suplementos: {
      probiotico: '1 cápsula à noite, longe do whey protein (mínimo 2h de intervalo).',
      whey: '1 scoop (30g) pós-treino ou no lanche da tarde, conforme orientação.',
      creatina: '3-5g em qualquer refeição, todos os dias. Pode misturar com água, suco ou whey.',
    },
    restricoesPaciente: wizard.restricoes || [],
    preferenciasProteinaPaciente: wizard.preferenciasProteina || [],
    anamneseNutricional: criarSnapshotAnamneseNutricional(wizard),
  };
}
