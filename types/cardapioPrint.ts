export type CardapioPdfItemRow = {
  descricao: string;
  proteinaG: number;
  /** undefined = desconhecido */
  carboidratoG?: number;
  kcal: number;
};

export type CardapioPdfMealImageRef = {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  sourceHash: string;
  gcsPath?: string;
  generatedAt?: string;
};

export type CardapioPdfOpcao = {
  tituloOpcao: string;
  itens: CardapioPdfItemRow[];
  /** Observação do nutricionista — abaixo dos itens da opção. */
  observacao?: string;
  /** Signed URL resolvida na abertura da impressão. */
  imageUrl?: string;
  /** Dados para buscar a foto do prato (sem URL persistida). */
  mealImageRef?: CardapioPdfMealImageRef;
};

export type CardapioPdfRefeicao = {
  nomeRefeicao: string;
  /** @deprecated Use `opcoes[0]` — mantido para leitores antigos. */
  tituloOpcao: string;
  itens: CardapioPdfItemRow[];
  observacao?: string;
  /** Todas as opções preenchidas salvas pelo nutricionista (sem repetir catálogo). */
  opcoes: CardapioPdfOpcao[];
};

export type CardapioPdfResumoLinha = {
  nome: string;
  protAtual: number;
  protPrev: number;
  kcalAtual: number;
  kcalPrev: number;
};

export type CardapioPdfContext = {
  pacienteNome: string;
  pacienteCpf?: string;
  dataImpressao: string;
  medicoNome?: string;
  nutricionistaNome?: string;
  nutricionistaCrn?: string;
  refeicoes: CardapioPdfRefeicao[];
  resumoDia: CardapioPdfResumoLinha[];
  totais: { protAtual: number; protPrev: number; kcalAtual: number; kcalPrev: number };
};
