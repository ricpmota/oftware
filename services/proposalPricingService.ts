/**
 * Serviço para configuração de valores da proposta por médico (doctorId = Firebase Auth UID).
 * Persiste em Firestore: doctors/{doctorId}/proposalPricing/current
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProposalPricingRow, ProposalPricingDoc } from '@/types/proposalPricing';

const APPLICATIONS_PER_MONTH = 4;

/** Valores padrão (PDF): dose semanal → valor em reais */
const DEFAULT_PRICES_CENTS: Record<number, number> = {
  2.5: 80000,   // R$ 800,00
  5: 150000,    // R$ 1.500,00
  7.5: 210000,  // R$ 2.100,00
  10: 260000,   // R$ 2.600,00
  12.5: 300000, // R$ 3.000,00
  15: 340000,   // R$ 3.400,00
};

const FIXED_WEEKLY_DOSES = [2.5, 5, 7.5, 10, 12.5, 15] as const;

function buildRow(weeklyDoseMg: number, priceCents: number): ProposalPricingRow {
  return {
    weeklyDoseMg,
    monthlyTotalMg: weeklyDoseMg * APPLICATIONS_PER_MONTH,
    priceCents,
  };
}

export const ProposalPricingService = {
  /**
   * Retorna as linhas padrão (para “Restaurar padrão” e fallback).
   */
  getDefaultRows(): ProposalPricingRow[] {
    return FIXED_WEEKLY_DOSES.map((dose) =>
      buildRow(dose, DEFAULT_PRICES_CENTS[dose] ?? 0)
    );
  },

  /**
   * Carrega a configuração salva do médico. Se não existir, retorna null (use getDefaultRows() para fallback).
   */
  async get(doctorId: string): Promise<ProposalPricingDoc | null> {
    const ref = doc(db, 'doctors', doctorId, 'proposalPricing', 'current');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      updatedAt: data.updatedAt,
      currency: data.currency ?? 'BRL',
      applicationsPerMonth: data.applicationsPerMonth ?? APPLICATIONS_PER_MONTH,
      rows: Array.isArray(data.rows) ? data.rows : [],
    } as ProposalPricingDoc;
  },

  /**
   * Salva a configuração do médico. rows deve ter as 6 linhas fixas (weeklyDoseMg 2.5 … 15).
   */
  async save(doctorId: string, rows: ProposalPricingRow[]): Promise<void> {
    const ref = doc(db, 'doctors', doctorId, 'proposalPricing', 'current');
    const payload: Omit<ProposalPricingDoc, 'updatedAt'> & { updatedAt: ReturnType<typeof Timestamp.now> } = {
      updatedAt: Timestamp.now(),
      currency: 'BRL',
      applicationsPerMonth: APPLICATIONS_PER_MONTH,
      rows,
    };
    await setDoc(ref, payload);
  },

  /**
   * Restaurar padrão = salvar getDefaultRows().
   */
  async resetToDefault(doctorId: string): Promise<void> {
    await this.save(doctorId, this.getDefaultRows());
  },
};
