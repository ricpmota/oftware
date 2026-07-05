/**
 * Extração de resultados laboratoriais a partir de PDF/imagem via Vertex AI (Gemini).
 * Server-only.
 */

import { resolveExameLabGeminiModelId } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { normalizarRespostaExameIA, type ExameLaboratorialExtracaoNormalizada } from '@/lib/metaadmin/exameLaboratorialExtracao';

function buildExameLaboratorialPrompt(allowedKeysJson: string): string {
  return `Você é um especialista em leitura de exames laboratoriais brasileiros.

Sua função é analisar PDF ou imagem de laudo e retornar dados estruturados para preenchimento de campos no sistema médico.

REGRA PRINCIPAL:
Você NÃO deve apenas ler texto. Você deve interpretar corretamente o layout e identificar o RESULTADO ATUAL do paciente para cada exame.

OBJETIVO DA EXTRAÇÃO:
1) nomePacienteDocumento
2) dataExame
3) camposMapeados
4) examesNaoMapeados
5) avisos

REGRAS CRÍTICAS DE INTERPRETAÇÃO:
1) RESULTADO ATUAL
- Priorize o valor principal associado ao nome do exame.
- Ignore "resultado anterior", histórico e datas antigas.
- Se houver vários números, escolha somente o número mais provável como resultado atual do paciente.

2) NÃO CONFUNDIR
- Faixa de referência NÃO é resultado.
- Comentário clínico NÃO é resultado.
- Assinatura, carimbo, marca d'água, logo, texto institucional, cabeçalho e rodapé devem ser ignorados.

3) PADRÃO DE LEITURA
- Exames brasileiros costumam seguir: NOME DO EXAME -> VALOR -> UNIDADE -> FAIXA DE REFERÊNCIA.
- Exemplo: Glicose 82 mg/dL (referência 70-99). Resultado correto é 82.

4) PRIORIDADE EM CASO DE AMBIGUIDADE
- Priorize nesta ordem:
  a) número alinhado ao nome do exame;
  b) número sem data associada;
  c) número acompanhado de unidade;
  d) número antes da faixa de referência.

5) EXAMES COMPOSTOS
- Em painéis como hemograma, trate cada item separadamente (hemoglobina, hematócrito, leucócitos, plaquetas etc.).
- Extraia o que tiver correspondência clara nas chaves permitidas.

6) UNIDADES
- Associe corretamente unidades como mg/dL, U/L, mUI/L, ng/mL, ng/dL, mmol/L, /mm3 e variações.
- Mesmo se a unidade estiver distante visualmente, relacione com cautela.
- Não converta unidades (ex.: mmol/L para mg/dL). Preserve o número como aparece no laudo.

7) CONFIANÇA E INCERTEZA
- Se leitura estiver clara, prossiga.
- Se houver ambiguidade relevante, não invente: omita de camposMapeados e registre em examesNaoMapeados/avisos.
- Use avisos para descrever incerteza, baixa legibilidade, corte de imagem ou dúvida de associação.

REGRAS OBRIGATÓRIAS DE SAÍDA:
0) Preencha camposMapeados com o máximo de exames legíveis e confiáveis da lista permitida.
1) Use SOMENTE valores que apareçam claramente no documento.
2) NÃO invente, NÃO estime, NÃO complete lacunas.
3) Cada valor numérico deve estar explicitamente associado a um exame no documento.
4) Se houver valores como "<0,5", ">500", "negativo", "não reagente" ou sem número claro, não invente número; omita e registre em avisos quando útil.
5) Você só pode usar em camposMapeados chaves que existam EXATAMENTE na lista permitida abaixo.
6) Exames identificados sem chave correspondente devem ir para examesNaoMapeados.
7) nomePacienteDocumento: extraia o nome do paciente exibido no laudo (ex.: campo "Paciente", "Nome", "Nome do paciente"). Se não estiver claro, null.
8) dataExame: prefira data de coleta ou emissão do resultado, formato YYYY-MM-DD; se incerto/conflitante, null.
9) Leucócitos e plaquetas: se o laudo trouxer contagem absoluta /µL (ex.: 256000), envie como no documento; o backend ajusta escala quando necessário.
10) Retorne APENAS o JSON final, sem markdown e sem texto adicional.

FORMATO EXATO DO JSON DE SAÍDA (NÃO ALTERAR):
{
  "nomePacienteDocumento": "NOME COMPLETO" | null,
  "dataExame": "YYYY-MM-DD" | null,
  "camposMapeados": { "<chave_da_lista>": número },
  "examesNaoMapeados": ["nome como no documento", ...],
  "avisos": ["...", ...]
}

LISTA EXATA DE CHAVES PERMITIDAS PARA camposMapeados:
${allowedKeysJson}

Exemplos de mapeamento de nomes comuns no Brasil para chaves:
- Glicemia jejum / glicose jejum -> glicemiaJejum
- HbA1c / hemoglobina glicada / A1C -> hemoglobinaGlicada
- Insulina jejum -> insulinaJejum
- Ureia / BUN (se valor for ureia em mg/dL) -> ureia
- Creatinina -> creatinina
- TFG / TFGe / eGFR -> taxaFiltracaoGlomerular
- Sódio / Na -> sodio
- Potássio / K -> potassio
- TGP / ALT -> tgp
- TGO / AST -> tgo
- GGT / gama GT -> ggt
- Fosfatase alcalina / FA -> fosfataseAlcalina
- Colesterol total -> colesterolTotal
- HDL / HDL-c -> hdl
- LDL / LDL-c -> ldl
- Triglicerídeos / TG -> triglicerides
- TSH -> tsh
- T4 livre / T4L -> t4Livre
- Calcitonina -> calcitonina
- Hemoglobina / Hb -> hemoglobina
- Leucócitos / GB -> leucocitos
- Plaquetas -> plaquetas
- Ferritina -> ferritina
- Ferro sérico -> ferroSerico
- B12 / vitamina B12 -> vitaminaB12
- Vitamina D / 25-OH -> vitaminaD
- Albumina -> albumina
- Ácido úrico / urato -> acidoUrico
- HOMA-IR / HOMA -> homaIr
- Leptina -> leptina
- Adiponectina -> adiponectina
- Fibrinogênio -> fibrinogenio
- Homocisteína -> homocisteina
- Apolipoproteína B / ApoB -> apolipoproteinaB
- Apolipoproteína A1 / ApoA1 -> apolipoproteina1
- VLDL / VLDL-c -> vldl
- Bilirrubina total -> bilirrubinaTotal
- Bilirrubina direta -> bilirrubinaDirecta
- Bilirrubina indireta -> bilirrubinaIndireta
- Amilase -> amilase
- Lipase -> lipase
- T3 livre -> t3Livre
- Anti-TPO / anti-tiroperoxidase -> antiTPO
- Anti-Tg / anti-tireoglobulina -> antiTg
- Calcitonina -> calcitonina
- Testosterona total -> testosteronaTotal
- Testosterona livre -> testosteronaLivre
- SHBG -> shbg
- LH -> lh
- FSH -> fsh
- Estradiol / E2 -> estradiol
- PSA total -> psa
- PSA livre -> psaLivre
- DHT / di-hidrotestosterona -> dht
- Prolactina / PRL -> prolactina
- Progesterona -> progesterona
- 17-OH-progesterona -> oh17Progesterona
- AMH / hormônio anti-mülleriano -> amh
- Cortisol 8h / cortisol matinal -> cortisol8h
- Cortisol 16h / cortisol vespertino -> cortisol16h
- ACTH -> acth
- DHEA-S / DHEAS / sulfato de DHEA -> dheas
- IGF-1 / somatomedina C -> igf1
- CPK / CK / creatinoquinase -> cpk
- PTH / paratormônio -> pth
- Proteínas totais -> proteinasTotal
- Globulinas -> globulinas
- G6PD / glicose-6-fosfato desidrogenase -> g6pd
- Vitamina C / ácido ascórbico -> vitaminaC
- Anti-HCV -> antiHcv
- Alumínio sérico -> aluminioSerico
- CEA / antígeno carcinoembrionário -> cea
- CA-125 -> ca125
- CA 19-9 -> ca199
(Use outras chaves da lista quando houver correspondência clara.)

Se o documento não contiver resultado laboratorial claro, retorne:
- camposMapeados = {}
- examesNaoMapeados = []`;
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
      nomePacienteDocumento: { type: 'STRING', nullable: true },
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

/**
 * Vercel pode rejeitar multipart grandes antes de entrar na função (413).
 * Mantemos margem abaixo do limite prático para evitar FUNCTION_PAYLOAD_TOO_LARGE.
 */
const MAX_BYTES = Math.floor(4.2 * 1024 * 1024);

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
    throw new Error('Arquivo muito grande. Máximo 4,2 MB.');
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
  const model = resolveExameLabGeminiModelId();
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
