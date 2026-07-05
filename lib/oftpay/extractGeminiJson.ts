/**
 * Extração robusta de JSON a partir de respostas Gemini (Vertex).
 */

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Extrai objetos completos de um array "topics" mesmo quando o JSON foi truncado. */
function extractPartialObjectsFromTopicsArray(text: string): unknown[] {
  const keyIdx = text.search(/"topics"\s*:\s*\[/i);
  if (keyIdx < 0) return [];

  const arrStart = text.indexOf('[', keyIdx);
  if (arrStart < 0) return [];

  const items: unknown[] = [];
  let i = arrStart + 1;

  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (i >= text.length || text[i] === ']') break;
    if (text[i] !== '{') {
      i++;
      continue;
    }

    const objStart = i;
    let depth = 0;
    let inString = false;
    let escape = false;

    for (; i < text.length; i++) {
      const c = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\' && inString) {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const parsed = tryParseJson(text.slice(objStart, i + 1));
          if (parsed != null) items.push(parsed);
          i++;
          break;
        }
      }
    }

    if (depth > 0) break;
  }

  return items;
}

/** Fecha colchetes/chaves abertos em JSON truncado (MAX_TOKENS). */
function repairTruncatedJson(text: string): string {
  let s = text.trim();
  if (!s) return s;

  const openBraces = (s.match(/\{/g) ?? []).length;
  const closeBraces = (s.match(/\}/g) ?? []).length;
  const openBrackets = (s.match(/\[/g) ?? []).length;
  const closeBrackets = (s.match(/\]/g) ?? []).length;

  if (openBrackets > closeBrackets) {
    s += ']'.repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    s += '}'.repeat(openBraces - closeBraces);
  }
  return s;
}

export function extractJsonFromGeminiText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const direct = tryParseJson(trimmed);
  if (direct != null) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inner = fenced[1].trim();
    const parsed = tryParseJson(inner);
    if (parsed != null) return parsed;
    const repaired = tryParseJson(repairTruncatedJson(inner));
    if (repaired != null) return repaired;
  }

  const startObj = trimmed.indexOf('{');
  const startArr = trimmed.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = startObj >= 0 ? startObj : startArr;

  if (start >= 0) {
    const slice = trimmed.slice(start);
    const endObj = slice.lastIndexOf('}');
    const endArr = slice.lastIndexOf(']');
    const end = Math.max(endObj, endArr);
    if (end > 0) {
      const parsed = tryParseJson(slice.slice(0, end + 1));
      if (parsed != null) return parsed;
    }
    const repaired = tryParseJson(repairTruncatedJson(slice));
    if (repaired != null) return repaired;
  }

  const partialTopics = extractPartialObjectsFromTopicsArray(trimmed);
  if (partialTopics.length > 0) return { topics: partialTopics };

  return null;
}

export function getGeminiAnswerText(geminiData: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}): { text: string; finishReason?: string } {
  let text = '';
  let finishReason: string | undefined;
  const candidate = geminiData.candidates?.[0];
  if (candidate) {
    finishReason = candidate.finishReason;
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === 'string') text += part.text;
    }
  }
  return { text: text.trim(), finishReason };
}
