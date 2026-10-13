import type { WhiteLabelProfissao } from '@/lib/whiteLabel/profissao';
import { whiteLabelClienteNoun } from '@/lib/whiteLabel/profissao';

export type WhiteLabelQuestionType = 'text' | 'email' | 'tel' | 'choice';

export type WhiteLabelQuestion = {
  key: string;
  label: string;
  type: WhiteLabelQuestionType;
  placeholder?: string;
  options?: string[];
};

function situacaoProfissionalOptions(profissao: WhiteLabelProfissao): string[] {
  if (profissao === 'nutricionista') {
    return [
      'Trabalho principalmente em clínicas, consultórios ou convênios.',
      'Estou construindo meu atendimento particular.',
      'Já tenho atendimento particular, mas ainda dependo parcialmente de outras fontes.',
      'Vivo exclusivamente do particular.',
      'Já possuo clínica, empresa ou outro negócio na área da saúde.',
    ];
  }
  if (profissao === 'personal') {
    return [
      'Trabalho principalmente em academias ou como autônomo pontual.',
      'Estou construindo minha base de alunos particulares.',
      'Já tenho alunos particulares, mas ainda dependo parcialmente de academia/outros.',
      'Vivo exclusivamente de alunos particulares / operação própria.',
      'Já possuo estúdio, empresa ou outro negócio na área fitness.',
    ];
  }
  return [
    'Trabalho principalmente em plantões e convênios.',
    'Trabalho em plantões, mas estou construindo meu consultório particular.',
    'Já tenho consultório particular, mas ainda dependo parcialmente de plantões.',
    'Vivo exclusivamente do particular.',
    'Já possuo clínica, empresa ou outro negócio na área da saúde.',
  ];
}

function objetivo3AnosOptions(profissao: WhiteLabelProfissao): string[] {
  if (profissao === 'personal') {
    return [
      'Aumentar meu faturamento como personal.',
      'Ter mais alunos particulares.',
      'Abrir um estúdio.',
      'Construir uma empresa na área fitness/saúde.',
      'Criar uma fonte de renda escalável além dos treinos presenciais.',
    ];
  }
  if (profissao === 'nutricionista') {
    return [
      'Aumentar meu faturamento como nutricionista.',
      'Ter mais pacientes particulares.',
      'Abrir uma clínica.',
      'Construir uma empresa na área da saúde.',
      'Criar uma fonte de renda escalável além das consultas.',
    ];
  }
  return [
    'Aumentar meu faturamento como médico.',
    'Ter mais pacientes particulares.',
    'Abrir uma clínica.',
    'Construir uma empresa na área da saúde.',
    'Criar uma fonte de renda escalável além das consultas.',
  ];
}

function interesseReduzirDependenciaLabel(profissao: WhiteLabelProfissao): string {
  if (profissao === 'personal') {
    return 'Se eu te mostrar como personais estão usando uma plataforma própria para reduzir a dependência de academia e criar novas fontes de receita, você teria interesse em conhecer?';
  }
  if (profissao === 'nutricionista') {
    return 'Se eu te mostrar como nutricionistas estão usando uma plataforma própria para reduzir a dependência de fontes externas e criar novas fontes de receita, você teria interesse em conhecer?';
  }
  return 'Se eu te mostrar como médicos estão usando uma plataforma própria para reduzir a dependência de plantões e criar novas fontes de receita, você teria interesse em conhecer?';
}

function realidadeAtualOptions(profissao: WhiteLabelProfissao): string[] {
  const { plural } = whiteLabelClienteNoun(profissao);
  if (profissao === 'personal') {
    return [
      `Tenho ${plural}, mas não consigo acompanhar todos adequadamente.`,
      `Perco ${plural} por falta de recorrência.`,
      'Faço tudo manualmente.',
      'Tenho equipe, mas faltam processos.',
      'Quero escalar meu atendimento sem aumentar proporcionalmente minhas horas de trabalho.',
    ];
  }
  return [
    `Tenho ${plural}, mas não consigo acompanhar todos adequadamente.`,
    `Perco ${plural} por falta de recorrência.`,
    'Faço tudo manualmente.',
    'Tenho equipe, mas faltam processos.',
    'Quero escalar meu atendimento sem aumentar proporcionalmente minhas horas de trabalho.',
  ];
}

function interesseExperienciaLabel(profissao: WhiteLabelProfissao): string {
  const { singular } = whiteLabelClienteNoun(profissao);
  if (profissao === 'personal') {
    return `Se pudesse oferecer uma experiência digital completa ao ${singular} com app, acompanhamento, treinos, evolução e equipe multidisciplinar, qual seria seu interesse?`;
  }
  return `Se pudesse oferecer uma experiência digital completa ao ${singular} com app, acompanhamento, prescrições, exames, IA e equipe multidisciplinar, qual seria seu interesse?`;
}

/**
 * Perguntas do funil. `profissao` é a 1ª pergunta quando ainda não veio pré-selecionada pela rota.
 * Demais perguntas mudam o texto conforme a profissão escolhida.
 */
