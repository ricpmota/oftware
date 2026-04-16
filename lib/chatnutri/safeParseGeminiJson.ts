/**
 * Parser robusto do JSON retornado pelo Gemini
 * Suporta: JSON puro, ```json fences, texto extra
 */

export interface VisionParseResult {
  items: Array<{
    name: string;
    portionDescription: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

const FALLBACK: VisionParseResult = {
  items: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  confidence: 'low',
  notes: 'Falha ao interpretar resposta do modelo',
};

export function safeParseGeminiJson(text: string): VisionParseResult {
  if (!text || typeof text !== 'string') return FALLBACK;

  const trimmed = text.trim();
  if (!trimmed) return FALLBACK;

  try {
    const parsed = JSON.parse(trimmed) as Partial<VisionParseResult>;
    return validateAndNormalize(parsed);
  } catch {
    // tentar remover ```json fences
    let cleaned = trimmed;
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    try {
      const parsed = JSON.parse(cleaned) as Partial<VisionParseResult>;
      return validateAndNormalize(parsed);
    } catch {
      // extrair maior substring entre { ... }
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as Partial<VisionParseResult>;
          return validateAndNormalize(parsed);
        } catch {
          // fallback
        }
      }
    }
  }
  return FALLBACK;
}

function validateAndNormalize(raw: Partial<VisionParseResult>): VisionParseResult {
  const items = Array.isArray(raw.items)
    ? raw.items.map((it) => ({
        name: String(it?.name ?? ''),
        portionDescription: String(it?.portionDescription ?? ''),
        calories: Number(it?.calories) || 0,
        protein: Number(it?.protein) || 0,
        carbs: Number(it?.carbs) || 0,
        fat: Number(it?.fat) || 0,
      }))
    : [];

  const totalsRaw = raw?.totals && typeof raw.totals === 'object' ? raw.totals : {};
  const totals = {
    calories: Number(totalsRaw.calories) || 0,
    protein: Number(totalsRaw.protein) || 0,
    carbs: Number(totalsRaw.carbs) || 0,
    fat: Number(totalsRaw.fat) || 0,
  };

  const conf = String(raw?.confidence ?? 'low').toLowerCase();
  const confidence: 'low' | 'medium' | 'high' =
    conf === 'medium' || conf === 'high' ? conf : 'low';

  return {
    items,
    totals,
    confidence,
    notes: String(raw?.notes ?? ''),
  };
}
