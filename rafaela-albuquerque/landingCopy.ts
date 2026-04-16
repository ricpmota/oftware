/** Ano em que a Dra. Rafaela iniciou na advocacia — usado para calcular anos de experiência no ano civil corrente. */
export const ADVOCACIA_ANO_INICIO = 2011;

/** Anos de experiência = ano atual − ano de início (atualiza a cada ano civil). */
export function anosExperienciaAdvocacia(): number {
  return new Date().getFullYear() - ADVOCACIA_ANO_INICIO;
}

/** Indicadores da landing; chame em render (ex.: `getIndicadores()`) para o 1º item refletir o ano civil corrente. */
export function getIndicadores() {
  return {
    eyebrow: 'Indicadores de atuação',
    title: 'Experiência com método',
    items: [
      { target: anosExperienciaAdvocacia(), suffix: '+' as const, label: 'anos de experiência na advocacia' },
      { target: 300, suffix: '+' as const, label: 'demandas analisadas' },
      { target: 500, suffix: '+' as const, label: 'atendimentos realizados' },
      { target: 3, suffix: '' as const, label: 'áreas de atuação' },
    ],
  };
}

export const sobreAdvogada = {
  title: 'Sobre a Dra. Rafaela Albuquerque',
  subtitle: 'Advocacia com estratégia, clareza e responsabilidade',
  paragraphs: [
    'A Dra. Rafaela Albuquerque atua nas áreas de Direito Previdenciário, Família e Sucessões, conduzindo cada caso com análise individual e atenção ao que realmente está em jogo para cada cliente.',
    'Sua atuação é marcada por uma abordagem direta e cuidadosa, com comunicação clara e acompanhamento próximo nas etapas mais importantes — permitindo que cada decisão seja tomada com segurança e consciência.',
  ],
  diferenciaisHeading: '🔹 Diferenciais',
  bullets: [
    'Atendimento individualizado',
    'Estratégia alinhada ao seu caso',
    'Comunicação clara, sem juridiquês',
    'Presença técnica nas decisões importantes',
  ],
} as const;

export const hero = {
  title: 'Segurança jurídica no que importa para você',
  subtitle:
    'Condução técnica, linguagem clara e respeito ao seu tempo — com a sobriedade que a complexidade do Direito exige.',
  ctaPrimary: 'Analisar meu caso',
  ctaSecondary: 'Falar com a advogada',
} as const;

/** Conteúdo do bloco “calendário” em Áreas de atuação (mesmo padrão visual da /mentoria, texto jurídico). */
export const areasCalendario = [
  {
    key: 'prev',
    slot: 'Área 01',
    shortLabel: 'Previd.',
    title: 'Direito Previdenciário',
    body:
      'Indeferimentos, revisões e divergências de valor pedem um plano alinhado ao INSS e à lei. A atuação organiza aposentadorias, auxílios, pensões e BPC com leitura técnica e condução ordenada.',
    objetivo:
      'Organizar benefícios e a relação com o INSS com leitura técnica e condução ordenada — do diagnóstico ao encaminhamento proporcional ao caso.',
    detalhes: [
      'Aposentadorias, auxílios e pensões',
      'Revisões, indeferimentos e divergências de valor',
      'BPC e alinhamento à legislação e à jurisprudência',
    ],
  },
  {
    key: 'fam',
    slot: 'Área 02',
    shortLabel: 'Família',
    title: 'Direito de Família',
    body:
      'Guarda, alimentos, convivência e reorganização de vínculos envolvem afeto e patrimônio. O foco é equilibrar direitos, reduzir atrito desnecessário e dar segurança ao que não pode ficar indefinido.',
    objetivo:
      'Equilibrar direitos, afeto e patrimônio com clareza — reduzindo atrito desnecessário e dando segurança ao que não pode ficar indefinido.',
    detalhes: [
      'Guarda, convivência e reorganização de vínculos',
      'Alimentos e mediação de conflitos',
      'Decisões com comunicação clara e perspectiva de prazo',
    ],
  },
  {
    key: 'suc',
    slot: 'Área 03',
    shortLabel: 'Sucess.',
    title: 'Sucessões',
    body:
      'Inventário e sucessão mal estruturados geram litígio e bloqueio de bens. O trabalho é ordenar patrimônio e trâmites — do planejamento à conclusão — com previsibilidade e respeito à família.',
    objetivo:
      'Ordenar patrimônio e trâmites sucessórios com previsibilidade — do planejamento à conclusão, com respeito aos vínculos familiares.',
    detalhes: [
      'Inventário e partilha',
      'Planejamento sucessório e organização documental',
      'Redução de litígio e de bloqueio de bens',
    ],
  },
] as const;

/** Cards simples (legado / outros usos) — derivado de `areasCalendario`. */
export const areas = areasCalendario.map(({ key, title, body }) => ({ key, title, body }));

export const diferenciais = [
  'Cada demanda tem diagnóstico próprio; nada é repetido mecanicamente',
  'Encaminhamento proporcional ao caso — sem medidas supérfluas',
  'Direito explicado de forma clara: cenários, riscos e alternativas',
  'Retorno objetivo sobre prazos, fases e próximos passos',
  'Compromisso com segurança jurídica e previsibilidade nas suas decisões',
] as const;

export const passos = [
  {
    n: 1,
    title: 'Primeiro contato',
    desc: 'Você relata os fatos e envia a documentação inicial. Formalizamos o canal e deixamos claro o que será tratado nesta fase.',
  },
  {
    n: 2,
    title: 'Estudo e estratégia',
    desc: 'O caso é examinado à luz da lei e da jurisprudência. Indicamos a linha de atuação recomendada e os cenários possíveis.',
  },
  {
    n: 3,
    title: 'Condução e retorno',
    desc: 'As medidas são implementadas e você recebe informações objetivas sobre andamentos, prazos e próximas etapas.',
  },
] as const;

export const confianca = {
  title: 'Responsabilidade sobre o que é seu',
  body:
    'Entre advogada e cliente, a lei exige lealdade, dever de informar e leitura alinhada ao interesse legítimo de quem confia nesse trabalho. Com método e retidão técnica, cada demanda é tratada com o rigor que o tema impõe — sem promessa de resultado.',
} as const;

export const ctaFinal = {
  title: 'Quando quiser dar o próximo passo',
  body: 'Se a questão envolve benefício, família ou patrimônio, uma primeira conversa técnica esclarece caminhos e limites da lei.',
  primary: 'Analisar meu caso',
  secondary: 'Falar com a advogada',
} as const;

export const footerNote =
  'Atuação em Direito Previdenciário, de Família e Sucessões. As informações deste site são gerais e educativas; análise vinculante e representação decorrem de consulta e de contrato formal, nos termos da legislação e do Código de Ética da OAB.';
