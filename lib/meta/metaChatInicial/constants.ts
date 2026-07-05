/** Intro "Começar" no fluxo real (/meta, metaadmin). */
export const META_CHAT_INTRO_SESSION_KEY = 'meta-chat-intro-v2';
/** Intro isolada do preview em metaadmingeral/chatinicial (não herda session do /meta). */
export const META_CHAT_INTRO_SANDBOX_SESSION_KEY = 'meta-chat-intro-sandbox-v1';

/** Passos V2: 0 intro | 1 tel … 14 metas | 15 médico UF | 16 lista | 17 concluído sem busca | 18 pós-solicitação */
export const META_CHAT_STEP_INTRO = 0;
export const META_CHAT_STEP_TELEFONE = 1;
export const META_CHAT_STEP_DATA_NASCIMENTO = 2;
export const META_CHAT_STEP_SEXO = 3;
export const META_CHAT_STEP_CPF = 4;
export const META_CHAT_STEP_PESO = 5;
export const META_CHAT_STEP_ALTURA = 6;
export const META_CHAT_STEP_CIRCUNFERENCIA = 7;
export const META_CHAT_STEP_MOTIVACAO = 8;
export const META_CHAT_STEP_DIAGNOSTICO = 9;
export const META_CHAT_STEP_COMORBIDADES = 10;
export const META_CHAT_STEP_RISCOS = 11;
export const META_CHAT_STEP_TIREOIDE = 12;
export const META_CHAT_STEP_SINTOMAS_GI = 13;
export const META_CHAT_STEP_METAS = 14;
export const META_CHAT_STEP_MEDICO_UF = 15;
export const META_CHAT_STEP_MEDICO_LISTA = 16;
export const META_CHAT_STEP_PERFIL_COMPLETO = 17;
export const META_CHAT_STEP_SOLICITACAO_ENVIADA = 18;

export const META_CHAT_LAST_ANAMNESE_STEP = META_CHAT_STEP_METAS;

/** Mensagens do bot por step (1=telefone … 14=metas). Step 0=intro sem bot. */
export const CHAT_BOT_TEXTS: readonly string[] = [
  'Pra começar, me conta qual é o melhor telefone para falar com você.\n\nSeu médico vai usar esse número para acompanhar sua evolução e manter contato com você durante o tratamento.',
  'Qual é a sua data de nascimento?\n\nIsso ajuda seu médico a personalizar seu acompanhamento com mais precisão.',
  'Como você prefere se identificar?',
  'Qual é o seu CPF?\n\nUsamos essa informação apenas para o seu cadastro e registro médico com segurança.',
  'Qual é o seu peso atual?\n\nSe quiser, pode informar um valor aproximado.',
  'Qual é a sua altura?\n\nVocê pode informar em centímetros ou em metros, como for mais fácil.',
  'Se você souber, qual é sua circunferência abdominal?\n\nSe não souber, é só tocar em "Não sei" para continuar.',
  'O que mais tem te incomodado hoje em relação ao seu peso?\n\nVocê pode marcar mais de uma opção.',
  'Qual dessas opções melhor descreve o principal motivo do seu acompanhamento?\n\nUsamos nomes mais simples para facilitar sua escolha.',
  'Além disso, você tem ou já teve alguma dessas condições?\n\nPode marcar mais de uma opção.',
  'Agora vou te fazer algumas perguntas rápidas sobre sua saúde.\n\nIsso ajuda seu médico a conduzir seu tratamento com mais segurança.',
  'Sobre sua tireoide, qual dessas opções melhor descreve você?',
  'Você costuma ter algum desses sintomas digestivos?\n\nMarque os que se aplicam ao seu dia a dia.',
  'Agora vamos definir suas metas de tratamento.\n\nEscolha quanto do seu peso inicial você deseja perder e, se você informou a circunferência abdominal, quantos centímetros deseja reduzir. Depois, toque em Enviar quando estiver satisfeito(a).',
];

export const TEXTO_INTRO_TITULO = 'Vamos montar juntos um plano personalizado para o seu tratamento.';
export const TEXTO_INTRO_HINT = 'Leva menos de 2 minutos.';

export const TEXTO_AGUARDANDO_ACEITE_MEDICO =
  'Você concluiu seu cadastro inicial.\n\nAgora é só aguardar o médico aceitar sua solicitação para iniciar o acompanhamento.';

export const TEXTO_PESQUISA_MEDICO =
  'Perfeito. Já entendemos seu perfil inicial.\n\nAgora escolha seu estado e sua cidade para encontrarmos um médico para acompanhar você no tratamento.';

export const TEXTO_FECHAMENTO_PERFIL =
  'Perfeito. Com suas respostas, já conseguimos montar seu perfil inicial de tratamento.';

export const TEXTO_POS_METAS_SEM_BUSCA_MEDICO =
  'Seu médico já está vinculado ao seu cadastro, então você não precisa escolher outro por aqui.\n\nPode seguir normalmente com o seu acompanhamento.';

export const TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA =
  'Seu perfil já está completo.\n\nComo você já tem um médico vinculado, esta etapa de busca por profissional não aparece para você.';

