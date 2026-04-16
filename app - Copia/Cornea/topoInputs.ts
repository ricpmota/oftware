// Arquivo 3: topoInputs.ts
// Definições de tipos para entradas de TOPOGRAFIA/TOMOGRAFIA (OD/OE)
// ==========================

export type FerraraPattern = "nipple" | "oval" | "astigmatic" | "indefinido";

export interface TopographyInput {
  eye: "OD" | "OE";
  
  // Dados principais
  KmaxD?: number | null; // curvatura máxima (D)
  KsD?: number | null; // curvatura mais íngreme (D)
  KfD?: number | null; // curvatura mais plana (D)
  KcentralD?: number | null; // curvatura central (D)
  
  // Paquimetria
  pachyMinUm?: number | null; // paquimetria mínima (µm)
  apexLocation?: string | null; // localização do ápice
  
  // Elevações
  anteriorElevUm?: number | null; // elevação anterior (µm)
  posteriorElevUm?: number | null; // elevação posterior (µm)
  
  // Índices de suspeição
  ISvalue?: number | null; // índice de suspeição
  SRAXdeg?: number | null; // ângulo do eixo mais íngreme (graus)
  roushDeltaPachyUm?: number | null; // diferença de paquimetria (Roush)
  
  // Padrões
  ferraraPattern?: FerraraPattern; // padrão de Ferrara
  epithelialPattern?: "warpage-espessamento-central" | "cone-afinamento-apical" | "normal" | null;
  
  // Metadados
  equipment?: string | null; // equipamento utilizado
  notes?: string | null; // observações adicionais
  examDate?: string | null; // data do exame
  operator?: string | null; // operador
} 