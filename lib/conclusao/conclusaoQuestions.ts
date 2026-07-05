export type ConclusaoQuestionType = 'decimal' | 'choice' | 'textarea';

export type ConclusaoQuestion = {
  key: string;
  label: string;
  type: ConclusaoQuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  unit?: string;
  hint?: string;
};

export const PERCEPCAO_RESULTADO_OPCOES = [
  'Muito acima do esperado',
  'Acima do esperado',
  'Dentro do esperado',
  'Abaixo do esperado',
  'Muito abaixo do esperado',
] as const;

export const PRINCIPAL_CONQUISTA_OPCOES = [
  'Perda de peso',
  'Melhora da autoestima',
  'Mais disposição',
  'Melhora dos exames',
  'Redução de medidas',
  'Controle da fome',
  'Mudança de hábitos',
  'Outro',
] as const;

export const CONCLUSAO_QUESTIONS: ConclusaoQuestion[] = [
  {
    key: 'pesoFinal',
    label: 'Qual seu peso final?',
    type: 'decimal',
    placeholder: 'Ex: 72,5',
    required: true,
    unit: 'kg',
  },
  {
    key: 'circunferenciaAbdominal',
    label: 'Qual sua circunferência abdominal final?',
    type: 'decimal',
    placeholder: 'Ex: 92',
    required: false,
    unit: 'cm',
    hint: 'Essa medida ajuda a visualizar sua evolução corporal além do peso.',
  },
  {
    key: 'percepcaoResultadoFinal',
    label: 'Como você avalia seu resultado ao final do tratamento?',
    type: 'choice',
    required: true,
    options: [...PERCEPCAO_RESULTADO_OPCOES],
  },
  {
    key: 'principalConquista',
    label: 'Qual foi sua principal conquista durante o tratamento?',
    type: 'choice',
    required: true,
    options: [...PRINCIPAL_CONQUISTA_OPCOES],
  },
  {
    key: 'depoimento',
    label: 'Gostaria de deixar um depoimento sobre sua experiência?',
    type: 'textarea',
    placeholder:
      'Conte como foi sua experiência, o que mudou na sua rotina e como você se sente ao final do tratamento.',
    required: false,
  },
];
