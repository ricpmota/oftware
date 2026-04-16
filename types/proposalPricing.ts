/**
 * Tipos para configuração de valores da proposta (por médico)
 */

export interface ProposalPricingRow {
  weeklyDoseMg: number;
  monthlyTotalMg: number;
  priceCents: number;
}

export interface ProposalPricingDoc {
  updatedAt: { seconds: number; nanoseconds: number } | unknown;
  currency: string;
  applicationsPerMonth: number;
  rows: ProposalPricingRow[];
}
