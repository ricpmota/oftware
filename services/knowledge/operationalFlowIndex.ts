/**
 * Índice único dos fluxos operacionais oficiais.
 * Fonte: docs/conhecimento/oftware_fluxos_operacionais.md
 */

import type { OperationalProfile } from './operationalFlowTypes';

export type OperationalFlowDefinition = {
  id: string;
  profile: OperationalProfile;
  surface: string;
  objective: string;
  title: string;
  /** Texto contínuo para embedding (passos + contexto). */
  instructions: string;
  keywords: string[];
  /** Perguntas/frases típicas para melhorar recall semântico. */
  examples: string[];
  steps: string[];
  fallbackLeadIn: string;
  /** Grupos para o resolver heurístico (mesma lógica de pesos do v1). */
  heuristicKeywordGroups: string[][];
  heuristicWeights?: number[];
};

export const OPERATIONAL_FLOW_SOURCE_PATH = 'docs/conhecimento/oftware_fluxos_operacionais.md';

/** Texto concatenado para cache de embedding por fluxo. */
export function flowTextForEmbedding(flow: OperationalFlowDefinition): string {
  const kw = flow.keywords.join(', ');
  const ex = flow.examples.join('\n');
  return [flow.title, flow.objective, kw, ex].filter(Boolean).join('\n\n');
}

/**
 * Definições na ordem de prioridade aproximada (desempate no tie-break).
 */