export const TEXTO_SOLICITACAO_PENDENTE =
  'Perfeito. Sua solicitação foi enviada.\n\nAgora é só aguardar a confirmação do médico.';

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const DIAGNOSTICO_LABELS: Record<string, string> = {
  dm1: 'Diabetes tipo 1',
  dm2: 'Diabetes tipo 2',
  pre_diabetes: 'Pré-diabetes',
  sobrepeso_comorbidade: 'Sobrepeso com problema de saúde',
  sop_ri: 'Ovário policístico (SOP)',
  ehna_sem_dm2: 'Gordura no fígado / esteatose hepática',
  obesidade: 'Obesidade',
  resistencia_insulinica: 'Resistência à insulina / síndrome metabólica',
  outro: 'Outro',
};

export const DIAGNOSTICO_TIPOS = [
  'dm1', 'dm2', 'pre_diabetes', 'sobrepeso_comorbidade', 'sop_ri', 'ehna_sem_dm2', 'obesidade', 'resistencia_insulinica', 'outro',
] as const;

export type RiskOption = 'sim' | 'nao' | 'desconheco';

export type RiskQuestion = {
  key: string;
  label: string;
  hint?: string;
  options: readonly RiskOption[];
};

export const RISK_QUESTIONS: readonly RiskQuestion[] = [
  { key: 'pancreatitePrevia', label: 'Você já teve pancreatite?', options: ['sim', 'nao'] },
  {
    key: 'gastroparesia',
    label: 'Você tem ou já teve esvaziamento lento do estômago (gastroparesia)?',
    options: ['sim', 'nao'],
  },
  {
    key: 'historicoCMT_MEN2',
    label: 'Existe histórico familiar de câncer medular de tireoide (CMT) ou MEN2?',
    hint:
      'CMT é um tipo raro de câncer de tireoide. MEN2 é uma condição hereditária que aumenta o risco desse câncer. ' +
      'Informar se alguém da sua família (pais, irmãos ou avós) teve algum desses diagnósticos ajuda o médico a definir o tratamento com mais segurança.',
    options: ['sim', 'nao', 'desconheco'],
  },
  { key: 'gestacao', label: 'Você está grávida ou pode estar?', options: ['sim', 'nao', 'desconheco'] },
  { key: 'lactacao', label: 'Você está em período de amamentação?', options: ['sim', 'nao'] },
];

export const MOTIVACAO_OPTIONS = [
  { key: 'estetica' as const, label: 'Estética' },
  { key: 'cansaco_falta_energia' as const, label: 'Cansaço / falta de energia' },
  { key: 'saude_exames_alterados' as const, label: 'Saúde / exames alterados' },
  { key: 'autoestima' as const, label: 'Autoestima' },
  { key: 'dificuldade_emagrecer' as const, label: 'Dificuldade para emagrecer' },
  { key: 'outro' as const, label: 'Outro' },
];

export const COMORBIDADES_OPTIONS = [
  { key: 'hipertensaoArterial', label: 'Pressão alta (hipertensão)' },
  { key: 'dislipidemia', label: 'Colesterol ou triglicerídeos altos' },
  { key: 'apneiaObstrutivaSono', label: 'Apneia do sono' },
  { key: 'esteatoseEHNA', label: 'Gordura no fígado / esteatose' },
  { key: 'doencaCardiovascular', label: 'Doença cardiovascular' },
  { key: 'doencaRenalCronica', label: 'Doença renal crônica' },
  { key: 'sop', label: 'Ovário policístico (SOP)' },
  { key: 'hipotireoidismo', label: 'Hipotireoidismo' },
  { key: 'asmaDPOC', label: 'Asma / DPOC' },
  { key: 'transtornoAnsiedadeDepressao', label: 'Ansiedade / depressão' },
  { key: 'nenhuma', label: 'Nenhuma' },
  { key: 'outra', label: 'Outra' },
] as const;

export const TIREOIDE_OPTIONS = [
  { value: 'eutireoidismo', label: 'Tireoide normal' },
  { value: 'hipotireoidismo_tratado', label: 'Hipotireoidismo tratado' },
  { value: 'nodulo_bocio', label: 'Nódulo ou bócio' },
  { value: 'tireoidite_previa', label: 'Tireoidite prévia' },
  { value: 'cmt_confirmado', label: 'CMT confirmado' },
  { value: 'outro', label: 'Outro' },
] as const;

export const SINTOMAS_GI_OPTIONS = [
  { key: 'plenitudePosPrandial', label: 'Sensação de estômago cheio / plenitude após comer' },
  { key: 'nauseaLeve', label: 'Náusea leve' },
  { key: 'constipacao', label: 'Constipação' },
  { key: 'refluxoPirose', label: 'Refluxo / queimação' },
  { key: 'nenhum', label: 'Nenhum' },
] as const;

export const SEXO_OPTIONS = [
  { value: 'M' as const, label: 'Masculino' },
  { value: 'F' as const, label: 'Feminino' },
  { value: 'Outro' as const, label: 'Prefiro não responder' },
];