export function getWhiteLabelLeadQuestions(
  profissao: WhiteLabelProfissao | null,
  options?: { includeProfissaoQuestion?: boolean }
): WhiteLabelQuestion[] {
  const includeProfissao = options?.includeProfissaoQuestion ?? true;
  const resolved: WhiteLabelProfissao = profissao || 'medico';
  const { plural } = whiteLabelClienteNoun(resolved);

  const contactAndQualifying: WhiteLabelQuestion[] = [
    {
      key: 'nome',
      label: 'Qual o seu nome?',
      type: 'text',
      placeholder:
        resolved === 'medico'
          ? 'Dr(a). Seu nome'
          : resolved === 'nutricionista'
            ? 'Seu nome'
            : 'Seu nome',
    },
    {
      key: 'whatsapp',
      label: 'Qual o seu WhatsApp?',
      type: 'tel',
      placeholder: '(11) 99999-9999',
    },
    {
      key: 'email',
      label: 'Qual o seu e-mail?',
      type: 'email',
      placeholder: 'seuemail@email.com',
    },
    {
      key: 'instagram',
      label: 'Qual o seu Instagram profissional?',
      type: 'text',
      placeholder: '@seuinstagram',
    },
    {
      key: 'situacaoProfissional',
      label: 'Hoje, qual frase melhor descreve sua situação profissional?',
      type: 'choice',
      options: situacaoProfissionalOptions(resolved),
    },
    {
      key: 'objetivo3Anos',
      label: 'Qual é o seu maior objetivo para os próximos 3 anos?',
      type: 'choice',
      options: objetivo3AnosOptions(resolved),
    },
    {
      key: 'interesseReduzirPlantao',
      label: interesseReduzirDependenciaLabel(resolved),
      type: 'choice',
      options: ['Sim, imediatamente.', 'Sim, quero entender melhor.', 'Talvez.', 'Não é uma prioridade hoje.'],
    },
    {
      key: 'interessePlataformaMarca',
      label: `Você teria interesse em ter uma plataforma com a sua marca para acompanhar ${plural}?`,
      type: 'choice',
      options: ['Sim, imediatamente.', 'Sim, quero entender melhor.', 'Talvez.', 'Não tenho interesse.'],
    },
    {
      key: 'pacientesMes',
      label: `Quantos ${plural} você acompanha atualmente por mês?`,
      type: 'choice',
      options: ['Menos de 50.', 'Entre 50 e 100.', 'Entre 100 e 300.', 'Entre 300 e 500.', 'Mais de 500.'],
    },
    {
      key: 'realidadeAtual',
      label: 'Qual dessas situações mais se aproxima da sua realidade?',
      type: 'choice',
      options: realidadeAtualOptions(resolved),
    },
    {
      key: 'interesseExperienciaDigital',
      label: interesseExperienciaLabel(resolved),
      type: 'choice',
      options: ['Muito alto.', 'Alto.', 'Médio.', 'Baixo.'],
    },
    {
      key: 'familiaridadeTecnologia',
      label: 'Hoje, qual seu nível de familiaridade com tecnologia?',
      type: 'choice',
      options: ['Baixo.', 'Médio.', 'Alto.', 'Sou apaixonado por tecnologia.'],
    },
    {
      key: 'investimentoDisponivel',
      label: 'Quanto você estaria disposto a investir para construir uma operação própria usando tecnologia?',
      type: 'choice',
      options: [
        'Até R$ 5.000.',
        'Entre R$ 5.000 e R$ 10.000.',
        'Entre R$ 10.000 e R$ 25.000.',
        'Acima de R$ 25.000.',
        'Depende do retorno esperado.',
      ],
    },
    {
      key: 'prazoInicio',
      label:
        'Se eu te mostrar um caminho claro para criar uma operação digital com sua marca, você começaria nos próximos 90 dias?',
      type: 'choice',
      options: [
        'Sim. Quero começar imediatamente.',
        'Sim. Quero avaliar.',
        'Talvez.',
        'Não neste momento.',
      ],
    },
    {
      key: 'faturamentoEsperado',
      label:
        'Qual faturamento mensal você acredita que uma plataforma própria deveria gerar para valer a pena para você?',
      type: 'choice',
      options: ['R$ 5.000/mês', 'R$ 10.000/mês', 'R$ 20.000/mês', 'R$ 50.000/mês', 'Mais de R$ 50.000/mês'],
    },
  ];

  if (!includeProfissao) {
    return contactAndQualifying;
  }

  return [
    {
      key: 'profissao',
      label: 'Você é:',
      type: 'choice',
      options: ['Médico', 'Nutricionista', 'Personal trainer'],
    },
    ...contactAndQualifying,
  ];
}

/** @deprecated Use getWhiteLabelLeadQuestions — mantido para imports legados. */
export const WHITELABEL_LEAD_QUESTIONS: WhiteLabelQuestion[] = getWhiteLabelLeadQuestions(null);

export const WHITELABEL_LEAD_ANSWER_KEYS = [
  'nome',
  'whatsapp',
  'email',
  'instagram',
  'situacaoProfissional',
  'objetivo3Anos',
  'interesseReduzirPlantao',
  'interessePlataformaMarca',
  'pacientesMes',
  'realidadeAtual',
  'interesseExperienciaDigital',
  'familiaridadeTecnologia',
  'investimentoDisponivel',
  'prazoInicio',
  'faturamentoEsperado',
] as const;

export const WHITELABEL_LEAD_REQUIRED_KEYS = [...WHITELABEL_LEAD_ANSWER_KEYS];

export function mapProfissaoChoiceToValue(choice: string): WhiteLabelProfissao | null {
  const normalized = choice.trim().toLowerCase();
  if (normalized === 'médico' || normalized === 'medico') return 'medico';
  if (normalized === 'nutricionista') return 'nutricionista';
  if (normalized.startsWith('personal')) return 'personal';
  return null;
}

export function mapProfissaoValueToChoice(profissao: WhiteLabelProfissao): string {
  if (profissao === 'nutricionista') return 'Nutricionista';
  if (profissao === 'personal') return 'Personal trainer';
  return 'Médico';
}
