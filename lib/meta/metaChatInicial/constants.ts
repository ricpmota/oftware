/** Intro "Começar" no fluxo real (/meta, metaadmin). */
export const META_CHAT_INTRO_SESSION_KEY = 'meta-chat-intro-v2';
/** Intro isolada do preview em metaadmingeral/chatinicial (não herda session do /meta). */
export const META_CHAT_INTRO_SANDBOX_SESSION_KEY = 'meta-chat-intro-sandbox-v1';

/**
 * Passos V2: 0 intro | 1 tel | 30 localização do paciente | 2 nascimento … 13 sintomas GI
 * | 33 depressão | 34 ideação | 14 metas
 * | 15 médico UF | 16 lista | 17 concluído sem busca | 18 pós-solicitação.
 *
 * A localização fica entre o telefone e o nascimento na navegação do /meta,
 * com número 30 para não deslocar os passos já usados pelo chat e pelo perfil metabólico.
 */
export const META_CHAT_STEP_INTRO = 0;
export const META_CHAT_STEP_TELEFONE = 1;
export const META_CHAT_STEP_LOCALIZACAO = 30;
export const META_CHAT_STEP_DATA_NASCIMENTO = 2;
export const META_CHAT_STEP_SEXO = 3;
export const META_CHAT_STEP_CPF = 4;
export const META_CHAT_STEP_PESO = 5;
export const META_CHAT_STEP_ALTURA = 6;
export const META_CHAT_STEP_CIRCUNFERENCIA = 7;
export const META_CHAT_STEP_MOTIVACAO = 8;
export const META_CHAT_STEP_DIAGNOSTICO = 9;
/** Medicamentos do diabetes: só entra no fluxo se dm1 ou dm2 estiver marcado. */
export const META_CHAT_STEP_MEDICAMENTOS_DIABETES = 32;
export const META_CHAT_STEP_COMORBIDADES = 10;
/** Cirurgias: entre comorbidades e riscos, sem deslocar os passos já usados. */
export const META_CHAT_STEP_CIRURGIAS = 31;
export const META_CHAT_STEP_RISCOS = 11;
export const META_CHAT_STEP_TIREOIDE = 12;
export const META_CHAT_STEP_SINTOMAS_GI = 13;
/** Triagem de humor: depois dos sintomas digestivos e antes das metas. */
export const META_CHAT_STEP_DEPRESSAO = 33;
export const META_CHAT_STEP_IDEACAO_SUICIDA = 34;
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
  'Você foi diagnosticado com alguma das seguintes condições?',
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

export const TEXTO_LOCALIZACAO_PACIENTE =
  'Agora, onde você mora?\n\nSelecione seu estado e sua cidade.';

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

export const DIAGNOSTICO_NENHUMA = 'nenhuma';

/** Opções novas do passo de diagnóstico. Diabetes tipo 1 e 2 ficam no modal. */
export const DIAGNOSTICO_OPCOES_ATIVAS = [
  'pre_diabetes',
  'hipertensao_arterial',
  'dislipidemia',
  'apneia_sono',
  'ehna_sem_dm2',
  'sop_ri',
  'nenhuma',
] as const;

/** Chaves antigas: não aparecem para quem ainda não marcou, mas continuam no histórico. */
export const DIAGNOSTICO_TIPOS_LEGADO = [
  'sobrepeso_comorbidade',
  'obesidade',
  'resistencia_insulinica',
  'outro',
] as const;

export const DIAGNOSTICO_LABELS: Record<string, string> = {
  dm1: 'Diabetes tipo 1',
  dm2: 'Diabetes tipo 2',
  pre_diabetes: 'Pré-diabetes',
  hipertensao_arterial: 'Hipertensão arterial (mesmo que controlada)',
  dislipidemia: 'Colesterol ou triglicérides alto',
  apneia_sono: 'Apnéia do sono',
  ehna_sem_dm2: 'Esteatose hepática (fígado gorduroso)',
  sop_ri: 'Síndrome dos ovários policísticos (SOP)',
  nenhuma: 'Nenhuma dessas',
  sobrepeso_comorbidade: 'Sobrepeso com problema de saúde',
  obesidade: 'Obesidade',
  resistencia_insulinica: 'Resistência à insulina / síndrome metabólica',
  outro: 'Outro',
};

