import type { LeadWhiteLabelTemperatura } from '@/types/leadWhiteLabel';

type ScoreInput = {
  objetivo3Anos?: string;
  interesseReduzirPlantao?: string;
  interessePlataformaMarca?: string;
  pacientesMes?: string;
  realidadeAtual?: string;
  interesseExperienciaDigital?: string;
  familiaridadeTecnologia?: string;
  investimentoDisponivel?: string;
  prazoInicio?: string;
  faturamentoEsperado?: string;
};

export function calcularLeadWhiteLabelScore(data: ScoreInput): number {
  let score = 0;

  if (data.objetivo3Anos === 'Criar uma fonte de renda escalável além das consultas.') {
    score += 10;
  }

  if (data.interesseReduzirPlantao === 'Sim, imediatamente.') {
    score += 10;
  }

  if (data.interessePlataformaMarca === 'Sim, imediatamente.') {
    score += 10;
  }

  if (
    data.pacientesMes === 'Entre 100 e 300.' ||
    data.pacientesMes === 'Entre 300 e 500.' ||
    data.pacientesMes === 'Mais de 500.'
  ) {
    score += 10;
  }

  if (
    data.realidadeAtual ===
    'Quero escalar meu atendimento sem aumentar proporcionalmente minhas horas de trabalho.'
  ) {
    score += 10;
  }

  if (data.interesseExperienciaDigital === 'Muito alto.' || data.interesseExperienciaDigital === 'Alto.') {
    score += 10;
  }

  if (
    data.familiaridadeTecnologia === 'Alto.' ||
    data.familiaridadeTecnologia === 'Sou apaixonado por tecnologia.'
  ) {
    score += 8;
  }

  if (
    data.investimentoDisponivel === 'Entre R$ 10.000 e R$ 25.000.' ||
    data.investimentoDisponivel === 'Acima de R$ 25.000.'
  ) {
    score += 10;
  }

  if (
    data.prazoInicio === 'Sim. Quero começar imediatamente.' ||
    data.prazoInicio === 'Sim. Quero avaliar.'
  ) {
    score += 10;
  }

  if (
    data.faturamentoEsperado === 'R$ 20.000/mês' ||
    data.faturamentoEsperado === 'R$ 50.000/mês' ||
    data.faturamentoEsperado === 'Mais de R$ 50.000/mês'
  ) {
    score += 12;
  }

  return score;
}

export function calcularLeadWhiteLabelTemperatura(score: number): LeadWhiteLabelTemperatura {
  if (score >= 61) return 'quente';
  if (score >= 31) return 'morno';
  return 'frio';
}
