/**
 * Extração de resultado de bioimpedância (InBody / relatório similar) via Vertex AI (Gemini).
 * Server-only.
 */

import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { normalizarRespostaBioImpedanciaIA } from '@/lib/metaadmin/bioImpedanciaExtracao';
import type { BioImpedanciaExtracaoNormalizada } from '@/lib/metaadmin/bioImpedanciaExtracao';

function buildBioImpedanciaPrompt(): string {
  return `Você analisa relatórios de BIOIMPEDÂNCIA (InBody 270/570/770, InBody S10, Tanita, Omron, seca, equipamentos de clínica, laudos em PDF ou foto).

Sua tarefa: ler TODO o documento (todas as páginas / todas as regiões visíveis) e extrair o máximo possível de valores numéricos do PACIENTE que alimentam o JSON abaixo. Relatórios são bagunçados: tabelas, gráficos, duas colunas (valor atual vs faixa), abas “Composition”, “Obesity”, “Segmental”.

REGRAS:
1) Use SOMENTE números que estejam explicitamente no laudo. NÃO invente, NÃO arredonde além do que o documento mostra, NÃO preencha lacunas com médias.
2) Priorize sempre a coluna de **resultado / medido / atual / analysis / measurement**, NÃO use só “low / normal / high”, faixa de referência ou “target”, exceto se for o único número disponível (raro).
3) **Vírgula decimal brasileira (3,5)** → número JSON com ponto (3.5). Remova separadores de milhar se houver.
4) **Peso (kg):** “Weight”, “WT”, “Peso”, “PBW”, “Body Weight”.
5) **Composição corporal (composicaoCorporal):**
   - **aguaTotalLitros:** “TBW”, “Total Body Water”, “Água Total”, “Água corporal total”, valores em **L** (litros). Se o laudo mostrar só “água” em kg, converta para litros SE o documento disser explícito que é kg de água (caso contrário, omitir).
   - **proteinasKg:** “Protein”, “Solid”, “Proteína”, “Massa proteica” (normalmente kg).
   - **mineraisKg:** “Minerals”, “Mineral”, “Massa mineral”, “osteoporosis” section mass — use o valor de **minerais/osseous** em kg se claramente indicado; senão omita.
   - **massaGorduraKg:** “BFM”, “Body Fat Mass”, “Massa de gordura”, “Gordura corporal (kg)”, “Fat Mass”. NÃO confundir com **percentual** de gordura.
6) **Músculo–gordura (analiseMusculoGordura):**
   - **massaMuscularKg:** “SMM”, “SLM”, “Skeletal Muscle Mass”, “Muscle Mass”, “Massa muscular esquelética”, “Lean Soft Mass” quando for claramente massa muscular (kg), não peso total.
   - **massaGorduraKg:** repetir a massa de gordura em kg se aparecer nesta seção (pode ser o mesmo BFM da composição).
7) **PGC (analiseObesidade.percentualGordura):** “PBF”, “Percent Body Fat”, “BF%”, “Gordura %”, “% de gordura”. Número em percentual (ex.: SEM o símbolo % no JSON).
8) **Segmentar (massaMagraSegmentar e gorduraSegmentar):** procure tabelas “Segmental Lean / Fat / ECW” etc.
   - Use SEMPRE as chaves: arm_r, arm_l, trunk, leg_r, leg_l.
   - Mapeamento InBody comum: **RA**→arm_r, **LA**→arm_l, **TR**→trunk, **RL**→leg_r, **LL**→leg_l.
   - Cada segmento: { "kg": número, "percentual": número }. Se só um existir, envie só esse (pode omitir o outro campo do objeto ou usar 0 somente se o laudo mostrar zero).
9) **dataRegistro:** data do exame ou impressão, formato **YYYY-MM-DD**; se estiver DD/MM/AAAA, converta. Se ilegível, null.
10) **avisos:** lista de problemas (foto cortada, contraste baixo, mais de um paciente, tabela ilegível, idioma misto, etc.).
11) Saída: **apenas JSON válido**, sem markdown, sem comentários.

DICA: Se o PDF tem várias páginas, faça uma varredura completa antes de responder — muitos campos estão na página 2 (segmentar).

FORMATO EXATO DO JSON DE SAÍDA:
{
  "dataRegistro": "YYYY-MM-DD" | null,
  "peso": número | omitir,
  "composicaoCorporal": {
    "aguaTotalLitros": número,
    "proteinasKg": número,
    "mineraisKg": número,
    "massaGorduraKg": número
  } | omitir objeto vazio,
  "analiseMusculoGordura": {
    "massaMuscularKg": número,
    "massaGorduraKg": número
  } | omitir,
  "analiseObesidade": {
    "percentualGordura": número
  } | omitir,
  "massaMagraSegmentar": {
    "arm_r": { "kg": número, "percentual": número },
    "arm_l": { "kg": número, "percentual": número },
    "trunk": { "kg": número, "percentual": número },
    "leg_r": { "kg": número, "percentual": número },
    "leg_l": { "kg": número, "percentual": número }
  } | omitir,
  "gorduraSegmentar": { mesmo formato que massaMagraSegmentar } | omitir,
  "avisos": ["...", ...]
}

Se o documento não for claramente um laudo de bioimpedância, retorne poucos campos e explique em avisos. Mesmo assim, devolva TUDO que conseguir ler com segurança.`;
}

