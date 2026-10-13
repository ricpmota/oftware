import { callLLM } from '@/lib/ia/callLLM';
import {
  parseTraducaoPrescricaoIngles,
  prescricaoTemTextoParaTraduzir,
  validarEntradaTraducaoPrescricao,
  type PrescricaoTextoTraduzivel,
} from '@/lib/prescricao/traduzirPrescricaoIngles';

const SYSTEM_PROMPT = `You translate Brazilian medical prescriptions from Portuguese into clinical English.
Return ONLY a JSON object with this exact shape:
{"nome":"","descricao":"","observacoes":"","itens":[{"medicamento":"","dosagem":"","frequencia":"","instrucoes":"","quantidade":""}]}

Rules:
- Keep the same number of items, in the same order.
- Do not add, remove, merge, or invent medications, doses, frequencies, or instructions.
- Keep brand names, international drug names, numbers, and units (mg, mL, IU, g, mcg) unchanged.
- Translate instructions, frequency wording, observations, and descriptive text into clear English.
- Preserve line breaks inside descricao and observacoes.
- If a field is empty, return it as an empty string.
- Do not include markdown, comments, or any text outside the JSON object.`;

export async function traduzirPrescricaoParaIngles(
  source: PrescricaoTextoTraduzivel
): Promise<PrescricaoTextoTraduzivel> {
  validarEntradaTraducaoPrescricao(source);
  if (!prescricaoTemTextoParaTraduzir(source)) return source;

  const payload = {
    nome: source.nome,
    descricao: source.descricao,
    observacoes: source.observacoes,
    itens: source.itens.map((item) => ({
      medicamento: item.medicamento || '',
      dosagem: item.dosagem || '',
      frequencia: item.frequencia || '',
      instrucoes: item.instrucoes || '',
      quantidade: item.quantidade || '',
    })),
  };

  const raw = await callLLM(SYSTEM_PROMPT, [{ role: 'user', content: JSON.stringify(payload) }], {
    maxTokens: 8192,
    temperature: 0.1,
  });

  return parseTraducaoPrescricaoIngles(raw, payload);
}
