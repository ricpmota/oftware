/**
 * Extração de resultados laboratoriais a partir de PDF/imagem via Vertex AI (Gemini).
 * Server-only.
 */

import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { normalizarRespostaExameIA, type ExameLaboratorialExtracaoNormalizada } from '@/lib/metaadmin/exameLaboratorialExtracao';

function buildExameLaboratorialPrompt(allowedKeysJson: string): string {
  return `Você é um assistente que extrai APENAS resultados numéricos de exames laboratoriais de um documento brasileiro (laudo, print, PDF).

REGRAS OBRIGATÓRIAS:
0) Preencha camposMapeados com o máximo de exames do documento que tenham chave na lista abaixo — não omita linhas legíveis só para resumir a saída.
1) Use SOMENTE valores que apareçam claramente no documento. NÃO invente, NÃO estime, NÃO complete lacunas.
2) Ignore cabeçalhos, rodapés, logos, endereços, assinaturas, QR codes, textos administrativos e qualquer texto que não seja resultado de exame com valor.
3) **Resultado vs referência:** em tabelas com colunas "Resultado", "Valor", "Paciente" vs "Referência", "VR", "Val. ref.", copie SOMENTE o valor da coluna de **resultado do paciente**. Nunca use números da coluna de referência como se fossem resultado.
4) **Valores não numéricos explícitos:** se o laudo mostrar "<0,5", ">500", "Negativo", "Não reagente" ou texto sem número claro, NÃO converta em número inventado — omita o exame em camposMapeados e, se útil, cite em avisos.
5) **Uma linha = um exame:** não misture valor de um exame com o nome de outro. Se a linha estiver truncada ou ilegível, omita.
6) **Unidades:** preserve o número como no laudo (vírgula decimal é comum no Brasil). Não converta unidades (ex.: não transforme mmol/L em mg/dL); se a unidade não bater com o esperado para a chave, prefira omitir e registrar em avisos.
7) **Ambiguidade entre exames parecidos:** se não der para saber se é, por exemplo, LDL direto vs calculado, ou T4 livre vs total, omita em camposMapeados e coloque o nome da linha em examesNaoMapeados.
8) Cada valor numérico deve estar explicitamente associado a um nome de exame no documento. Se houver dúvida, NÃO inclua em camposMapeados.
9) Você só pode usar chaves em camposMapeados que existam EXATAMENTE na lista JSON abaixo. Nenhuma outra chave.
10) Exames do documento sem chave na lista → examesNaoMapeados (nome como no laudo).
11) dataExame: data de **coleta** ou de **emissão do resultado** se estiver clara, formato YYYY-MM-DD. Se houver várias datas conflitantes ou só data de impressão genérica, use null.
12) avisos: limitações reais (ilegível, cortado, sombra, foto tremida) — sem inventar dados.
13) Leucócitos e plaquetas no app ficam em escala ×10³/µL (ex.: 256 = 256 mil/µL). Se o laudo trouxer contagem absoluta /µL (ex.: 256000), envie o número como no documento; o backend converte para ×10³ quando aplicável.
14) Saída: apenas o JSON acordado (sem markdown).

FORMATO EXATO DO JSON DE SAÍDA:
{
  "dataExame": "YYYY-MM-DD" | null,
  "camposMapeados": { "<chave_da_lista>": número },
  "examesNaoMapeados": ["nome como no documento", ...],
  "avisos": ["...", ...]
}

LISTA EXATA DE CHAVES PERMITIDAS PARA camposMapeados:
${allowedKeysJson}

Exemplos de mapeamento de nomes comuns no Brasil para chaves:
- Glicemia jejum / glicose jejum → glicemiaJejum
- HbA1c / hemoglobina glicada / A1C → hemoglobinaGlicada
- Insulina jejum → insulinaJejum
- Ureia / BUN (se valor for ureia em mg/dL) → ureia
- Creatinina → creatinina
- TFG / TFGe / eGFR → taxaFiltracaoGlomerular
- Sódio / Na → sodio
- Potássio / K → potassio
- TGP / ALT → tgp
- TGO / AST → tgo
- GGT / gama GT → ggt
- Fosfatase alcalina / FA → fosfataseAlcalina
- Colesterol total → colesterolTotal
- HDL / HDL-c → hdl
- LDL / LDL-c → ldl
- Triglicerídeos / TG → triglicerides
- TSH → tsh
- T4 livre / T4L → t4Livre
- Calcitonina → calcitonina
- Hemoglobina / Hb → hemoglobina
- Leucócitos / GB → leucocitos
- Plaquetas → plaquetas
- Ferritina → ferritina
- Ferro sérico → ferroSerico
- B12 / vitamina B12 → vitaminaB12
- Vitamina D / 25-OH → vitaminaD
- Albumina → albumina
(Use outras chaves da lista quando o nome do exame corresponder claramente.)

Se o documento não contiver nenhum resultado laboratorial claro, retorne camposMapeados como {} e examesNaoMapeados [].`;
}

