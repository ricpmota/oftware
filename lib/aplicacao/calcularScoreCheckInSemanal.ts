import type { CheckInSemanal } from '@/types/obesidade';

export type CheckInSemanalScoreCategoria =
  | 'excelente'
  | 'boa'
  | 'moderada'
  | 'atencao'
  | 'necessita_acompanhamento';

export type CheckInSemanalScoreMedalha = 'ouro' | 'prata' | 'bronze' | 'sem_medalha';

export type CheckInSemanalScoreInput = {
  variacaoPeso?: number | null;
  variacaoCircunferencia?: number | null;
  temCircunferenciaAtual?: boolean;
  checkInSemanal?: CheckInSemanal | null;
};

export type CheckInSemanalScorePontos = {
  peso?: number;
  circunferencia?: number;
  fomeSemana?: number;
  saciedadeAoComer?: number;
  satisfacaoEvolucao?: number;
};

export type CheckInSemanalScoreResultado = {
  score: number;
  categoria: CheckInSemanalScoreCategoria;
  medalha: CheckInSemanalScoreMedalha;
  titulo: string;
  mensagemPaciente: string;
  pontos: CheckInSemanalScorePontos;
  fatoresPositivos: string[];
  pontosDeAtencao: string[];
};

const PESO_MAX = 25;
const CIRC_MAX = 25;
const FOME_MAX = 15;
const SACIEDADE_MAX = 15;
const SATISFACAO_MAX = 20;

const PONTOS_FOME: Record<string, number> = {
  'Muito controlada': 15,
  'Bem controlada': 12,
  Moderada: 8,
  Alta: 3,
  'Muito alta': 0,
};

const PONTOS_SACIEDADE: Record<string, number> = {
  Sempre: 15,
  'Na maioria das vezes': 12,
  'Algumas vezes': 6,
  Raramente: 0,
};

const PONTOS_SATISFACAO: Record<string, number> = {
  'Muito satisfeito(a)': 20,
  'Satisfeito(a)': 15,
  'Pouco satisfeito(a)': 8,
  'Insatisfeito(a)': 0,
};

function pontosVariacaoMedida(
  variacao: number | null | undefined,
  maxPontos: number
): number | null {
  if (variacao == null || Number.isNaN(variacao)) return null;
  if (variacao < 0) return maxPontos;
  if (variacao === 0) return 15;
  return 0;
}

function classificarScore(score: number): Pick<
  CheckInSemanalScoreResultado,
  'categoria' | 'medalha' | 'titulo' | 'mensagemPaciente'
> {
  if (score >= 90) {
    return {
      categoria: 'excelente',
      medalha: 'ouro',
      titulo: 'Excelente evolução',
      mensagemPaciente:
        'Sua semana foi excelente. Você apresentou uma ótima resposta ao tratamento e seus hábitos parecem estar favorecendo sua evolução.',
    };
  }
  if (score >= 70) {
    return {
      categoria: 'boa',
      medalha: 'prata',
      titulo: 'Boa evolução',
      mensagemPaciente:
        'Você está no caminho certo. Pequenos ajustes em alimentação, hidratação e rotina podem melhorar ainda mais seus resultados.',
    };
  }
  if (score >= 50) {
    return {
      categoria: 'moderada',
      medalha: 'bronze',
      titulo: 'Evolução moderada',
      mensagemPaciente:
        'Você teve uma evolução parcial nesta semana. Vale observar fome, saciedade e hábitos alimentares para melhorar a próxima semana.',
    };
  }
  if (score >= 30) {
    return {
      categoria: 'atencao',
      medalha: 'sem_medalha',
      titulo: 'Semana de atenção',
      mensagemPaciente:
        'Seu resultado ficou abaixo do esperado nesta semana. Não desanime: pequenos ajustes podem fazer grande diferença.',
    };
  }
  return {
    categoria: 'necessita_acompanhamento',
    medalha: 'sem_medalha',
    titulo: 'Precisa de acompanhamento mais próximo',
    mensagemPaciente:
      'Sua evolução ficou abaixo do esperado. Converse com sua equipe médica para avaliar possíveis ajustes no acompanhamento.',
  };
}

function montarFatoresPositivos(
  pontos: CheckInSemanalScorePontos,
  checkIn?: CheckInSemanal | null
): string[] {
  const fatores: string[] = [];
  if ((pontos.peso ?? 0) >= 25) fatores.push('Peso em evolução');
  else if ((pontos.peso ?? 0) >= 15) fatores.push('Peso estável');
  if ((pontos.circunferencia ?? 0) >= 25) fatores.push('Cintura em redução');
  else if ((pontos.circunferencia ?? 0) >= 15) fatores.push('Cintura estável');
  if ((pontos.fomeSemana ?? 0) >= 12) fatores.push('Fome controlada');
  if ((pontos.saciedadeAoComer ?? 0) >= 12) fatores.push('Boa saciedade');
  if ((pontos.satisfacaoEvolucao ?? 0) >= 15) fatores.push('Satisfeito(a) com a evolução');
  if (checkIn?.consumoAgua === 'Adequado') fatores.push('Consumo de água adequado');
  if (checkIn?.consumoProteinas === 'Adequado') fatores.push('Consumo de proteínas adequado');
  return fatores.slice(0, 4);
}