export const OPERATIONAL_FLOW_DEFINITIONS: OperationalFlowDefinition[] = [
  {
    id: 'metaadmin_plano_terapeutico',
    profile: 'medico',
    surface: '/metaadmin',
    objective: 'cadastrar / configurar tratamento do paciente (plano terapêutico)',
    title: 'Cadastrar ou configurar tratamento (plano terapêutico) — médico',
    instructions: [
      'Rota /metaadmin — login Google como médico.',
      'Menu Pacientes / Meus pacientes — abrir o paciente na lista.',
      'Abrir edição do paciente (modal com pastas / abas de informação).',
      'Na Pasta 5 — Plano terapêutico (ou equivalente): informar dados do plano conforme o formulário.',
      'Salvar no modal — o sistema grava o plano.',
    ].join('\n'),
    keywords: [
      'plano terapêutico',
      'plano terapeutico',
      'metaadmin',
      'pacientes',
      'pasta 5',
      'salvar',
      'modal',
      'tratamento',
      'dose',
      'cadastrar tratamento',
      'configurar tratamento',
    ],
    examples: [
      'como faço pra cadastrar o tratamento?',
      'como configurar o plano terapêutico do paciente?',
      'onde edito o plano do paciente no painel do médico?',
      'como lanço o tratamento do paciente?',
      'onde registro o plano terapêutico?',
    ],
    steps: [
      'Entre em /metaadmin com login Google de médico.',
      'Abra o menu Pacientes / Meus pacientes.',
      'Selecione o paciente na lista.',
      'Abra a edição do paciente (modal com pastas / abas).',
      'Vá para a Pasta 5 — Plano terapêutico.',
      'Preencha os campos exibidos no formulário do plano (datas, periodicidade, doses, metas — conforme a tela).',
      'Salve as alterações no modal.',
    ],
    fallbackLeadIn: 'cadastrar ou configurar o tratamento (plano terapêutico) do paciente',
    heuristicKeywordGroups: [
      [
        'cadastrar tratamento',
        'cadastrar o tratamento',
        'configurar tratamento',
        'configurar o tratamento',
        'plano terapêutico',
        'plano terapeutico',
        'configurar plano',
        'editar plano do paciente',
        'como faço pra cadastrar o tratamento',
        'lanço o tratamento',
        'lancar o tratamento',
        'lançar tratamento',
      ],
      ['metaadmin', 'meus pacientes', 'paciente na lista', 'modal do paciente', 'pasta 5', 'crm', 'médico no sistema', 'medico no sistema'],
    ],
    heuristicWeights: [1.4, 0.85],
  },
  {
    id: 'meta_meus_tratamentos',
    profile: 'paciente',
    surface: '/meta',
    objective: 'ver plano / tratamento (informação, não edição)',
    title: 'Ver tratamento / plano — paciente (somente leitura)',
    instructions: [
      'Rota /meta.',
      'Acessar área Meus Tratamentos (ou nome equivalente no menu do paciente).',
      'Visualizar datas, doses, histórico e metas definidos pelo médico — paciente não cadastra tratamento.',
    ].join('\n'),
    keywords: ['meus tratamentos', 'ver tratamento', 'plano', 'dose', 'histórico', 'paciente', '/meta', 'somente leitura'],
    examples: ['onde vejo meus tratamentos?', 'onde vejo o histórico de doses?', 'como consultar meu plano?'],
    steps: [
      'Entre em /meta com login Google como Paciente.',
      'Abra a área Meus Tratamentos no app do paciente (menu conforme seu layout).',
      'Consulte datas, doses, histórico e metas definidos pelo médico — visualização apenas; o paciente não cadastra o plano terapêutico aqui.',
    ],
    fallbackLeadIn: 'ver seus tratamentos e o plano definido pelo médico',
    heuristicKeywordGroups: [
      ['meus tratamentos', 'ver tratamento', 'ver plano', 'onde vejo o tratamento', 'onde vejo os tratamentos', 'histórico do tratamento', 'dose atual', 'aplicações'],
      ['paciente', 'no app', 'minha conta', '/meta'],
    ],
    heuristicWeights: [1.35, 0.5],
  },
  {
    id: 'meta_buscar_medico',
    profile: 'paciente',
    surface: '/meta',
    objective: 'buscar médico para vínculo e acompanhar solicitações',
    title: 'Buscar médico, solicitar vínculo e status — paciente',
    instructions: [
      'Rota /meta — busca / encontrar profissional; enviar solicitação de vínculo.',
      'Acompanhar status em Minhas solicitações até aceite ou recusa.',
    ].join('\n'),
    keywords: [
      'buscar médico',
      'encontrar profissional',
      'vínculo',
      'solicitação',
      'minhas solicitações',
      'pendente',
      'aceite',
    ],
    examples: [
      'como encontro um médico?',
      'onde vejo o status da solicitação?',
      'solicitação pendente do médico',
      'como acho um médico na plataforma?',
    ],
    steps: [
      'Entre em /meta com login Google como Paciente.',
      'Use a busca / encontrar profissional conforme as telas do app.',
      'Envie a solicitação de vínculo ao profissional escolhido.',
      'Acompanhe o status em Minhas solicitações até aceite ou recusa.',
    ],
    fallbackLeadIn: 'buscar um médico e solicitar vínculo',
    heuristicKeywordGroups: [
      [
        'buscar médico',
        'buscar medico',
        'encontrar médico',
        'encontrar medico',
        'encontrar um médico',
        'encontrar um medico',
        'como acho um médico',
        'procurar médico',
        'procurar medico',
        'solicitar vínculo',
        'solicitar vinculo',
        'convite do médico',
        'pedido de vínculo',
      ],
      ['minhas solicitações', 'minhas solicitacoes', 'status da solicitação', 'solicitação pendente', 'aceite do médico'],
    ],
    heuristicWeights: [1.45, 1.1],
  },
  {
    id: 'metaadmin_novo_paciente',
    profile: 'medico',
    surface: '/metaadmin',
    objective: 'incluir novo paciente na carteira',
    title: 'Cadastrar novo paciente — médico',
    instructions: [
      '/metaadmin → Pacientes.',
      'Cadastrar novo paciente (modal simples) com nome, e-mail e dados básicos.',
      'Opcional: edição completa (9 pastas) para anamnese.',
    ].join('\n'),
    keywords: ['novo paciente', 'cadastrar paciente', 'metaadmin', 'modal', 'e-mail', 'carteira'],
    examples: ['como cadastro um novo paciente?', 'incluir paciente na lista'],
    steps: [
      'Entre em /metaadmin com login Google de médico.',
      'Abra Pacientes.',
      'Use Cadastrar novo paciente (modal simples) e preencha nome, e-mail e demais campos obrigatórios da tela.',
      'Se necessário, abra a edição completa (9 pastas) para anamnese e demais dados.',
    ],
    fallbackLeadIn: 'cadastrar um novo paciente',
    heuristicKeywordGroups: [
      ['novo paciente', 'cadastrar paciente', 'adicionar paciente', 'incluir paciente', 'criar paciente'],
      ['metaadmin', 'pacientes', 'modal', 'cadastro básico'],
    ],
    heuristicWeights: [1.35, 0.6],
  },
  {
    id: 'metanutri_acesso',
    profile: 'nutricionista',
    surface: '/metanutri',
    objective: 'acessar pacientes e plano nutricional',
    title: 'Área do nutricionista — pacientes e plano',
    instructions: [
      'Rota /metanutri após login como nutricionista.',
      'Menus: home, medicos, pacientes, financeiro, calendario, meu-perfil.',
      'Pacientes → selecionar paciente → plano, check-in, bioimpedância conforme telas.',
    ].join('\n'),
    keywords: ['metanutri', 'nutricionista', 'pacientes', 'plano nutricional', 'bioimpedância'],
    examples: ['como acesso meus pacientes na nutri?', 'onde fica o plano nutricional?'],
    steps: [
      'Entre em /metanutri com login Google de nutricionista.',
      'Use os menus home, médicos, pacientes, financeiro, calendário ou meu-perfil conforme apresentado no app.',
      'Em Pacientes, selecione o paciente para ver plano, check-in, bioimpedância etc., conforme as telas.',
    ],
    fallbackLeadIn: 'usar a área do nutricionista',
    heuristicKeywordGroups: [
      ['metanutri', 'nutricionista', 'área da nutri', 'plano nutricional do paciente', 'bioimpedância no paciente'],
      ['menu pacientes', 'home nutri', 'financeiro nutri'],
    ],
    heuristicWeights: [1.2, 0.55],
  },
  {
    id: 'meta_nutri_paciente',
    profile: 'paciente',
    surface: '/meta/nutri',
    objective: 'plano alimentar e check-in nutricional',
    title: 'Paciente — plano alimentar e check-in (/meta/nutri)',
    instructions: [
      'Rota /meta/nutri.',
      'Estados: carregamento → wizard (questionário) → plano → check-in diário.',
    ].join('\n'),
    keywords: ['meta/nutri', 'plano alimentar', 'check-in', 'nutri', 'questionário wizard'],
    examples: ['onde faço o check-in nutricional?', 'como vejo meu plano alimentar?'],
    steps: [
      'Entre em /meta/nutri com login Google como Paciente.',
      'Siga o fluxo exibido pelo app: carregamento → wizard (questionário) → plano → check-in diário, conforme as telas.',
    ],
    fallbackLeadIn: 'usar o plano alimentar e o check-in nutricional',
    heuristicKeywordGroups: [
      ['/meta/nutri', 'meta/nutri', 'plano alimentar', 'check-in nutricional', 'wizard nutricional'],
      ['/meta', 'paciente', 'nutricionista'],
    ],
    heuristicWeights: [1.25, 0.45],
  },
  {
    id: 'home_login_persona',
    profile: 'paciente',
    surface: '/',
    objective: 'entrar na área correta após escolher persona',
    title: 'Home — login Google e redirecionamento por persona',
    instructions: [
      'Home escolhe persona (Paciente / Médico / Nutricionista / Personal).',
      'Login Google.',
      'Redirecionamento típico: paciente → /meta; médico → /metaadmin; nutri → /metanutri; personal → /metapersonal.',
    ].join('\n'),
    keywords: ['login', 'google', 'home', 'persona', 'redirecionamento'],
    examples: ['como entro como médico?', 'para onde vou depois do login?'],
    steps: [
      'Na home, escolha sua persona (Paciente, Médico, Nutricionista ou Personal).',
      'Faça login com Google.',
      'Aguarde o redirecionamento: típico paciente → /meta; médico → /metaadmin; nutricionista → /metanutri; personal → /metapersonal.',
    ],
    fallbackLeadIn: 'fazer login e ir para a área correta da plataforma',
    heuristicKeywordGroups: [
      ['login google', 'entrar na plataforma', 'fazer login', 'home', 'persona', 'redirecionamento'],
      ['/meta', 'metaadmin', 'metanutri', 'metapersonal', 'google'],
    ],
    heuristicWeights: [1.0, 0.35],
  },
];

export function getFlowDefinitionById(id: string): OperationalFlowDefinition | undefined {
  return OPERATIONAL_FLOW_DEFINITIONS.find((f) => f.id === id);
}
