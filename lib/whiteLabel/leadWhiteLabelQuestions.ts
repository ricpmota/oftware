export type WhiteLabelQuestionType = 'text' | 'email' | 'tel' | 'choice';

export type WhiteLabelQuestion = {
  key: string;
  label: string;
  type: WhiteLabelQuestionType;
  placeholder?: string;
  options?: string[];
};

export const WHITELABEL_LEAD_QUESTIONS: WhiteLabelQuestion[] = [
  {
    key: 'nome',
    label: 'Qual o seu nome?',
    type: 'text',
    placeholder: 'Dr(a). Seu nome',
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
    options: [
      'Trabalho principalmente em plantões e convênios.',
      'Trabalho em plantões, mas estou construindo meu consultório particular.',
      'Já tenho consultório particular, mas ainda dependo parcialmente de plantões.',
      'Vivo exclusivamente do particular.',
      'Já possuo clínica, empresa ou outro negócio na área da saúde.',
    ],
  },
  {
    key: 'objetivo3Anos',
    label: 'Qual é o seu maior objetivo para os próximos 3 anos?',
    type: 'choice',
    options: [
      'Aumentar meu faturamento como médico.',
      'Ter mais pacientes particulares.',
      'Abrir uma clínica.',
      'Construir uma empresa na área da saúde.',
      'Criar uma fonte de renda escalável além das consultas.',
    ],
  },
  {
    key: 'interesseReduzirPlantao',
    label:
      'Se eu te mostrar como médicos estão usando uma plataforma própria para reduzir a dependência de plantões e criar novas fontes de receita, você teria interesse em conhecer?',
    type: 'choice',
    options: ['Sim, imediatamente.', 'Sim, quero entender melhor.', 'Talvez.', 'Não é uma prioridade hoje.'],
  },
  {
    key: 'interessePlataformaMarca',
    label: 'Você teria interesse em ter uma plataforma com a sua marca para acompanhar pacientes?',
    type: 'choice',
    options: ['Sim, imediatamente.', 'Sim, quero entender melhor.', 'Talvez.', 'Não tenho interesse.'],
  },
  {
    key: 'pacientesMes',
    label: 'Quantos pacientes você acompanha atualmente por mês?',
    type: 'choice',
    options: ['Menos de 50.', 'Entre 50 e 100.', 'Entre 100 e 300.', 'Entre 300 e 500.', 'Mais de 500.'],
  },
  {
    key: 'realidadeAtual',
    label: 'Qual dessas situações mais se aproxima da sua realidade?',
    type: 'choice',
    options: [
      'Tenho pacientes, mas não consigo acompanhar todos adequadamente.',
      'Perco pacientes por falta de recorrência.',
      'Faço tudo manualmente.',
      'Tenho equipe, mas faltam processos.',
      'Quero escalar meu atendimento sem aumentar proporcionalmente minhas horas de trabalho.',
    ],
  },
  {
    key: 'interesseExperienciaDigital',
    label:
      'Se pudesse oferecer uma experiência digital completa ao paciente com app, acompanhamento, prescrições, exames, IA e equipe multidisciplinar, qual seria seu interesse?',
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
    label: 'Qual faturamento mensal você acredita que uma plataforma própria deveria gerar para valer a pena para você?',
    type: 'choice',
    options: ['R$ 5.000/mês', 'R$ 10.000/mês', 'R$ 20.000/mês', 'R$ 50.000/mês', 'Mais de R$ 50.000/mês'],
  },
];

export const WHITELABEL_LEAD_REQUIRED_KEYS = WHITELABEL_LEAD_QUESTIONS.map((q) => q.key);