/** Schema alinhado ao JSON esperado; restringe chaves de camposMapeados ao conjunto do sistema. */
function buildExameLabResponseSchema(): Record<string, unknown> {
  const camposProps: Record<string, { type: string }> = {};
  for (const k of EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS) {
    camposProps[k] = { type: 'NUMBER' };
  }
  return {
    type: 'OBJECT',
    properties: {
      dataExame: { type: 'STRING', nullable: true },
      camposMapeados: {
        type: 'OBJECT',
        properties: camposProps,
      },
      examesNaoMapeados: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
      avisos: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
    },
    required: ['camposMapeados', 'examesNaoMapeados', 'avisos'],
  };
}

function extractJsonObject(text: string): unknown {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    let cleaned = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export async function extrairExamesLaboratoriaisComGemini(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<ExameLaboratorialExtracaoNormalizada> {
  const { buffer, mimeType } = params;
  if (buffer.length > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 5 MB.');
  }
  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase();
  if (!MIME_ALLOWED.has(normalizedMime)) {
    throw new Error('Formato não suportado. Use PDF, JPEG, PNG ou WebP.');
  }

  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new Error('Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).');
  }

  const accessToken = await getVertexAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model =
    process.env.GEMINI_EXAME_LAB_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    'gemini-2.0-flash-001';
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const allowedKeysJson = JSON.stringify(EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS);
  const prompt = buildExameLaboratorialPrompt(allowedKeysJson);
  const base64 = buffer.toString('base64');

  // Schema com ~60 propriedades fixas em camposMapeados costuma reduzir quantos resultados o modelo
  // preenche no Flash/Vertex. Padrão: só responseMimeType JSON + prompt; chaves inválidas ainda são filtradas em normalizarRespostaExameIA.
  const useResponseSchema = process.env.EXAME_LAB_IA_USE_RESPONSE_SCHEMA === '1';
  const tempRaw = process.env.EXAME_LAB_IA_TEMPERATURE;
  const tempParsed = tempRaw !== undefined && tempRaw !== '' ? Number(tempRaw) : 0;
  const temperature =
    tempRaw !== undefined && tempRaw !== '' && Number.isFinite(tempParsed)
      ? Math.min(1, Math.max(0, tempParsed))
      : 0;

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 8192,
    temperature,
    topP: 0.95,
    responseMimeType: 'application/json',
  };
  if (useResponseSchema) {
    generationConfig.responseSchema = buildExameLabResponseSchema();
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: normalizedMime,
              data: base64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText;
    throw new Error(`Gemini: ${errMsg}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  let text = '';
  for (const p of parts) {
    if (typeof p.text === 'string') text += p.text;
  }

  const parsed = extractJsonObject(text);
  return normalizarRespostaExameIA(parsed);
}
