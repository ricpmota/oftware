import { callLLM } from '@/lib/ia/callLLM';
import {
  parseTraducaoSolicitacaoExames,
  validarEntradaTraducaoSolicitacaoExames,
  type SolicitacaoExamesTextoTraduzivel,
} from '@/lib/solicitacaoExames/traduzirSolicitacaoExames';

const SYSTEM_PROMPT = `You translate Brazilian medical exam requests from Portuguese into clinical English.
Return ONLY a JSON object with this exact shape:
{"exames":[""],"hipoteseDiagnostica":""}

Rules:
- Keep the same number of exams, in the same order.
- Do not add, remove, merge, or invent tests.
- Use standard English test names (for example, "Hemograma Completo" -> "Complete blood count").
- Translate the diagnostic hypothesis into clear clinical English.
- If hipoteseDiagnostica is empty, return an empty string.
- Do not include markdown, comments, or any text outside the JSON object.`;

export async function traduzirSolicitacaoExamesParaIngles(
  source: SolicitacaoExamesTextoTraduzivel
): Promise<SolicitacaoExamesTextoTraduzivel> {
  validarEntradaTraducaoSolicitacaoExames(source);
  const temTexto = source.exames.some((exame) => exame.trim()) || source.hipoteseDiagnostica.trim();
  if (!temTexto) return source;

  const raw = await callLLM(
    SYSTEM_PROMPT,
    [{ role: 'user', content: JSON.stringify(source) }],
    { maxTokens: 8192, temperature: 0.1 }
  );
  return parseTraducaoSolicitacaoExames(raw, source);
}
