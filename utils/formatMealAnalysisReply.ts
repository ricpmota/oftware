import type { VisionParseResult } from '@/lib/chatnutri/safeParseGeminiJson';

function round1(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return (Math.round(x * 10) / 10).toString();
}

/**
 * Texto exibido após análise da foto (ChatNutri).
 * Formato curto; **negrito** compatível com `renderInlineBold`.
 */
export function formatMealAnalysisReply(
  result: VisionParseResult,
  mealLabel: string,
  opts?: { avulsaNoChat?: boolean }
): string {
  const { totals, notes } = result;
  const proteinG = Number(totals.protein) || 0;
  const carbsG = Number(totals.carbs) || 0;
  const fatG = Number(totals.fat) || 0;
  const carbKcal = Math.round(carbsG * 4);
  const kcal = Math.round(Number(totals.calories) || 0);
  const sumGrams = round1(proteinG + carbsG + fatG);

  const lines: string[] = [];

  if (opts?.avulsaNoChat) {
    lines.push('_Somente neste chat — não salvo no histórico do paciente._');
    lines.push('');
  }

  lines.push(`**${mealLabel}**`);
  lines.push('');
  lines.push(`- Proteína: **${round1(proteinG)} g**`);
  lines.push(`- Carboidrato: **${carbKcal} kcal**`);
  lines.push(`- Gordura: **${round1(fatG)} g**`);
  lines.push(`- Total prato: **${sumGrams} g** + **${kcal} kcal**`);

  const obs = (notes || '').trim();
  if (obs) {
    lines.push('');
    lines.push(`_Obs.: ${obs}_`);
  }

  lines.push('');
  lines.push('_Estimativa pela imagem; não substitui orientação individual._');

  return lines.join('\n');
}
