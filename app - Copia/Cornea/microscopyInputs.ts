// Arquivo 1: microscopyInputs.ts
// Definições de tipos para entradas de MICROSCOPIA ESPECULAR (OD/OE)
// ==========================

export interface MicroscopyInput {
  eye: "OD" | "OE";
  
  // Dados principais
  endothelialDensity?: number | null; // células/mm²
  coefVariationPct?: number | null; // CV% (polimegatismo)
  hexagonalityPct?: number | null; // % de células hexagonais (pleomorfismo)
  
  // Achados morfológicos
  guttata?: boolean; // presença de guttata
  beatenMetalAspect?: boolean; // aspecto metal-batido
  
  // Dados adicionais
  centralCCTum?: number | null; // paquimetria central simulada (µm)
  qualityScore?: number | null; // qualidade da imagem (1-5)
  sampledCellsCount?: number | null; // número de células amostradas
  
  // Metadados
  examDate?: string | undefined; // data do exame
  device?: string | undefined; // dispositivo utilizado
  operator?: string | undefined; // operador
}

// Valores padrão para testes
export const DEFAULT_MICROSCOPY_INPUT: MicroscopyInput = {
  eye: "OD",
  endothelialDensity: 2500,
  coefVariationPct: 25,
  hexagonalityPct: 65,
  guttata: false,
  beatenMetalAspect: false,
  centralCCTum: 540,
  qualityScore: 4,
  sampledCellsCount: 100,
  examDate: new Date().toISOString().split('T')[0],
  device: "Microscópio Especular",
  operator: "Dr. Oftalmologista"
}; 