export const DIAGNOSTICO_TIPOS = [
  'dm1',
  'dm2',
  'pre_diabetes',
  'hipertensao_arterial',
  'dislipidemia',
  'apneia_sono',
  'ehna_sem_dm2',
  'sop_ri',
  'nenhuma',
  'sobrepeso_comorbidade',
  'obesidade',
  'resistencia_insulinica',
  'outro',
] as const;

export const DIABETES_TIPO_OPCOES = [
  {
    value: 'dm1' as const,
    label: 'Tipo 1',
    descricao:
      'O pâncreas produz pouca ou nenhuma insulina. Costuma ser diagnosticado mais cedo e o tratamento inclui insulina.',
  },
  {
    value: 'dm2' as const,
    label: 'Tipo 2',
    descricao:
      'O corpo produz insulina, mas não consegue usá-la direito. É o tipo mais comum e pode aparecer em qualquer idade.',
  },
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

const COMORBIDADES_METABOLICOS = [
  { key: 'retinopatiaDiabetica' as const, label: 'Retinopatia Diabética' },
] as const;

const COMORBIDADES_ALIMENTARES = [
  { key: 'anorexia' as const, label: 'Anorexia' },
  { key: 'bulimia' as const, label: 'Bulimia' },
  { key: 'psicoses' as const, label: 'Psicoses' },
  { key: 'esquizofrenia' as const, label: 'Esquizofrenia' },
] as const;

const COMORBIDADES_ABDOMINAIS = [
  { key: 'pancreatiteAgudaOuCronica' as const, label: 'Pancreatite aguda ou crônica' },
  { key: 'insuficienciaRenal' as const, label: 'Insuficiência Renal' },
  { key: 'insuficienciaHepatica' as const, label: 'Insuficiência Hepática' },
  { key: 'problemaVesiculaBiliar' as const, label: 'Problema atual na vesícula biliar' },
  { key: 'gastroparesia' as const, label: 'Gastroparesia' },
  { key: 'problemasGravesIntestinoEstomago' as const, label: 'Problemas GRAVES no intestino ou estômago' },
] as const;

const COMORBIDADES_CARDIOVASCULARES = [
  { key: 'dorPeitoEsforco' as const, label: 'Dor no peito ao fazer esforço' },
  { key: 'faltaArDeitarOuEscadas' as const, label: 'Falta de ar ao deitar ou subir escadas' },
  { key: 'infartoOuAvcAnterior' as const, label: 'Infarto ou AVC anterior' },
  { key: 'hipertensaoDescontrolada' as const, label: 'Hipertensão arterial - atualmente descontrolada ou com sintomas' },
  { key: 'arritmiaSignificativa' as const, label: 'Arritmia cardíaca significativa' },
  { key: 'desmaiosFrequentes' as const, label: 'Desmaios frequentes' },
] as const;

const COMORBIDADES_OUTROS = [
  { key: 'cancerAtualOuRecente' as const, label: 'Câncer (atual ou curado há menos de 5 anos)' },
  { key: 'carcinomaMedularTireoide' as const, label: 'Carcinoma medular de tireoide (câncer muito raro)' },
  { key: 'nem2' as const, label: 'Síndrome de neoplasia endócrina múltipla tipo 2 (NEM 2)' },
  { key: 'fibroseCistica' as const, label: 'Fibrose cística' },
] as const;

export const COMORBIDADES_NENHUMA = { key: 'nenhuma' as const, label: 'Nenhuma das opções' };

/** Opções que saíram da lista, mas continuam no histórico de quem já respondeu. */
export const COMORBIDADES_LEGADO = [
  { key: 'hipertensaoArterial' as const, label: 'Pressão alta (hipertensão)' },
  { key: 'dislipidemia' as const, label: 'Colesterol ou triglicerídeos altos' },
  { key: 'apneiaObstrutivaSono' as const, label: 'Apneia do sono' },
  { key: 'esteatoseEHNA' as const, label: 'Gordura no fígado / esteatose' },
  { key: 'doencaCardiovascular' as const, label: 'Doença cardiovascular' },
  { key: 'doencaRenalCronica' as const, label: 'Doença renal crônica' },
  { key: 'sop' as const, label: 'Ovário policístico (SOP)' },
  { key: 'hipotireoidismo' as const, label: 'Hipotireoidismo' },
  { key: 'asmaDPOC' as const, label: 'Asma / DPOC' },
  { key: 'transtornoAnsiedadeDepressao' as const, label: 'Ansiedade / depressão' },
  { key: 'outra' as const, label: 'Outra' },
] as const;

export const COMORBIDADES_GRUPOS = [
  { id: 'metabolicos', titulo: 'Metabólicos', opcoes: COMORBIDADES_METABOLICOS },
  { id: 'alimentares', titulo: 'Alimentares e/ou Psicológicos', opcoes: COMORBIDADES_ALIMENTARES },
  { id: 'abdominais', titulo: 'Distúrbios Abdominais Graves', opcoes: COMORBIDADES_ABDOMINAIS },
  { id: 'cardiovascular', titulo: 'Risco Cardiovascular', opcoes: COMORBIDADES_CARDIOVASCULARES },
  { id: 'outros', titulo: 'Outros', opcoes: COMORBIDADES_OUTROS },
] as const;

export const COMORBIDADES_OPTIONS = [
  ...COMORBIDADES_METABOLICOS,
  ...COMORBIDADES_ALIMENTARES,
  ...COMORBIDADES_ABDOMINAIS,
  ...COMORBIDADES_CARDIOVASCULARES,
  ...COMORBIDADES_OUTROS,
  COMORBIDADES_NENHUMA,
  ...COMORBIDADES_LEGADO,
] as const;

export const TEXTO_DEPRESSAO =
  'Você tem diagnóstico de depressão, ou teve sintomas de tristeza intensa ou perda de interesse nas atividades do dia a dia nos últimos 30 dias?';

export const TEXTO_IDEACAO_SUICIDA =
  'Nos últimos 12 meses, você teve pensamentos de tirar a própria vida?';

export const TEXTO_CIRURGIAS =
  'Você já realizou alguma dessas cirurgias?\n\nPode marcar mais de uma opção.';

const CIRURGIAS_BARIATRICAS = [
  { key: 'sleeveGastrico' as const, label: 'Sleeve gástrico (gastrectomia vertical)' },
  { key: 'bypassGastrico' as const, label: 'Bypass gástrico (Roux-en-Y)' },
  { key: 'bandaGastrica' as const, label: 'Banda gástrica ajustável' },
  { key: 'switchDuodenal' as const, label: 'Switch duodenal / derivação biliopancreática' },
  { key: 'bariatricaNaoLembra' as const, label: 'Fiz, mas não me lembro o nome' },
] as const;

const CIRURGIAS_TRANSPLANTE = [
  { key: 'transplanteFigadoRimPancreas' as const, label: 'Transplante de fígado, rim ou pâncreas' },
  { key: 'retiradaParteIntestino' as const, label: 'Retirada de uma parte do intestino' },
  { key: 'retiradaPancreas' as const, label: 'Retirada parcial ou total do pâncreas' },
  { key: 'retiradaParteFigado' as const, label: 'Retirada de uma parte grande do fígado' },
  { key: 'outrasGrandesCirurgias' as const, label: 'Outras grandes cirurgias' },
] as const;

export const CIRURGIAS_NENHUMA = { key: 'nenhuma' as const, label: 'Nenhuma das opções acima' };

export const CIRURGIAS_GRUPOS = [
  { id: 'bariatricas', titulo: 'Bariátricas', opcoes: CIRURGIAS_BARIATRICAS },
  { id: 'transplante', titulo: 'Transplante ou grandes retiradas de órgãos', opcoes: CIRURGIAS_TRANSPLANTE },
] as const;

export const CIRURGIAS_OPTIONS = [
  ...CIRURGIAS_BARIATRICAS,
  ...CIRURGIAS_TRANSPLANTE,
  CIRURGIAS_NENHUMA,
] as const;

export const MEDICAMENTOS_DIABETES_OPTIONS = [
  { key: 'nenhum' as const, label: 'Nenhum medicamento' },
  { key: 'insulina' as const, label: 'Insulina' },
  { key: 'sulfonilureias' as const, label: 'Sulfonilureias (ex., glibenclamida, glicazida, glimepirida)' },
  {
    key: 'outrosAntidiabeticosOrais' as const,
    label: 'Outros antidiabéticos orais (ex., metformina, sitagliptina, empagliflozina)',
  },
  { key: 'outros' as const, label: 'Outros' },
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