function segmentSchema(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      kg: { type: 'NUMBER' },
      percentual: { type: 'NUMBER' },
    },
  };
}

function buildBioImpedanciaResponseSchema(): Record<string, unknown> {
  const seg = segmentSchema();
  const massa = {
    type: 'OBJECT',
    properties: {
      arm_r: seg,
      arm_l: seg,
      trunk: seg,
      leg_r: seg,
      leg_l: seg,
    },
  };
  return {
    type: 'OBJECT',
    properties: {
      dataRegistro: { type: 'STRING', nullable: true },
      peso: { type: 'NUMBER' },
      composicaoCorporal: {
        type: 'OBJECT',
        properties: {
          aguaTotalLitros: { type: 'NUMBER' },
          proteinasKg: { type: 'NUMBER' },
          mineraisKg: { type: 'NUMBER' },
          massaGorduraKg: { type: 'NUMBER' },
        },
      },
      analiseMusculoGordura: {
        type: 'OBJECT',
        properties: {
          massaMuscularKg: { type: 'NUMBER' },
          massaGorduraKg: { type: 'NUMBER' },
        },
      },
      analiseObesidade: {
        type: 'OBJECT',
        properties: {
          percentualGordura: { type: 'NUMBER' },
        },
      },
      massaMagraSegmentar: massa,
      gorduraSegmentar: massa,
      avisos: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
    },
    required: ['avisos'],
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

export async function extrairBioImpedanciaComGemini(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<BioImpedanciaExtracaoNormalizada> {
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
    process.env.GEMINI_BIO_IMPEDANCIA_MODEL_ID ||
    process.env.GEMINI_EXAME_LAB_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    'gemini-2.0-flash-001';
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const prompt = buildBioImpedanciaPrompt();
  const base64 = buffer.toString('base64');

  // Schema estrito costuma reduzir campos em laudos complexos; alinhar a exames lab: só se BIO_IMPEDANCIA_IA_USE_RESPONSE_SCHEMA=1
  const useResponseSchema = process.env.BIO_IMPEDANCIA_IA_USE_RESPONSE_SCHEMA === '1';
  const disableSchemaExplicit = process.env.BIO_IMPEDANCIA_IA_DISABLE_RESPONSE_SCHEMA === '1';
  const applySchema = useResponseSchema && !disableSchemaExplicit;
  const tempRaw = process.env.BIO_IMPEDANCIA_IA_TEMPERATURE ?? process.env.EXAME_LAB_IA_TEMPERATURE;
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
  if (applySchema) {
    generationConfig.responseSchema = buildBioImpedanciaResponseSchema();
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
  return normalizarRespostaBioImpedanciaIA(parsed);
}
