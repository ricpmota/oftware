/**
 * Análise inteligente da anamnese (Perfil Metabólico V3) via Vertex AI (Gemini).
 * Server-only.
 */

import { DEFAULT_GEMINI_MODEL_ID } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { buildAnamneseContextForIA } from '@/lib/meta/buildAnamneseContextForIA';
import { normalizarAnamneseInteligencia } from '@/lib/meta/normalizarAnamneseInteligencia';
import type { AnamneseInteligenteV3, PacienteCompleto } from '@/types/obesidade';

function buildSystemPrompt(): string {
  return `Você é um assistente clínico de apoio à decisão para médicos que tratam obesidade com tirzepatida.

TAREFA: Com base APENAS no JSON de dados do paciente, produza uma análise em português do Brasil.

REGRAS OBRIGATÓRIAS:
- NÃO diagnosticar. NÃO prescrever. NÃO afirmar contraindicação absoluta.
- Use linguagem prudente: "sugere", "relata", "pode indicar", "vale investigar", "merece atenção".
- Baseie-se somente nos dados fornecidos; não invente sintomas ou histórico.
- Se houver poucos dados ou perfil metabólico com blocos não preenchidos, use nivelConfianca "baixo" ou "moderado" e diga isso no resumo.
- Highlights de risco/atenção use tipo "risco" quando aplicável.
- Máximo 8 highlights; priorize o que é mais relevante para conduta e adesão.

FORMATO: responda SOMENTE com JSON válido (sem markdown), exatamente com estas chaves:
{
  "resumoMedico": "string (3-6 frases, objetivas, para o médico)",
  "highlights": [
    {
      "tipo": "sono" | "alimentacao" | "atividade" | "energia" | "historico" | "medicamentos" | "barreiras" | "expectativa" | "risco",
      "titulo": "string curta",
      "descricao": "string (1-2 frases)",
      "severidade": "baixa" | "moderada" | "alta"
    }
  ],
  "barreirasAdesao": ["string", ...],
  "pontosMedicoInvestigar": ["string", ...],
  "perfilComportamental": "string (2-4 frases sobre estilo/adesão/comportamento inferido com cautela)",
  "nivelConfianca": "baixo" | "moderado" | "alto"
}`;
}

export async function gerarAnamneseInteligenciaComGemini(
  paciente: PacienteCompleto
): Promise<AnamneseInteligenteV3> {
  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new Error('Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).');
  }

  const context = buildAnamneseContextForIA(paciente);
  const userPrompt = `Dados do paciente (JSON):\n${JSON.stringify(context, null, 2)}`;

  const accessToken = await getVertexAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model =
    process.env.GEMINI_ANAMNESE_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    DEFAULT_GEMINI_MODEL_ID;

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const payload = {
    systemInstruction: {
      role: 'user',
      parts: [{ text: buildSystemPrompt() }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.35,
      topP: 0.9,
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
    throw new Error(data?.error?.message || res.statusText || 'Erro ao chamar Gemini.');
  }

  let text = '';
  for (const p of data.candidates?.[0]?.content?.parts ?? []) {
    if (typeof p.text === 'string') text += p.text;
  }
  text = text.trim();
  if (!text) throw new Error('Resposta vazia do Gemini.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON inválido na resposta do Gemini.');
    parsed = JSON.parse(match[0]);
  }

  const normalized = normalizarAnamneseInteligencia(parsed);
  return {
    ...normalized,
    modelo: model,
  };
}
