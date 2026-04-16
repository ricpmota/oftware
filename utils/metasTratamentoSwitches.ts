import type { PlanoTerapeutico } from '@/types/obesidade';

type Metas = PlanoTerapeutico['metas'];

/** Switch peso: explícito no Firestore ou legado (há meta numérica). */
export function resolveMetaPerdaPesoAtiva(metas: Metas | undefined): boolean {
  if (metas?.metaPerdaPesoAtiva === false) return false;
  if (metas?.metaPerdaPesoAtiva === true) return true;
  const v = metas?.weightLossTargetValue;
  return v != null && v > 0;
}

/**
 * Switch cintura: só faz sentido com circunferência inicial.
 * Explícito no Firestore ou legado (há cm de redução).
 */
export function resolveMetaReducaoCinturaAtiva(
  metas: Metas | undefined,
  temCircunferenciaInicial: boolean
): boolean {
  if (!temCircunferenciaInicial) return false;
  if (metas?.metaReducaoCinturaAtiva === false) return false;
  if (metas?.metaReducaoCinturaAtiva === true) return true;
  const w = metas?.waistReductionTargetCm;
  return typeof w === 'number' && !Number.isNaN(w) && w > 0;
}

export function resolveMetasTratamentoModuloResumo(
  metas: Metas | undefined,
  temCircunferenciaInicial: boolean
): boolean {
  return (
    !!metas?.metasTratamentoModuloAtivo ||
    resolveMetaPerdaPesoAtiva(metas) ||
    resolveMetaReducaoCinturaAtiva(metas, temCircunferenciaInicial)
  );
}
