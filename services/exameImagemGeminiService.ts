/**
 * Classificação e metadados de laudos de exame de imagem (PDF ou imagem) via Vertex AI (Gemini).
 * Server-only.
 */

import { DEFAULT_GEMINI_MODEL_ID } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import {
  EXAMES_IMAGEM_IMAGE_MIMES,
  EXAMES_IMAGEM_PDF_MIME,
  isMimeExameImagemAceito,
} from '@/lib/metaadmin/examesImagemAllowedMime';
import {
  normalizarRespostaExameImagemIA,
  type ExameImagemExtracaoNormalizada,
} from '@/lib/metaadmin/exameImagemExtracao';

function buildExameImagemPrompt(): string {
  const tipos = [
    'usg',
    'tomografia',
    'ressonancia',
    'raio_x',
    'densitometria',
    'medicina_nuclear',
    'endoscopia',
    'outro',
    'desconhecido',
  ].join(', ');

  return `Você é um especialista em laudos de exames de imagem médica no Brasil.

Analise o documento enviado (PDF do laudo ou imagem/foto do laudo, pedido ou relatório) e extraia somente o que estiver claro.

Retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON) com este formato exato:
{
  "nomePacienteDocumento": string | null,
  "dataExame": "YYYY-MM-DD" | null,
  "tipoExame": string,
  "resumoEquipamentoOuRegiao": string | null,
  "avisos": string[]
}

REGRAS:
1) nomePacienteDocumento: nome do paciente como no cabeçalho (Paciente, Nome, etc.). Se ilegível ou ausente, null.
2) dataExame: preferir data do exame, coleta ou emissão do laudo; formato estrito YYYY-MM-DD. Se houver várias datas conflitantes ou incerto, null.
3) tipoExame: deve ser EXATAMENTE um destes valores em minúsculas: ${tipos}
   - USG/ultrassonografia/ecografia -> usg
   - TC/tomografia computadorizada/CT -> tomografia
   - RM/ressonância magnética/RNM -> ressonancia
   - Raio-X/radiografia/RX -> raio_x
   - Densitometria óssea/DEXA -> densitometria
   - PET-CT/cintilografia/SPECT -> medicina_nuclear
   - Endoscopia/colonoscopia/gastroscopia -> endoscopia
   - Se não couber claramente em nenhum: outro
   - Se não for possível classificar: desconhecido
4) resumoEquipamentoOuRegiao: uma linha curta (ex.: "USG de abdome total", "TC de crânio sem contraste"). Se não houver, null.
5) avisos: avisos objetivos (ex.: documento ilegível, múltiplos exames no mesmo PDF). Array vazio se nada a relatar.
6) NÃO invente dados. Se não for de exame de imagem, use tipoExame "desconhecido" e explique em avisos.`;
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

const MAX_BYTES = Math.floor(4.2 * 1024 * 1024);

export async function extrairExameImagemComGemini(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<ExameImagemExtracaoNormalizada> {
  const { buffer, mimeType } = params;
  if (buffer.length > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 4,2 MB.');
  }
  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase();
  if (!isMimeExameImagemAceito(normalizedMime)) {
    const aceitos = [EXAMES_IMAGEM_PDF_MIME, ...EXAMES_IMAGEM_IMAGE_MIMES].join(', ');
    throw new Error(`Formato não aceito. Use PDF ou imagem (${aceitos}).`);
  }

  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new Error('Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).');
  }

  const accessToken = await getVertexAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model =
    process.env.GEMINI_EXAME_IMAGEM_MODEL_ID ||
    process.env.GEMINI_EXAME_LAB_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    DEFAULT_GEMINI_MODEL_ID;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const prompt = buildExameImagemPrompt();
  const base64 = buffer.toString('base64');

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
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0,
      topP: 0.95,
      responseMimeType: 'application/json',
    },
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
  return normalizarRespostaExameImagemIA(parsed);
}
