import type { WhiteLabelLeadScoreCategory } from '@/types/leadWhiteLabelCrm';

export type WhiteLabelScoreInput = {
  situacaoProfissional?: string;
  objetivo3Anos?: string;
  interesseReduzirPlantao?: string;
  interessePlataformaMarca?: string;
  realidadeAtual?: string;
  interesseExperienciaDigital?: string;
  familiaridadeTecnologia?: string;
  faturamentoEsperado?: string;
};

export type WhiteLabelScoreResult = {
  score: number;
  category: WhiteLabelLeadScoreCategory;
};

function scoreEmpreender(interessePlataformaMarca?: string): number {
  if (interessePlataformaMarca === 'Sim, imediatamente.') return 20;
  if (interessePlataformaMarca === 'Sim, quero entender melhor.') return 10;
  return 0;
}

function scorePlantonista(situacaoProfissional?: string): number {
  if (!situacaoProfissional) return 0;
  const lower = situacaoProfissional.toLowerCase();
  if (lower.includes('plantão') || lower.includes('plantao')) return 20;
  return 0;
}

function scoreTecnologia(familiaridadeTecnologia?: string): number {
  if (
    familiaridadeTecnologia === 'Alto.' ||
    familiaridadeTecnologia === 'Sou apaixonado por tecnologia.'
  ) {
    return 10;
  }
  if (familiaridadeTecnologia === 'Médio.') return 5;
  return 0;
}

function scoreEscalar(realidadeAtual?: string, interesseExperienciaDigital?: string): number {
  if (
    realidadeAtual ===
    'Quero escalar meu atendimento sem aumentar proporcionalmente minhas horas de trabalho.'
  ) {
    return 20;
  }
  if (interesseExperienciaDigital === 'Muito alto.') return 20;
  if (interesseExperienciaDigital === 'Alto.') return 10;
  if (interesseExperienciaDigital === 'Médio.') return 10;
  return 0;
}

function scoreEquipe(realidadeAtual?: string): number {
  if (realidadeAtual === 'Tenho equipe, mas faltam processos.') return 10;
  return 0;
}

function scoreFaturamento(faturamentoEsperado?: string): number {
  switch (faturamentoEsperado) {
    case 'R$ 5.000/mês':
    case 'R$ 10.000/mês':
      return 5;
    case 'R$ 20.000/mês':
      return 10;
    case 'R$ 50.000/mês':
      return 20;
    case 'Mais de R$ 50.000/mês':
      return 30;
    default:
      return 0;
  }
}

export function calculateWhiteLabelLeadScore(data: WhiteLabelScoreInput): WhiteLabelScoreResult {
  const score = Math.min(
    100,
    scoreEmpreender(data.interessePlataformaMarca) +
      scorePlantonista(data.situacaoProfissional) +
      scoreTecnologia(data.familiaridadeTecnologia) +
      scoreEscalar(data.realidadeAtual, data.interesseExperienciaDigital) +
      scoreEquipe(data.realidadeAtual) +
      scoreFaturamento(data.faturamentoEsperado)
  );

  let category: WhiteLabelLeadScoreCategory = 'cold';
  if (score >= 61) category = 'hot';
  else if (score >= 31) category = 'warm';

  return { score, category };
}

export function scoreCategoryLabel(category: WhiteLabelLeadScoreCategory): string {
  if (category === 'hot') return 'Quente';
  if (category === 'warm') return 'Morno';
  return 'Frio';
}

export function scoreCategoryEmoji(category: WhiteLabelLeadScoreCategory): string {
  if (category === 'hot') return '🔥';
  if (category === 'warm') return '🌤';
  return '🥶';
}