function montarPontosDeAtencao(
  pontos: CheckInSemanalScorePontos,
  checkIn?: CheckInSemanal | null,
  variacaoPeso?: number | null,
  variacaoCircunferencia?: number | null
): string[] {
  const atencao: string[] = [];
  if (variacaoPeso != null && variacaoPeso > 0) atencao.push('Ganho de peso nesta semana');
  if (variacaoCircunferencia != null && variacaoCircunferencia > 0) {
    atencao.push('Aumento da circunferência abdominal');
  }
  if ((pontos.fomeSemana ?? 0) <= 3) atencao.push('Fome elevada na semana');
  if ((pontos.saciedadeAoComer ?? 0) <= 6) atencao.push('Saciedade baixa ao comer');
  if ((pontos.satisfacaoEvolucao ?? 0) <= 8) atencao.push('Pouca satisfação com a evolução');
  if (checkIn?.consumoAgua === 'Ruim') atencao.push('Melhorar consumo de água');
  else if (checkIn?.consumoAgua === 'Poderia ter sido melhor') {
    atencao.push('Consumo de água pode melhorar');
  }
  if (checkIn?.consumoProteinas === 'Ruim') atencao.push('Melhorar consumo de proteínas');
  else if (checkIn?.consumoProteinas === 'Poderia ter sido melhor') {
    atencao.push('Consumo de proteínas pode melhorar');
  }
  return atencao.slice(0, 4);
}

export function calcularScoreCheckInSemanal(
  input: CheckInSemanalScoreInput
): CheckInSemanalScoreResultado | null {
  const checkIn = input.checkInSemanal;
  if (!checkIn) return null;

  const temRespostasScore =
    checkIn.fomeSemana || checkIn.saciedadeAoComer || checkIn.satisfacaoEvolucao;
  if (!temRespostasScore && input.variacaoPeso == null && !input.temCircunferenciaAtual) {
    return null;
  }

  const criterios: Array<{ max: number; obtido: number | null }> = [];

  const pesoPts = pontosVariacaoMedida(input.variacaoPeso, PESO_MAX);
  if (pesoPts != null) criterios.push({ max: PESO_MAX, obtido: pesoPts });

  const incluirCirc =
    input.temCircunferenciaAtual && input.variacaoCircunferencia != null;
  const circPts = incluirCirc
    ? pontosVariacaoMedida(input.variacaoCircunferencia, CIRC_MAX)
    : null;
  if (circPts != null) criterios.push({ max: CIRC_MAX, obtido: circPts });

  const fomePts =
    checkIn.fomeSemana && checkIn.fomeSemana in PONTOS_FOME
      ? PONTOS_FOME[checkIn.fomeSemana]
      : null;
  if (fomePts != null) criterios.push({ max: FOME_MAX, obtido: fomePts });

  const saciedadePts =
    checkIn.saciedadeAoComer && checkIn.saciedadeAoComer in PONTOS_SACIEDADE
      ? PONTOS_SACIEDADE[checkIn.saciedadeAoComer]
      : null;
  if (saciedadePts != null) criterios.push({ max: SACIEDADE_MAX, obtido: saciedadePts });

  const satisfacaoPts =
    checkIn.satisfacaoEvolucao && checkIn.satisfacaoEvolucao in PONTOS_SATISFACAO
      ? PONTOS_SATISFACAO[checkIn.satisfacaoEvolucao]
      : null;
  if (satisfacaoPts != null) criterios.push({ max: SATISFACAO_MAX, obtido: satisfacaoPts });

  if (criterios.length === 0) return null;

  const totalObtido = criterios.reduce((acc, c) => acc + (c.obtido ?? 0), 0);
  const totalMax = criterios.reduce((acc, c) => acc + c.max, 0);
  const score = Math.round((totalObtido / totalMax) * 100);

  const pontos: CheckInSemanalScorePontos = {};
  if (pesoPts != null) pontos.peso = pesoPts;
  if (circPts != null) pontos.circunferencia = circPts;
  if (fomePts != null) pontos.fomeSemana = fomePts;
  if (saciedadePts != null) pontos.saciedadeAoComer = saciedadePts;
  if (satisfacaoPts != null) pontos.satisfacaoEvolucao = satisfacaoPts;

  const classificacao = classificarScore(score);

  return {
    score,
    ...classificacao,
    pontos,
    fatoresPositivos: montarFatoresPositivos(pontos, checkIn),
    pontosDeAtencao: montarPontosDeAtencao(
      pontos,
      checkIn,
      input.variacaoPeso,
      input.variacaoCircunferencia
    ),
  };
}

export function medalhaCheckInLabel(medalha: CheckInSemanalScoreMedalha): string {
  switch (medalha) {
    case 'ouro':
      return 'Medalha de ouro';
    case 'prata':
      return 'Medalha de prata';
    case 'bronze':
      return 'Medalha de bronze';
    default:
      return 'Sem medalha';
  }
}

export function medalhaCheckInEmoji(medalha: CheckInSemanalScoreMedalha): string {
  switch (medalha) {
    case 'ouro':
      return '🥇';
    case 'prata':
      return '🥈';
    case 'bronze':
      return '🥉';
    default:
      return '';
  }
}
