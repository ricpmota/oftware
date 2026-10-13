export const META_NUTRI_CHAT_INTRO_SESSION_KEY = 'meta-nutri-chat-intro-v1';
export const META_PERSONAL_CHAT_INTRO_SESSION_KEY = 'meta-personal-chat-intro-v1';
export const META_PSI_CHAT_INTRO_SESSION_KEY = 'meta-psi-chat-intro-v1';

/** UI do wizard compartilhado. Domínio persistido: nutricionista | personal_trainer | psiquiatra. */
export type NutriPersonalWizardTipo = 'nutri' | 'personal' | 'psi';

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

export function nutriPersonalRegistroLabel(tipo: NutriPersonalWizardTipo): string {
  if (tipo === 'nutri') return 'CRN';
  if (tipo === 'personal') return 'CREF';
  return 'CRM';
}

export function wizardTipoToUploadProfissao(
  tipo: NutriPersonalWizardTipo
): 'nutricionista' | 'personal' | 'psiquiatra' {
  if (tipo === 'nutri') return 'nutricionista';
  if (tipo === 'personal') return 'personal';
  return 'psiquiatra';
}

export function getNutriPersonalIntroKey(tipo: NutriPersonalWizardTipo): string {
  if (tipo === 'nutri') return META_NUTRI_CHAT_INTRO_SESSION_KEY;
  if (tipo === 'personal') return META_PERSONAL_CHAT_INTRO_SESSION_KEY;
  return META_PSI_CHAT_INTRO_SESSION_KEY;
}

export function nutriPersonalStepTexts(
  tipo: NutriPersonalWizardTipo
): Record<number, { title: string; hint?: string }> {
  const regLabel = nutriPersonalRegistroLabel(tipo);
  return {
    [META_NUTRI_PERSONAL_STEP_NOME]: {
      title: 'Como devemos te chamar no cadastro?',
      hint: 'Informe seu nome completo.',
    },
    [META_NUTRI_PERSONAL_STEP_TELEFONE]: {
      title: 'Qual seu telefone para contato profissional?',
    },
    [META_NUTRI_PERSONAL_STEP_REGISTRO]: {
      title:
        tipo === 'psi'
          ? 'Informe o número do CRM e o estado (UF) de registro.'
          : `Informe o número do seu registro profissional (${regLabel})`,
      hint: tipo === 'psi' ? 'CRM apenas com números. UF obrigatória.' : 'Apenas números.',
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
      title: `Envie uma foto nítida do seu ${regLabel}`,
      hint: tipo === 'psi' ? 'Cartão ou documento oficial do CRM.' : 'Cartão ou documento oficial.',
    },
  };
}
