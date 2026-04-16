// Tipos para o relatório agregado de resultados Tirzepatida (MetaAdminGeral)

export interface RelatorioTirzepatidaRequest {
  dateStart: string; // YYYY-MM-DD
  dateEnd: string;   // YYYY-MM-DD
  minWeeks: number;  // 1 | 4 | 8 | 12
  onlyActive: boolean;
}

export interface RelatorioTirzepatidaResponse {
  periodo: {
    dateStart: string;
    dateEnd: string;
    label: string;
  };
  amostra: {
    totalPacientes: number;
    tempoMedianoSemanas: number;
    aplicacoesMediasPorPaciente: number;
  };
  resultado: {
    medianaPerdaPesoPercent: number;
    pctAtingiu5: number;
    pctAtingiu10: number;
  };
  marcos: {
    perda4SemPercent: number | null;
    perda8SemPercent: number | null;
    perda12SemPercent: number | null;
  };
  aderencia: {
    pctContinuidade8Sem: number;
    pctContinuidade12Sem: number;
  };
  disclaimer: string[];
  metadata: {
    minWeeks: number;
    onlyActive: boolean;
    generatedAt: string; // ISO
  };
}
