import type { OrigemCadastroAlimentoGlobal, StatusAlimentoGlobal } from './constants';
import type { SegmentoAlimento } from './segmentos';

/**
 * Entidade canônica da Base Global de Alimentos (Patrimônio Global).
 * Independente de AlimentoNutricionista / ItemPlanoRefeicao / ItemRefeicao.
 * NÃO usa o campo `categoria` (reservado ao papel no cardápio MetaNutri).
 */
export interface PorcaoAlimentoGlobal {
  id: string;
  nome: string;
  quantidadeG: number;
  origem?: 'source' | 'manual';
}

export interface NutrienteExtraAlimento {
  id?: string;
  codigo?: string | null;
  nome: string;
  valor: number | null;
  unidade: string;
  valorOriginal?: string | null;
}

export interface FonteAlimentoGlobal {
  nome?: string | null;
  documento?: string | null;
  versao?: string | null;
  ano?: number | null;
  codigoOriginal?: string | null;
  pagina?: number | null;
  tabela?: string | null;
  licenca?: string | null;
  usoPermitido?: string | null;
  /** Proveniência de importação PDF (ETAPA 04). */
  importId?: string | null;
  itemImportId?: string | null;
  modeloGemini?: string | null;
  promptVersion?: string | null;
  valoresOriginais?: Record<string, string | null> | null;
  registradoEm?: string | null;
}

export interface AlimentoGlobal {
  id: string;

  nome: string;
  nomeNormalizado: string;

  descricao?: string | null;
  nomeCientifico?: string | null;
  marca?: string | null;

  /** Segmento nutricional (conceito A). Nunca confundir com papel no cardápio. */
  segmento: SegmentoAlimento;

  estado?: string | null;
  processamento?: string | null;
  preparo?: string | null;

  baseQuantidade: number;
  baseUnidade: 'g';

  energiaKcal?: number | null;
  energiaKj?: number | null;

  proteinasG?: number | null;
  carboidratosG?: number | null;
  gordurasTotaisG?: number | null;
  fibrasG?: number | null;

  glicoseG?: number | null;
  frutoseG?: number | null;
  lactoseG?: number | null;
  sacaroseG?: number | null;
  acucaresTotaisG?: number | null;

  amidoTotalG?: number | null;
  amidoDisponivelG?: number | null;
  amidoResistenteG?: number | null;

  gordurasSaturadasG?: number | null;
  gordurasMonoinsaturadasG?: number | null;
  gordurasPoliinsaturadasG?: number | null;
  gordurasTransG?: number | null;

  calcioMg?: number | null;
  ferroMg?: number | null;
  magnesioMg?: number | null;
  fosforoMg?: number | null;
  potassioMg?: number | null;
  sodioMg?: number | null;
  zincoMg?: number | null;

  vitaminaAMcg?: number | null;
  vitaminaCMg?: number | null;
  vitaminaDMcg?: number | null;
  vitaminaEMg?: number | null;
  vitaminaB1Mg?: number | null;
  vitaminaB2Mg?: number | null;
  vitaminaB3Mg?: number | null;
  vitaminaB6Mg?: number | null;
  vitaminaB12Mcg?: number | null;
  folatoMcg?: number | null;

  porcoes?: PorcaoAlimentoGlobal[];

  nutrientesExtras?: NutrienteExtraAlimento[];

  /**
   * Fonte principal (compat ETAPA 02).
   * Preferir `fontes` para histórico completo.
   */
  fonte?: FonteAlimentoGlobal | null;
  /** Histórico de fontes (PDF/manual). Loader aceita só `fonte` antigo. */
  fontes?: FonteAlimentoGlobal[];

  /** Prep. ETAPA 03 — manual hoje; pdf_import no futuro. */
  origemCadastro?: OrigemCadastroAlimentoGlobal;

  observacoes?: string | null;

  status: StatusAlimentoGlobal;

  criadoEm: Date;
  atualizadoEm: Date;
  criadoPorUid?: string | null;
  atualizadoPorUid?: string | null;
}

/** Alias inglês opcional (mesma entidade). */
export type GlobalFood = AlimentoGlobal;

export type AlimentoGlobalCreateInput = Omit<
  AlimentoGlobal,
  'id' | 'nomeNormalizado' | 'criadoEm' | 'atualizadoEm' | 'criadoPorUid' | 'atualizadoPorUid'
> & {
  id?: string;
  nomeNormalizado?: string;
};

export type AlimentoGlobalUpdateInput = Partial<
  Omit<AlimentoGlobal, 'id' | 'criadoEm' | 'criadoPorUid' | 'nomeNormalizado'>
> & {
  nome?: string;
};

export type AlimentoGlobalListFilters = {
  q?: string;
  segmento?: SegmentoAlimento | 'todos';
  status?: StatusAlimentoGlobal | 'todos';
};
