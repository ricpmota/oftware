export type CardapioPdfItemRow = {
  descricao: string;
  proteinaG: number;
  kcal: number;
};

export type CardapioPdfRefeicao = {
  nomeRefeicao: string;
  tituloOpcao: string;
  itens: CardapioPdfItemRow[];
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
  refeicoes: CardapioPdfRefeicao[];
  resumoDia: CardapioPdfResumoLinha[];
  totais: { protAtual: number; protPrev: number; kcalAtual: number; kcalPrev: number };
};
