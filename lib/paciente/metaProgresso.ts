import type { PacienteCompleto } from '@/types/obesidade';
import { progressoAplicacoesProtocoloAtivo } from '@/utils/tirzepatidaProtocoloDisplay';

/** Perda realizada (kg/cm): delta atual−baseline; valores negativos = redução. */
export function calcMetaProgressPct(
  perdaDelta: number | null | undefined,
  metaLossAbsoluta: number | null | undefined
): number | null {
  if (metaLossAbsoluta == null || !(metaLossAbsoluta > 0) || perdaDelta == null) return null;
  const achieved = Math.max(0, -perdaDelta);
  return Math.min(100, Math.round((achieved / metaLossAbsoluta) * 100));
}

/** Meta de perda de peso em kg (absoluto), a partir do plano terapêutico. */
export function resolveMetaPesoKgLoss(
  paciente: PacienteCompleto | null | undefined,
  baselineWeightKg: number
): number | null {
  const metas = paciente?.planoTerapeutico?.metas;
  if (!metas) return null;
  const val = metas.weightLossTargetValue;
  if (val == null || !(val > 0)) {
    if (metas.targetWeightKg != null && baselineWeightKg > 0 && metas.targetWeightKg < baselineWeightKg) {
      return baselineWeightKg - metas.targetWeightKg;
    }
    return null;
  }
  if (metas.weightLossTargetType === 'PESO_ABSOLUTO') return val;
  // PERCENTUAL (padrão)
  if (!(baselineWeightKg > 0)) return null;
  return (baselineWeightKg * val) / 100;
}

/** Meta de redução de circunferência abdominal em cm. */
export function resolveMetaAbdominalCmLoss(
  paciente: PacienteCompleto | null | undefined
): number | null {
  const cm = paciente?.planoTerapeutico?.metas?.waistReductionTargetCm;
  if (cm == null || !(cm > 0)) return null;
  return cm;
}

/**
 * Contagem do protocolo vigente (não soma ciclos anteriores).
 * `feitas` = doses registradas. `posicao` = semana em que o paciente está,
 * contando as que já passaram mesmo sem registro.
 */
export function countAplicacoesProgress(paciente: PacienteCompleto | null | undefined): {
  feitas: number;
  posicao: number;
  total: number;
  segmentos: ReturnType<typeof progressoAplicacoesProtocoloAtivo>['segmentos'];
} {
  const p = progressoAplicacoesProtocoloAtivo(paciente);
  return { feitas: p.aplicadas, posicao: p.posicao, total: p.total, segmentos: p.segmentos };
}
