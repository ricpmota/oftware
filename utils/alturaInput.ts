/**
 * Normaliza altura digitada pelo usuário para centímetros.
 * Pacientes frequentemente digitam altura em metros (ex: 1.65) quando o campo
 * pede centímetros (ex: 165). Isso causa cálculo incorreto do IMC.
 *
 * - Se valor < 3 (ex: 1.65, 1.70) → interpreta como metros → converte para cm
 * - Se valor >= 3 (ex: 165, 170) → interpreta como centímetros
 *
 * @param valorRaw Valor bruto do input (string ou number)
 * @returns Altura em centímetros ou null se inválido
 */
export function alturaInputParaCm(valorRaw: number | string): number | null {
  const v = typeof valorRaw === 'string' ? parseFloat(String(valorRaw).replace(',', '.')) : valorRaw;
  if (isNaN(v) || v <= 0) return null;
  if (v < 3) return Math.round(v * 100); // metros → cm
  return Math.round(v); // já em cm
}
