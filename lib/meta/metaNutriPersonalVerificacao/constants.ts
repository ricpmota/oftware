export const META_NUTRI_CHAT_INTRO_SESSION_KEY = 'meta-nutri-chat-intro-v1';
export const META_PERSONAL_CHAT_INTRO_SESSION_KEY = 'meta-personal-chat-intro-v1';

export const META_NUTRI_PERSONAL_STEP_INTRO = 0;
export const META_NUTRI_PERSONAL_STEP_NOME = 1;
export const META_NUTRI_PERSONAL_STEP_TELEFONE = 2;
export const META_NUTRI_PERSONAL_STEP_REGISTRO = 3;
export const META_NUTRI_PERSONAL_STEP_CIDADES = 4;
export const META_NUTRI_PERSONAL_STEP_CNH = 5;
export const META_NUTRI_PERSONAL_STEP_SELFIE = 6;
export const META_NUTRI_PERSONAL_STEP_REGISTRO_DOC = 7;
export const META_NUTRI_PERSONAL_STEP_COMPLETO = 9;

export const META_NUTRI_PERSONAL_WIZARD_PROGRESS_STEPS = 7;

export function getNutriPersonalIntroKey(tipo: 'nutri' | 'personal'): string {
  return tipo === 'nutri' ? META_NUTRI_CHAT_INTRO_SESSION_KEY : META_PERSONAL_CHAT_INTRO_SESSION_KEY;
}

export function nutriPersonalStepTexts(tipo: 'nutri' | 'personal'): Record<number, { title: string; hint?: string }> {
  const regLabel = tipo === 'nutri' ? 'CRN' : 'CREF';
  return {
    [META_NUTRI_PERSONAL_STEP_NOME]: {
      title: 'Como devemos te chamar no cadastro?',
      hint: 'Informe seu nome completo.',
    },
    [META_NUTRI_PERSONAL_STEP_TELEFONE]: {
      title: 'Qual seu telefone para contato profissional?',
    },
    [META_NUTRI_PERSONAL_STEP_REGISTRO]: {
      title: `Informe o número do seu registro profissional (${regLabel})`,
      hint: 'Apenas números.',
    },
    [META_NUTRI_PERSONAL_STEP_CIDADES]: {
      title: 'Em quais cidades você atende?',
      hint: 'Selecione estado e cidade na lista cadastrada (igual ao Meu Perfil). Se precisar de uma cidade que não aparece, use a opção para solicitar inclusão.',
    },
    [META_NUTRI_PERSONAL_STEP_CNH]: {
      title: 'Envie uma foto legível da sua CNH',
      hint: 'Frente e verso no mesmo arquivo ou só a frente, se preferir.',
    },
    [META_NUTRI_PERSONAL_STEP_SELFIE]: {
      title: 'Envie uma selfie segurando o documento ao lado do rosto',
      hint: 'Para verificação de identidade.',
    },
    [META_NUTRI_PERSONAL_STEP_REGISTRO_DOC]: {
      title: tipo === 'nutri' ? 'Envie uma foto nítida do seu CRN' : 'Envie uma foto nítida do seu CREF',
      hint: 'Cartão ou documento oficial.',
    },
  };
}
