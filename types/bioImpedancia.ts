/**
 * Tipos para dados de Bio Impedância (padrão InBody)
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
  percentualGordura: number;  // PGC - Percentual de Gordura Corporal
}

/** Um registro completo de Bio Impedância */
export interface BioImpedanciaRegistro {
  dataRegistro: Date;
  peso: number;

  composicaoCorporal: ComposicaoCorporal;
  analiseMusculoGordura: AnaliseMusculoGordura;
  analiseObesidade: AnaliseObesidade;
  massaMagraSegmentar: MassaMagraSegmentar;
  gorduraSegmentar?: GorduraSegmentar;  // opcional para compatibilidade com registros antigos
}
