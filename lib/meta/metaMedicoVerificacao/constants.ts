export const META_MEDICO_CHAT_INTRO_SESSION_KEY = 'meta-medico-chat-intro-v1';

export const META_MEDICO_STEP_INTRO = 0;
export const META_MEDICO_STEP_NOME = 1;
export const META_MEDICO_STEP_TELEFONE = 2;
export const META_MEDICO_STEP_GENERO = 3;
export const META_MEDICO_STEP_CPF = 4;
export const META_MEDICO_STEP_CRM = 5;
export const META_MEDICO_STEP_ENDERECO = 6;
export const META_MEDICO_STEP_CIDADES = 7;
export const META_MEDICO_STEP_CNH = 8;
export const META_MEDICO_STEP_SELFIE = 9;
export const META_MEDICO_STEP_CRM_DOC = 10;
export const META_MEDICO_STEP_COMPLETO = 11;

export const META_MEDICO_WIZARD_PROGRESS_STEPS = 10;

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const MEDICO_STEP_TEXTS: Record<number, { title: string; hint?: string }> = {
  [META_MEDICO_STEP_NOME]: {
    title: 'Como devemos te chamar no cadastro?',
    hint: 'Informe seu nome completo.',
  },
  [META_MEDICO_STEP_TELEFONE]: {
    title: 'Qual seu telefone para contato profissional?',
  },
  [META_MEDICO_STEP_GENERO]: {
    title: 'Você é Dr. ou Dra.?',
  },
  [META_MEDICO_STEP_CPF]: {
    title: 'Qual seu CPF?',
    hint: 'Usado apenas para conferência cadastral e verificação.',
  },
  [META_MEDICO_STEP_CRM]: {
    title: 'Informe o número do CRM e o estado (UF) de registro.',
  },
  [META_MEDICO_STEP_ENDERECO]: {
    title: 'Qual o endereço do seu consultório ou local de atendimento?',
    hint: 'Você pode informar o CEP primeiro para completar o logradouro.',
  },
  [META_MEDICO_STEP_CIDADES]: {
    title: 'Em quais cidades você atende?',
    hint: 'Selecione estado e cidade na lista cadastrada (igual ao Meu Perfil). Se precisar de uma cidade que não aparece, use a opção para solicitar inclusão.',
  },
  [META_MEDICO_STEP_CNH]: {
    title: 'Envie uma foto legível da sua CNH',
    hint: 'Frente e verso no mesmo arquivo ou só a frente, se preferir.',
  },
  [META_MEDICO_STEP_SELFIE]: {
    title: 'Envie uma selfie segurando o documento ao lado do rosto',
    hint: 'Para verificação de identidade.',
  },
  [META_MEDICO_STEP_CRM_DOC]: {
    title: 'Envie uma foto nítida do seu CRM',
    hint: 'Cartão ou documento oficial.',
  },
};
