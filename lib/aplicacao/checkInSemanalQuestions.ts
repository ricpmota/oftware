export type CheckInQuestionType = 'decimal' | 'choice' | 'textarea' | 'fotos';

export type CheckInQuestion = {
  key: string;
  label: string;
  type: CheckInQuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  unit?: string;
};

export const CHECK_IN_SEMANAL_QUESTIONS: CheckInQuestion[] = [
  {
    key: 'peso',
    label: 'Qual seu peso atual?',
    type: 'decimal',
    placeholder: '75,5',
    required: true,
    unit: 'kg',
  },
  {
    key: 'circunferenciaAbdominal',
    label: 'Qual sua circunferência abdominal atual?',
    type: 'decimal',
    placeholder: '98',
    required: false,
    unit: 'cm',
  },
  {
    key: 'localAplicacao',
    label: 'Onde você aplicou nesta semana?',
    type: 'choice',
    required: true,
    options: ['Abdômen', 'Braço', 'Perna'],
  },
  {
    key: 'fomeSemana',
    label: 'Como foi sua fome nesta semana?',
    type: 'choice',
    required: true,
    options: ['Muito controlada', 'Bem controlada', 'Moderada', 'Alta', 'Muito alta'],
  },
  {
    key: 'periodoMaisFome',
    label: 'Em qual período sentiu mais fome?',
    type: 'choice',
    required: true,
    options: ['Manhã', 'Tarde', 'Noite', 'Não percebi aumento da fome'],
  },
  {
    key: 'saciedadeAoComer',
    label: 'Você sentiu saciedade ao comer?',
    type: 'choice',
    required: true,
    options: ['Sempre', 'Na maioria das vezes', 'Algumas vezes', 'Raramente'],
  },
  {
    key: 'consumoAgua',
    label: 'Como foi seu consumo de água?',
    type: 'choice',
    required: true,
    options: ['Adequado', 'Poderia ter sido melhor', 'Ruim'],
  },
  {
    key: 'consumoProteinas',
    label: 'Como foi seu consumo de proteínas (carnes, ovos, peixes, frango)?',
    type: 'choice',
    required: true,
    options: ['Adequado', 'Poderia ter sido melhor', 'Ruim'],
  },
  {
    key: 'satisfacaoEvolucao',
    label: 'Você está satisfeito(a) com sua evolução nesta semana?',
    type: 'choice',
    required: true,
    options: ['Muito satisfeito(a)', 'Satisfeito(a)', 'Pouco satisfeito(a)', 'Insatisfeito(a)'],
  },
  {
    key: 'comentarioSemana',
    label: 'Gostaria de contar algo importante sobre esta semana?',
    type: 'textarea',
    required: false,
    placeholder: 'Opcional — conte como foi sua semana...',
  },
  {
    key: 'fotos',
    label: 'Gostaria de registrar suas fotos da evolução semanal?',
    type: 'fotos',
    required: false,
  },
];

/** Rótulos do formulário → valores salvos em `evolucaoSeguimento.localAplicacao`. */
export const LOCAL_APLICACAO_LABEL_TO_VALUE: Record<string, 'abdome' | 'coxa' | 'braco'> = {
  Abdômen: 'abdome',
  Braço: 'braco',
  Perna: 'coxa',
};

export type CheckInSemanalRespostas = {
  fomeSemana?: string;
  periodoMaisFome?: string;
  saciedadeAoComer?: string;
  consumoAgua?: string;
  consumoProteinas?: string;
  satisfacaoEvolucao?: string;
  comentarioSemana?: string;
};
