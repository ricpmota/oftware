/**
 * Extração de resultado de bioimpedância (InBody / Tanita / apps de balança) via Vertex AI (Gemini).
 * Server-only.
 */

import { DEFAULT_GEMINI_MODEL_ID } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { normalizarRespostaBioImpedanciaIA } from '@/lib/metaadmin/bioImpedanciaExtracao';
import type { BioImpedanciaExtracaoNormalizada } from '@/lib/metaadmin/bioImpedanciaExtracao';

function buildBioImpedanciaPrompt(): string {
  return `Você analisa relatórios de BIOIMPEDÂNCIA: InBody (270/570/770/S10), Tanita, Omron, Xiaomi, Renpho, seca, apps de balança inteligente, laudos de clínica em PDF ou foto.

Sua tarefa: ler TODO o documento e extrair o máximo possível de valores numéricos MEDIDOS do paciente (resultado atual), preenchendo o JSON abaixo.

REGRAS GERAIS:
1) Use SOMENTE números explicitamente no laudo. NUNCA invente, NUNCA use faixa de referência, alvo ou "normal range" como se fosse resultado.
2) Priorize coluna **medido / atual / resultado / measurement / analysis** — NÃO use apenas "low/normal/high" ou faixas ideais.
3) Vírgula decimal brasileira (69,85) → ponto no JSON (69.85). Remova separadores de milhar.
4) Se o exame for genérico (app de balança) e NÃO tiver proteínas, minerais ou segmentar, OMITA esses campos — não preencha com zero.
5) Se água vier em **kg** ("peso da água", "water kg"), preencha **aguaKg** E também **composicaoCorporal.aguaTotalLitros** com o mesmo valor (aproximação 1 kg ≈ 1 L) e adicione aviso em **avisos**.
6) **origemExame** (obrigatório quando identificável): um de: inbody | tanita | omron | xiaomi | renpho | seca | generico | outro
   - InBody no cabeçalho/logo → inbody
   - Tanita → tanita | Omron → omron | Xiaomi/Mi Body → xiaomi | Renpho → renpho | seca → seca
   - App de balança genérico sem marca clara → generico
7) **dataRegistro:** YYYY-MM-DD se legível; senão null.
8) **avisos:** problemas de leitura, campos ambíguos, conversões feitas, idioma misto, etc.

MAPEAMENTOS OBRIGATÓRIOS (sinônimos → campo JSON):
- "Gordura(%)", "BF%", "PBF", "Percent Body Fat", "Body Fat %" → **percentualGordura** E **analiseObesidade.percentualGordura**
- "Peso da gordura", "Fat Mass", "Body Fat Mass", "Massa de gordura", "BFM" → **massaGorduraKg** + **composicaoCorporal.massaGorduraKg** + **analiseMusculoGordura.massaGorduraKg**
- "Massa muscular", "Muscle Mass", "Peso da massa muscular" (total) → **massaMuscularKg** + **analiseMusculoGordura.massaMuscularKg**
- "Skeletal Muscle Mass", "SMM", "Massa muscular esquelética" (kg) → **massaMuscularEsqueleticaKg**; se não houver "massa muscular" total separada, também **analiseMusculoGordura.massaMuscularKg**
- "Água(%)", "Water %", "Body Water %" → **aguaPercentual**
- "Peso da água", "Water kg", "água corporal kg" → **aguaKg** (+ litros conforme regra 5)
- "TBW", "Total Body Water" em litros → **composicaoCorporal.aguaTotalLitros**
- "Gordura visceral", "Visceral Fat", "VFA" (índice) → **gorduraVisceral**
- "Metabolismo", "BMR", "Basal Metabolic Rate", "kcal/dia" → **metabolismoBasalKcal**
- "IMC", "BMI" → **imc**
- "Peso", "Weight", "WT", "Body Weight" → **peso**
- "Altura", "Height" → **alturaCm** (cm; se vier em m, converta)
- "Idade corporal", "Body Age" → **idadeCorporal**
- "Proteína %", "Protein %" → **proteinaPercentual**
- "Massa óssea", "Bone Mass" (kg) → **massaOsseaKg**; se for só minerais InBody, **composicaoCorporal.mineraisKg**
- "Circunferência abdominal", "Waist" (cm) → **circunferenciaAbdominalCm**

SEGMENTAR (InBody/Tanita com tabela segmentar):
- Chaves: arm_r, arm_l, trunk, leg_r, leg_l (RA→arm_r, LA→arm_l, TR→trunk, RL→leg_r, LL→leg_l)
- Cada segmento: { "kg": número, "percentual": número } — omita campo não presente no laudo

CAMPOS LEGADOS (preencher quando houver equivalência):
- composicaoCorporal: aguaTotalLitros, proteinasKg, mineraisKg, massaGorduraKg
- analiseMusculoGordura: massaMuscularKg, massaGorduraKg
- analiseObesidade: percentualGordura
- massaMagraSegmentar, gorduraSegmentar

FORMATO JSON DE SAÍDA (omitir campos ausentes; não enviar null para números não lidos):
{
  "origemExame": "inbody" | "tanita" | "omron" | "xiaomi" | "renpho" | "seca" | "generico" | "outro",
  "dataRegistro": "YYYY-MM-DD" | null,
  "peso": número,
  "imc": número,
  "percentualGordura": número,
  "massaGorduraKg": número,
  "massaMuscularKg": número,
  "massaMuscularEsqueleticaKg": número,
  "gorduraVisceral": número,
  "aguaPercentual": número,
  "aguaKg": número,
  "metabolismoBasalKcal": número,
  "massaOsseaKg": número,
  "proteinaPercentual": número,
  "idadeCorporal": número,
  "alturaCm": número,
  "circunferenciaAbdominalCm": número,
  "composicaoCorporal": { "aguaTotalLitros", "proteinasKg", "mineraisKg", "massaGorduraKg" },
  "analiseMusculoGordura": { "massaMuscularKg", "massaGorduraKg" },
  "analiseObesidade": { "percentualGordura" },
  "massaMagraSegmentar": { arm_r, arm_l, trunk, leg_r, leg_l },
  "gorduraSegmentar": { arm_r, arm_l, trunk, leg_r, leg_l },
  "avisos": ["..."]
}

Exemplo app genérico (valores ilustrativos do tipo de laudo): peso 69.85, IMC 21.8, gordura 17.9%, massa gordura 12.5 kg, SMM 29.6 kg (42.4%), massa muscular total 53.7 kg, água 55.6% / 38.9 kg, visceral 8.5, BMR 1563.1 kcal, altura 179 cm, idade 41 → origemExame "generico", sem segmentar/proteínas/minerais se ausentes.

Saída: APENAS JSON válido, sem markdown.`;
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
      origemExame: { type: 'STRING', nullable: true },
      dataRegistro: { type: 'STRING', nullable: true },
      peso: { type: 'NUMBER' },
      imc: { type: 'NUMBER' },
      percentualGordura: { type: 'NUMBER' },
      massaGorduraKg: { type: 'NUMBER' },
      massaMuscularKg: { type: 'NUMBER' },
      massaMuscularEsqueleticaKg: { type: 'NUMBER' },
      gorduraVisceral: { type: 'NUMBER' },
      aguaPercentual: { type: 'NUMBER' },
      aguaKg: { type: 'NUMBER' },
      metabolismoBasalKcal: { type: 'NUMBER' },
      massaOsseaKg: { type: 'NUMBER' },
      proteinaPercentual: { type: 'NUMBER' },
      idadeCorporal: { type: 'NUMBER' },
      alturaCm: { type: 'NUMBER' },
      circunferenciaAbdominalCm: { type: 'NUMBER' },
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
    DEFAULT_GEMINI_MODEL_ID;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const prompt = buildBioImpedanciaPrompt();
  const base64 = buffer.toString('base64');

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
