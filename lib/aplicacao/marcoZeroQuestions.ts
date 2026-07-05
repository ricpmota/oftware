export type MarcoZeroQuestionType = 'decimal' | 'choice' | 'shorttext' | 'marco_fotos';

export type MarcoZeroQuestion = {
  key: string;
  label: string;
  type: MarcoZeroQuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  unit?: string;
};

export const MARCO_ZERO_INTRO = {
  titulo: 'Marco Zero do Tratamento',
  subtitulo:
    'Hoje vamos registrar seu ponto de partida. Essas informações serão utilizadas para acompanhar sua evolução ao longo das próximas semanas.',
};

export const MARCO_ZERO_QUESTIONS: MarcoZeroQuestion[] = [
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
    key: 'motivacaoPrincipal',
    label: 'O que mais te motivou a iniciar este tratamento?',
    type: 'choice',
    required: true,
    options: [
      'Melhorar minha saúde',
      'Perder peso',
      'Melhorar minha autoestima',
      'Melhorar minha disposição',
      'Controlar diabetes ou alterações metabólicas',
      'Outro',
    ],
  },
  {
    key: 'satisfacaoAtual',
    label: 'Como você se sente hoje em relação ao seu peso atual?',
    type: 'choice',
    required: true,
    options: [
      'Muito satisfeito(a)',
      'Satisfeito(a)',
      'Neutro',
      'Insatisfeito(a)',
      'Muito insatisfeito(a)',
    ],
  },
  {
    key: 'objetivoPaciente',
    label: 'Qual resultado você gostaria de alcançar nos próximos meses?',
    type: 'shorttext',
    required: true,
    placeholder: 'Ex.: Perder 10 kg, vestir uma roupa que não uso há anos…',
  },
  {
    key: 'confiancaNoObjetivo',
    label: 'Você acredita que conseguirá atingir seu objetivo?',
    type: 'choice',
    required: true,
    options: ['Sim, totalmente', 'Acredito que sim', 'Tenho dúvidas', 'Estou inseguro(a)'],
  },
  {
    key: 'fotos',
    label: 'Registro fotográfico',
    type: 'marco_fotos',
    required: false,
  },
];

export type MarcoZeroRespostas = {
  motivacaoPrincipal?: string;
  satisfacaoAtual?: string;
  objetivoPaciente?: string;
  confiancaNoObjetivo?: string;
};
