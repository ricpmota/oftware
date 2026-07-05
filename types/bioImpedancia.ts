/**
 * Tipos para dados de Bio Impedância (padrão InBody + campos estendidos opcionais)
 * Preenchidos pelo Nutricionista em /metanutri, exibidos ao Paciente em /meta
 */

/** Massa magra segmentar: kg e percentual por segmento */
export interface SegmentoBioImpedancia {
  kg: number;
  percentual: number;
}

/** Análise de Massa Magra Segmentar - braços, tronco, pernas */
export interface MassaMagraSegmentar {
  arm_r: SegmentoBioImpedancia;
  arm_l: SegmentoBioImpedancia;
  trunk: SegmentoBioImpedancia;
  leg_r: SegmentoBioImpedancia;
  leg_l: SegmentoBioImpedancia;
}

/** Gordura Segmentar - mesma estrutura dos segmentos */
export type GorduraSegmentar = MassaMagraSegmentar;

/** Análise de Composição Corporal - soma deve = peso do paciente */
export interface ComposicaoCorporal {
  aguaTotalLitros: number;
  proteinasKg: number;
  mineraisKg: number;
  massaGorduraKg: number;
}

/** Análise Músculo-Gordura */
export interface AnaliseMusculoGordura {
  massaMuscularKg: number;
  massaGorduraKg: number;
}

/** Análise de Obesidade */
export interface AnaliseObesidade {
  percentualGordura: number; // PGC - Percentual de Gordura Corporal
}

export type BioOrigemExame =
  | 'inbody'
  | 'generica'
  | 'tanita'
  | 'omron'
  | 'xiaomi'
  | 'renpho'
  | 'seca'
  | 'outro';

export const BIO_ORIGEM_LABELS: Record<BioOrigemExame, string> = {
  inbody: 'InBody',
  generica: 'Genérica',
  tanita: 'Tanita',
  omron: 'Omron',
  xiaomi: 'Xiaomi',
  renpho: 'Renpho',
  seca: 'seca',
  outro: 'Outro',
};

/**
 * Campos estendidos opcionais — compatíveis com laudos variados (InBody, Tanita, genéricos).
 * Não substituem os campos legados aninhados; getBioMainMetrics unifica na leitura.
 */
export interface BioImpedanciaCamposEstendidos {
  origemExame?: BioOrigemExame;
  imc?: number;
  percentualGordura?: number;
  massaGorduraKg?: number;
  massaMuscularKg?: number;
  massaMuscularEsqueleticaKg?: number;
  gorduraVisceral?: number;
  aguaPercentual?: number;
  aguaKg?: number;
  metabolismoBasalKcal?: number;
  massaOsseaKg?: number;
  circunferenciaAbdominalCm?: number;
  proteinaPercentual?: number;
  idadeCorporal?: number;
  alturaCm?: number;
  /** Avisos da última extração IA — não persistir no Firestore */
  avisosIA?: string[];
}

/** Um registro completo de Bio Impedância */
export interface BioImpedanciaRegistro extends BioImpedanciaCamposEstendidos {
  /** Identificador estável para CRUD (gerado automaticamente se ausente) */
  id?: string;
  dataRegistro: Date;
  peso: number;

  composicaoCorporal: ComposicaoCorporal;
  analiseMusculoGordura: AnaliseMusculoGordura;
  analiseObesidade: AnaliseObesidade;
  massaMagraSegmentar: MassaMagraSegmentar;
  gorduraSegmentar?: GorduraSegmentar; // opcional para compatibilidade com registros antigos
}
