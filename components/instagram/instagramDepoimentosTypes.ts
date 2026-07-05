/** Alinhado a `app/api/depoimentos-medico/route.ts`. */
export type InstagramDepoimentoItem = {
  instanceKey: string;
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
  estrelas: number;
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
  comprimentoAbdominalInicialCm: number | null;
  comprimentoAbdominalAtualCm: number | null;
  perdaAbdominalCm: number | null;
  perdaPercentualAbdominal: number | null;
  evolucao: { weekIndex: number; peso: number; doseMg: number; circunferenciaAbdominal?: number | null }[];
};
