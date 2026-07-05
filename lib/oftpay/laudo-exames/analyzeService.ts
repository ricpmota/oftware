import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import { loadKnowledge } from '@/lib/knowledge/knowledgeLoader';
import { buildKnowledgeBlock } from '@/lib/knowledge/buildKnowledgeBlock';
import {
  buildAnsweredFollowUpContext,
  buildFollowUpQuestions,
  hasMeaningfulFollowUpAnswers,
  type ClinicalFollowUpAnswer,
  type ClinicalFollowUpQuestion,
} from '@/lib/oftpay/clinicalFollowUpQuestions';
import {
  buildRefinementDelta,
  hasMeaningfulRefinementDelta,
  type RefinementDelta,
} from '@/lib/oftpay/refinementDelta';
import {
  buildIntegratedCaseSummary,
  hasMeaningfulIntegratedSummary,
  type IntegratedCaseSummary,
} from '@/lib/oftpay/integratedCaseSummary';
import {
  buildClinicalPriorityAssessment,
  hasMeaningfulClinicalPriority,
  type ClinicalPriorityAssessment,
} from '@/lib/oftpay/clinicalPriorityAssessment';
import {
  buildClinicalPriorityExplainability,
  hasMeaningfulClinicalPriorityExplainability,
  type ClinicalPriorityExplainability,
} from '@/lib/oftpay/clinicalPriorityExplainability';
import {
  buildClinicalFollowUpActions,
  hasMeaningfulClinicalFollowUpActions,
  type ClinicalFollowUpActions,
} from '@/lib/oftpay/clinicalFollowUpActions';
import {
  buildGlaucomaCorrelation,
  hasMeaningfulGlaucomaCorrelation,
  type GlaucomaCorrelation,
} from '@/lib/oftpay/glaucomaCorrelation';
import {
  buildRetinaCorrelation,
  hasMeaningfulRetinaCorrelation,
  type RetinaCorrelation,
} from '@/lib/oftpay/retinaCorrelation';
import {
  buildCorneaCorrelation,
  hasMeaningfulCorneaCorrelation,
  type CorneaCorrelation,
} from '@/lib/oftpay/corneaCorrelation';
import {
  buildMultiDomainCorrelation,
  hasMeaningfulMultiDomainCorrelation,
  type MultiDomainCorrelation,
} from '@/lib/oftpay/multiDomainCorrelation';
import {
  buildDomainLongitudinalCorrelation,
  hasMeaningfulDomainLongitudinalCorrelation,
  type DomainLongitudinalCorrelation,
} from '@/lib/oftpay/domainLongitudinalCorrelation';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { LaudoLearningRecord, LearningImpactRecord } from '@/lib/oftpay/laudoCaseArchive';
import {
  analyzeLearningPatterns,
  assignStableKeysToInsights,
  buildLearningContext,
  type LearningInsight,
} from '@/lib/oftpay/learningInsights';
import {
  aggregateLearningImpact,
  buildAdaptiveLearningContext,
  type LearningInsightEffectiveness,
} from '@/lib/oftpay/learningEffectiveness';
import {
  buildBinocularComparisons,
  getBinocularStatusLabel,
  getEyeLabel,
  normalizeEye,
} from '@/lib/oftpay/laudoOftalmoEye';
import {
  buildTemporalComparisons,
  getTemporalStatusLabel,
} from '@/lib/oftpay/laudoOftalmoTemporal';

export const runtime = 'nodejs';

const DISCOVERY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const CHAT_KNOWLEDGE_MAX_CHARS = Math.max(
  0,
  Number.parseInt(process.env.CHAT_KNOWLEDGE_MAX_CHARS ?? '', 10) || 48_000
);
const MAX_SOURCES = 8;
const MAX_EXTRACTIONS = 8;
const LEARNING_RECORDS_COLLECTION = 'oftpay_laudo_learning_records';
const LEARNING_IMPACT_COLLECTION = 'oftpay_learning_impact_records';
const MAX_LEARNING_RECORDS = 120;
const MAX_LEARNING_INSIGHTS = 5;

/** Valores enviados pelo front; itens legados podem omitir examType. */
const EXAM_TYPE_VALUES = [
  'paquimetria',
  'topografia',
  'galilei',
  'microscopia',
  'campimetria',
  'retinografia',
  'oct_disco',
  'oct_macula',
] as const;

type OftalmoExamType = (typeof EXAM_TYPE_VALUES)[number];

function isOftalmoExamType(v: string): v is OftalmoExamType {
  return (EXAM_TYPE_VALUES as readonly string[]).includes(v);
}

function normalizeExamType(raw: unknown): OftalmoExamType | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const t = raw.trim().toLowerCase();
  return isOftalmoExamType(t) ? t : undefined;
}

function getExamTypeLabel(examType: OftalmoExamType | undefined): string {
  if (!examType) return 'Tipo não informado';
  const labels: Record<OftalmoExamType, string> = {
    paquimetria: 'Paquimetria',
    topografia: 'Topografia',
    galilei: 'Galilei',
    microscopia: 'Microscopia',
    campimetria: 'Campimetria',
    retinografia: 'Retinografia',
    oct_disco: 'OCT Disco',
    oct_macula: 'OCT Mácula',
  };
  return labels[examType];
}

/**
 * Focos interpretativos por tipo (contexto incremental; não substitui prompt específico por exame).
 */
function buildExamTypeGuidance(examType: OftalmoExamType): string {
  const g: Record<OftalmoExamType, string> = {
    paquimetria:
      'Priorize espessura corneal central (CCT), menor espessura medida, localização do ponto mais fino, assimetria entre olhos e qualidade do traço.',
    topografia:
      'Priorize curvaturas (K1, K2, Km), magnitude e eixo do astigmatismo, simetria, padrão de superfície, paquimetria mínima quando presente, elevações e índices sugestivos de ectasia.',
    galilei:
      'Priorize curvatura anterior/posterior, espessura, astigmatismo, assimetria, elevações e índices de risco estrutural (ectasia) quando aplicável.',
    microscopia:
      'Priorize densidade celular endotelial, polimegatismo, pleomorfismo, hexagonalidade e qualidade da imagem.',
    campimetria:
      'Priorize índices de confiabilidade (perdas de fixação, falsos positivos/negativos), MD, PSD, VFI, GHT e padrão topográfico do defeito; correlacione com suspeita de glaucoma quando pertinente.',
    retinografia:
      'Priorize aspecto do disco óptico, mácula, vasos, hemorragias, exsudatos, drusas, alterações maculares e cicatrizes; comente limitações da imagem única.',
    oct_disco:
      'Priorize espessura da camada de fibras nervosas (global, quadrantes, clock hours quando houver), escavação e assimetria; interprete achados de forma compatível com estrutura glaucomatosa sem fechar diagnóstico.',
    oct_macula:
      'Priorize espessura macular central, fluido intra ou sub-retiniano, cistos, PED, membrana epirretiniana, tração vitreorretiniana e integridade das camadas; correlacione com patologia macular.',
  };
  return g[examType];
}

function buildAggregatedExamTypeGuidance(
  extractions: Array<{ examType?: unknown }>
): string {
  const seen = new Set<OftalmoExamType>();
  const lines: string[] = [];
  for (const item of extractions) {
    const t = normalizeExamType(item.examType);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    lines.push(
      `- **${getExamTypeLabel(t)}** (${t}): ${buildExamTypeGuidance(t)}`
    );
  }
  if (lines.length === 0) {
    return 'Nenhum tipo de exame foi informado nos itens; interprete com base apenas nos dados extraídos e nas evidências, explicitando incerteza quando necessário.';
  }
  return lines.join('\n');
}

function ophthalmologySearchKeywords(examType: OftalmoExamType | undefined): string {
  if (!examType) {
    return 'oftalmologia exame imagem laudo interpretação';
  }
  const k: Record<OftalmoExamType, string> = {
    paquimetria: 'paquimetria espessura corneal CCT ectasia',
    topografia: 'topografia corneana ceratometria astigmatismo ectasia',
    galilei: 'tomografia corneal Scheimpflug ectasia curvatura',
    microscopia: 'microscopia especular endotélio contagem celular',
    campimetria: 'campimetria campo visual perimetria glaucoma MD PSD VFI',
    retinografia: 'retinografia fundo de olho mácula retina',
    oct_disco: 'OCT disco nervo óptico RNFL glaucoma camada fibras',
    oct_macula: 'OCT mácula retina fluido cistos PED membrana epirretiniana',
  };
  return k[examType];
}

const SYSTEM_PROMPT = `Você é um médico oftalmologista preceptor auxiliando na interpretação assistida de **laudos e exames oftalmológicos** (imagem, gráficos ou dados estruturados extraídos de PDF/imagem).
Responda em português (Brasil), com linguagem técnica e didática.
Estruture a resposta em Markdown com tópicos curtos usando "-" (não use "*").

REGRAS OBRIGATÓRIAS:
- Use os **dados extraídos do exame** (DADOS_EXTRAIDOS_DO_LAUDO) como contexto principal dos achados numéricos ou textuais disponíveis.
- Use as **EVIDÊNCIAS_DAS_APOSTILAS** como base factual prioritária para embasar conteúdo teórico e condutas.
- Ordem de prioridade em caso de conflito: **DADOS_EXTRAIDOS_DO_LAUDO** > **EVIDÊNCIAS_DAS_APOSTILAS** > conhecimento oftalmológico geral.
- Quando houver EVIDÊNCIAS_DAS_APOSTILAS, cite no fim de cada bullet pertinente 1-2 referências no formato [1] ou [2,3].
- Não invente referências e não cite [n] inexistente.
- Se a evidência das apostilas for insuficiente para sustentar uma afirmação, diga isso explicitamente.
- **Não feche diagnóstico definitivo.** Use formulações como "sugestivo de", "compatível com", "a correlacionar com o quadro clínico" e "considerar".
- Comente **qualidade e confiabilidade** do exame quando os dados ou avisos indicarem limitação (artefato, leitura parcial, OCR, etc.).
- Quando existir **CONTEXTO_QUALIDADE_EXTRAÇÃO**, use-o para calibrar confiança e mencionar lacunas ou necessidade de revisão manual sem bloquear a interpretação.
- Quando existir **CORRELAÇÃO_BINOCULAR_ENTRE_OLHOS**, considere explicitamente simetria/assimetria entre OD e OE na síntese.
- Quando existir **COMPARAÇÃO_TEMPORAL_ENTRE_EXAMES**, considere evolução temporal da mesma modalidade e do mesmo olho, sem concluir progressão de forma definitiva.
- Quando existir **RESPOSTAS_CLÍNICAS_COMPLEMENTARES**, use-as como contexto adicional (sem tratá-las como verdade absoluta isolada), correlacionando com os achados do exame.
- Siga a seção **ORIENTACAO_POR_TIPO_DE_EXAME** para priorizar o que analisar em cada tipo de exame listado.

Estruture o fechamento da resposta com estes títulos em Markdown (nível ##):
## Principais achados
## Hipóteses / interpretações compatíveis
## Próximos passos sugeridos
## Limitações e sinais de alerta

Inclua sempre um lembrete de que a interpretação final é responsabilidade do médico assistente.`;

interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface Source {
  id: number;
  title: string;
  snippet: string;
  page?: number;
  uri?: string;
}

function getCredentials(): GoogleCreds | null {
  const jsonEnv = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const key =
        typeof parsed.private_key === 'string'
          ? parsed.private_key.replace(/\\n/g, '\n')
          : '';
      if (parsed.project_id && parsed.client_email && key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: key,
        };
      }
    } catch (e) {
      console.error('[laudo-exames] erro ao parsear GOOGLE_VERTEX_CREDENTIALS_JSON:', e);
    }
  }

  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (projectId && clientEmail && rawKey) {
    return { projectId, clientEmail, privateKey: rawKey.replace(/\\n/g, '\n') };
  }
  return null;
}

function getAccessToken(creds: GoogleCreds): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [DISCOVERY_SCOPE],
  });
  return client.authorize().then((t) => (t as { access_token?: string }).access_token || '');
}

function extractSourcesFromSearchResponse(data: Record<string, unknown>): Source[] {
  const results = data.results as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const raw: { title: string; snippet: string; page?: number; uri?: string }[] = [];

  for (const r of results) {
    if (raw.length >= MAX_SOURCES) break;

    const doc = r.document as Record<string, unknown> | undefined;
    const chunk = r.chunk as Record<string, unknown> | undefined;
    const docMeta = chunk?.documentMetadata as Record<string, unknown> | undefined;
    const title =
      (typeof docMeta?.title === 'string' ? docMeta.title : null) ??
      ((doc?.derivedStructData &&
        typeof doc.derivedStructData === 'object' &&
        (doc.derivedStructData as Record<string, unknown>).title) as string | undefined) ??
      (typeof doc?.title === 'string' ? doc.title : null) ??
      'Apostila';
    const pageIdentifier = docMeta?.pageIdentifier;
    const pageNum =
      typeof pageIdentifier === 'number' && Number.isFinite(pageIdentifier)
        ? pageIdentifier
        : typeof pageIdentifier === 'string'
          ? parseInt(pageIdentifier.replace(/\D/g, ''), 10) || undefined
          : undefined;
    const uri =
      typeof docMeta?.uri === 'string'
        ? docMeta.uri
        : ((doc?.derivedStructData &&
            typeof doc.derivedStructData === 'object' &&
            (doc.derivedStructData as Record<string, unknown>).link) as string | undefined) ??
          undefined;

    const push = (snippet: string) => {
      const normalized = snippet.trim();
      if (!normalized) return;
      const key = `${title}\0${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      raw.push({
        title,
        snippet: normalized,
        ...(pageNum != null && { page: pageNum }),
        ...(uri && { uri }),
      });
    };

    if (doc?.derivedStructData && typeof doc.derivedStructData === 'object') {
      const d = doc.derivedStructData as Record<string, unknown>;
      if (Array.isArray(d.snippets)) {
        for (const s of d.snippets) {
          const snip =
            typeof s === 'object' && s !== null && 'snippet' in s
              ? (s as { snippet?: string }).snippet
              : s;
          if (typeof snip === 'string') push(snip);
        }
      }
      if (Array.isArray(d.extractive_segments)) {
        for (const seg of d.extractive_segments) {
          const content =
            typeof seg === 'object' && seg !== null && 'content' in seg
              ? (seg as { content?: string }).content
              : seg;
          if (typeof content === 'string') push(content);
        }
      }
      if (Array.isArray(d.extractive_answers)) {
        for (const a of d.extractive_answers) {
          const content =
            typeof a === 'object' && a !== null && 'content' in a
              ? (a as { content?: string }).content
              : a;
          if (typeof content === 'string') push(content);
        }
      }
    }
    if (chunk && typeof chunk.content === 'string') {
      push(chunk.content);
    }
  }

  return raw.slice(0, MAX_SOURCES).map((s, i) => ({ ...s, id: i + 1 }));
}

export type LaudoExtractionInput = {
  fileName?: string;
  /** Valor técnico (ex.: oct_macula); omitido em clientes antigos. */
  examType?: string;
  eye?: string;
  data?: unknown;
};

type AnalyzeResponse = {
  answer: string;
  sources: Source[];
  usedWebGrounding: boolean;
  followUpQuestions: ClinicalFollowUpQuestion[];
  refinementUsedAnswersCount?: number;
  refinementUsedQuestions?: string[];
  refinementDelta?: RefinementDelta;
  integratedCaseSummary?: IntegratedCaseSummary;
  clinicalPriorityAssessment?: ClinicalPriorityAssessment;
  clinicalPriorityExplainability?: ClinicalPriorityExplainability;
  clinicalFollowUpActions?: ClinicalFollowUpActions;
  glaucomaCorrelation?: GlaucomaCorrelation;
  retinaCorrelation?: RetinaCorrelation;
  corneaCorrelation?: CorneaCorrelation;
  multiDomainCorrelation?: MultiDomainCorrelation;
  domainLongitudinalCorrelation?: DomainLongitudinalCorrelation;
  learningInsightsApplied?: LearningInsight[];
};

export function buildLearningInsightsForAnalyze(records: LaudoLearningRecord[]): LearningInsight[] {
  return assignStableKeysToInsights(analyzeLearningPatterns(records).slice(0, MAX_LEARNING_INSIGHTS));
}

export function inferDomainsFromExamTypes(
  extractions: LaudoExtractionInput[]
): Array<'glaucoma' | 'retina' | 'cornea'> {
  const domains = new Set<'glaucoma' | 'retina' | 'cornea'>();
  for (const item of extractions) {
    const examType = normalizeExamType(item.examType);
    if (!examType) continue;
    if (examType === 'oct_disco' || examType === 'campimetria') domains.add('glaucoma');
    if (examType === 'oct_macula' || examType === 'retinografia') domains.add('retina');
    if (
      examType === 'topografia' ||
      examType === 'galilei' ||
      examType === 'paquimetria' ||
      examType === 'microscopia'
    ) {
      domains.add('cornea');
    }
  }
  return Array.from(domains);
}

export function buildLearningContextForAnalyze(records: LaudoLearningRecord[]): string {
  const insights = buildLearningInsightsForAnalyze(records);
  return buildLearningContext(insights, MAX_LEARNING_INSIGHTS);
}

export function buildAdaptiveLearningForAnalyze(params: {
  records: LaudoLearningRecord[];
  effectiveness: LearningInsightEffectiveness[];
  extractions: LaudoExtractionInput[];
}): { learningInsightsApplied: LearningInsight[]; learningContext: string } {
  const insights = buildLearningInsightsForAnalyze(params.records);
  const currentExamTypes = params.extractions
    .map((x) => normalizeExamType(x.examType))
    .filter((v): v is OftalmoExamType => Boolean(v));
  const currentDomains = inferDomainsFromExamTypes(params.extractions);
  return buildAdaptiveLearningContext({
    insights,
    effectiveness: params.effectiveness,
    context: {
      currentExamTypes,
      currentDomains,
      maxInsights: MAX_LEARNING_INSIGHTS,
    },
  });
}

export function buildPromptForAnalyze(params: {
  knowledgeSection: string;
  evidenceText: string;
  orientacaoSection: string;
  qualitySection?: string;
  binocularSection?: string;
  temporalSection?: string;
  laudoSection: string;
  followUpQuestionsSection?: string;
  followUpAnswersSection?: string;
  userSection: string;
  learningSection?: string;
}): string {
  return [
    params.knowledgeSection,
    `EVIDÊNCIAS_DAS_APOSTILAS:\n${params.evidenceText}`,
    params.orientacaoSection,
    params.qualitySection,
    params.binocularSection,
    params.temporalSection,
    params.learningSection,
    params.laudoSection,
    params.followUpQuestionsSection,
    params.followUpAnswersSection,
    params.userSection,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function loadRecentLearningRecords(): Promise<LaudoLearningRecord[]> {
  try {
    const db = getFirestoreAdmin();
    const snap = await db
      .collection(LEARNING_RECORDS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(MAX_LEARNING_RECORDS)
      .get();
    return snap.docs.map((d) => d.data() as LaudoLearningRecord);
  } catch {
    return [];
  }
}

async function loadRecentLearningImpactRecords(): Promise<LearningImpactRecord[]> {
  try {
    const db = getFirestoreAdmin();
    const snap = await db
      .collection(LEARNING_IMPACT_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(MAX_LEARNING_RECORDS)
      .get();
    return snap.docs.map((d) => d.data() as LearningImpactRecord);
  } catch {
    return [];
  }
}

function buildSearchQuery(question: string, extractions: LaudoExtractionInput[]): string {
  const keys = new Set<string>();
  const typeKeywords: string[] = [];
  const typeLabels: string[] = [];

  for (const item of extractions) {
    const t = normalizeExamType(item.examType);
    if (t) {
      typeKeywords.push(ophthalmologySearchKeywords(t));
      typeLabels.push(`${getExamTypeLabel(t)} (${t})`);
    }
    const d = item.data as Record<string, unknown> | undefined;
    const mapped = d?.camposMapeados as Record<string, unknown> | undefined;
    if (!mapped || typeof mapped !== 'object') continue;
    for (const key of Object.keys(mapped)) {
      if (keys.size >= 12) break;
      keys.add(key);
    }
  }

  const parts: string[] = [];
  const q = question.trim();
  if (q) parts.push(q);

  if (typeLabels.length > 0) {
    const uniqueLabels = [...new Set(typeLabels)];
    parts.push(`Tipos de exame: ${uniqueLabels.join('; ')}.`);
  }
  if (typeKeywords.length > 0) {
    parts.push([...new Set(typeKeywords)].join(' '));
  }

  const examesKeys = Array.from(keys).join(', ');
  if (examesKeys) {
    parts.push(`Campos extraídos (legado laboratorial, se houver): ${examesKeys}`);
  }

  const structSnippets: string[] = [];
  for (const item of extractions) {
    const d = item.data as Record<string, unknown> | undefined;
    const ce = d?.camposEstruturados;
    if (!ce || typeof ce !== 'object' || Array.isArray(ce)) continue;
    for (const [k, v] of Object.entries(ce as Record<string, unknown>)) {
      if (v === null || v === undefined || v === '') continue;
      structSnippets.push(`${k} ${String(v)}`);
      if (structSnippets.length >= 24) break;
    }
    if (structSnippets.length >= 24) break;
  }
  if (structSnippets.length > 0) {
    parts.push(`Achados estruturados (oftalmologia): ${structSnippets.join('; ')}`);
  }

  return parts.filter(Boolean).join('\n');
}

export function extractionSummary(extractions: LaudoExtractionInput[]): string {
  const safe = extractions.slice(0, MAX_EXTRACTIONS).map((item) => {
    const fileName = typeof item.fileName === 'string' ? item.fileName : 'arquivo';
    const examTypeRaw = normalizeExamType(item.examType);
    const examTypeLabel = getExamTypeLabel(examTypeRaw);
    const examTypeStored = examTypeRaw ?? (typeof item.examType === 'string' ? item.examType.trim() : null);
    const eye = normalizeEye(item.eye);
    const eyeLabel = getEyeLabel(eye);

    const data = (item.data ?? {}) as Record<string, unknown>;
    const camposMapeados =
      data.camposMapeados && typeof data.camposMapeados === 'object'
        ? data.camposMapeados
        : {};
    const examesNaoMapeados = Array.isArray(data.examesNaoMapeados)
      ? data.examesNaoMapeados
      : [];
    const avisos = Array.isArray(data.avisos) ? data.avisos : [];
    const dataExame =
      typeof data.dataExame === 'string' && data.dataExame.trim()
        ? data.dataExame.trim()
        : null;

    const camposEstruturados =
      data.camposEstruturados && typeof data.camposEstruturados === 'object'
        ? data.camposEstruturados
        : undefined;
    const rawSummary =
      typeof data.rawSummary === 'string' && data.rawSummary.trim()
        ? data.rawSummary.trim()
        : null;
    const qualityFlags = Array.isArray(data.qualityFlags)
      ? data.qualityFlags.filter((x): x is string => typeof x === 'string')
      : [];
    const qualitySummary =
      typeof data.qualitySummary === 'string' && data.qualitySummary.trim()
        ? data.qualitySummary.trim()
        : null;
    const reviewStatus =
      data.reviewStatus === 'ok' ||
      data.reviewStatus === 'attention' ||
      data.reviewStatus === 'review'
        ? data.reviewStatus
        : undefined;
    const suggestedExamType =
      typeof data.suggestedExamType === 'string' && data.suggestedExamType.trim()
        ? data.suggestedExamType.trim()
        : null;
    const suggestedExamTypeLabel =
      typeof data.suggestedExamTypeLabel === 'string' && data.suggestedExamTypeLabel.trim()
        ? data.suggestedExamTypeLabel.trim()
        : null;
    const examTypeSuggestionReason =
      typeof data.examTypeSuggestionReason === 'string' && data.examTypeSuggestionReason.trim()
        ? data.examTypeSuggestionReason.trim()
        : null;
    const examTypeConfidence =
      typeof data.examTypeConfidence === 'number' && Number.isFinite(data.examTypeConfidence)
        ? data.examTypeConfidence
        : null;
    const examTypeMismatch = data.examTypeMismatch === true;
    const checklistCoverage =
      typeof data.checklistCoverage === 'number' && Number.isFinite(data.checklistCoverage)
        ? data.checklistCoverage
        : null;
    const checklistFilledCount =
      typeof data.checklistFilledCount === 'number' && Number.isFinite(data.checklistFilledCount)
        ? data.checklistFilledCount
        : null;
    const checklistTotal =
      typeof data.checklistTotal === 'number' && Number.isFinite(data.checklistTotal)
        ? data.checklistTotal
        : null;
    const checklistStatus =
      data.checklistStatus === 'good' ||
      data.checklistStatus === 'partial' ||
      data.checklistStatus === 'weak'
        ? data.checklistStatus
        : null;
    const missingKeyFields = Array.isArray(data.missingKeyFields)
      ? data.missingKeyFields.filter((x): x is string => typeof x === 'string').slice(0, 6)
      : [];

    return {
      arquivo: fileName,
      examType: examTypeRaw ?? examTypeStored,
      examTypeLabel,
      eye,
      eyeLabel,
      dataExame,
      camposMapeados,
      ...(camposEstruturados && { camposEstruturados }),
      examesNaoMapeados,
      avisos,
      ...(rawSummary && { rawSummary }),
      ...(qualityFlags.length > 0 && { qualityFlags }),
      ...(qualitySummary && { qualitySummary }),
      ...(reviewStatus && { reviewStatus }),
      ...(suggestedExamType && { suggestedExamType }),
      ...(suggestedExamTypeLabel && { suggestedExamTypeLabel }),
      ...(examTypeSuggestionReason && { examTypeSuggestionReason }),
      ...(examTypeConfidence != null && { examTypeConfidence }),
      ...(examTypeMismatch && { examTypeMismatch }),
      ...(checklistCoverage != null && { checklistCoverage }),
      ...(checklistFilledCount != null && { checklistFilledCount }),
      ...(checklistTotal != null && { checklistTotal }),
      ...(checklistStatus && { checklistStatus }),
      ...(missingKeyFields.length > 0 && { missingKeyFields }),
    };
  });
  return JSON.stringify(safe, null, 2);
}

/** Texto curto para o modelo considerar limitações da extração (não substitui DADOS_EXTRAIDOS_DO_LAUDO). */
export function buildExtractionQualityContext(extractions: LaudoExtractionInput[]): string {
  const lines: string[] = [];
  for (const item of extractions.slice(0, MAX_EXTRACTIONS)) {
    const fileName = typeof item.fileName === 'string' ? item.fileName : 'arquivo';
    const data = (item.data ?? {}) as Record<string, unknown>;
    const eye = normalizeEye(item.eye ?? data.eye);
    const reviewStatus =
      data.reviewStatus === 'ok' ||
      data.reviewStatus === 'attention' ||
      data.reviewStatus === 'review'
        ? data.reviewStatus
        : null;
    const qualitySummary =
      typeof data.qualitySummary === 'string' && data.qualitySummary.trim()
        ? data.qualitySummary.trim()
        : null;
    const qualityFlags = Array.isArray(data.qualityFlags)
      ? data.qualityFlags.filter((x): x is string => typeof x === 'string')
      : [];
    const examTypeMismatch = data.examTypeMismatch === true;
    const suggestedExamTypeLabel =
      typeof data.suggestedExamTypeLabel === 'string' && data.suggestedExamTypeLabel.trim()
        ? data.suggestedExamTypeLabel.trim()
        : null;
    const examTypeSuggestionReason =
      typeof data.examTypeSuggestionReason === 'string' && data.examTypeSuggestionReason.trim()
        ? data.examTypeSuggestionReason.trim()
        : null;
    const checklistStatus =
      data.checklistStatus === 'good' ||
      data.checklistStatus === 'partial' ||
      data.checklistStatus === 'weak'
        ? data.checklistStatus
        : null;
    const checklistFilledCount =
      typeof data.checklistFilledCount === 'number' && Number.isFinite(data.checklistFilledCount)
        ? data.checklistFilledCount
        : null;
    const checklistTotal =
      typeof data.checklistTotal === 'number' && Number.isFinite(data.checklistTotal)
        ? data.checklistTotal
        : null;
    const missingKeyFields = Array.isArray(data.missingKeyFields)
      ? data.missingKeyFields.filter((x): x is string => typeof x === 'string').slice(0, 4)
      : [];

    if (
      !reviewStatus &&
      !qualitySummary &&
      qualityFlags.length === 0 &&
      !examTypeMismatch &&
      !suggestedExamTypeLabel &&
      !checklistStatus
    ) {
      continue;
    }

    const parts: string[] = [`Arquivo: ${fileName}`];
    parts.push(`olho: ${getEyeLabel(eye)}`);
    if (reviewStatus) parts.push(`status_revisao: ${reviewStatus}`);
    if (qualitySummary) parts.push(`resumo_qualidade: ${qualitySummary}`);
    if (qualityFlags.length > 0) parts.push(`flags: ${qualityFlags.join(', ')}`);
    if (examTypeMismatch) parts.push('possivel_divergencia_tipo: true');
    if (suggestedExamTypeLabel) parts.push(`tipo_sugerido: ${suggestedExamTypeLabel}`);
    if (examTypeSuggestionReason) parts.push(`motivo_sugestao: ${examTypeSuggestionReason}`);
    if (checklistStatus) parts.push(`checklist_status: ${checklistStatus}`);
    if (checklistFilledCount != null && checklistTotal != null) {
      parts.push(`checklist_cobertura: ${checklistFilledCount}/${checklistTotal}`);
    }
    if (missingKeyFields.length > 0) {
      parts.push(`campos_chave_faltantes: ${missingKeyFields.join(', ')}`);
    }
    lines.push(`- ${parts.join(' | ')}`);
  }
  return lines.join('\n');
}

export function buildBinocularContext(extractions: LaudoExtractionInput[]): string {
  const items = extractions
    .slice(0, MAX_EXTRACTIONS)
    .map((item, idx) => {
      const examType = normalizeExamType(item.examType);
      if (!examType) return null;
      const data = (item.data ?? {}) as Record<string, unknown>;
      const ce = data.camposEstruturados;
      if (!ce || typeof ce !== 'object' || Array.isArray(ce)) return null;
      return {
        id:
          typeof item.fileName === 'string'
            ? `${item.fileName}:${examType}`
            : `${examType}:${idx}`,
        fileName: typeof item.fileName === 'string' ? item.fileName : 'arquivo',
        examType,
        eye: normalizeEye(item.eye ?? data.eye),
        camposEstruturados: ce as Record<string, string | number | null>,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const comparisons = buildBinocularComparisons(items);
  if (comparisons.length === 0) {
    return '';
  }

  return comparisons
    .map((c) => {
      const bits = [
        `Modalidade: ${c.examTypeLabel}`,
        `status: ${c.status} (${getBinocularStatusLabel(c.status)})`,
        `resumo: ${c.interEyeSummary}`,
      ];
      if (c.keyAsymmetries.length > 0) {
        bits.push(`assimetrias: ${c.keyAsymmetries.slice(0, 3).join(' ')}`);
      }
      if (c.limitations.length > 0) {
        bits.push(`limitações: ${c.limitations.join(' | ')}`);
      }
      return `- ${bits.join(' | ')}`;
    })
    .join('\n');
}

export function buildTemporalContext(extractions: LaudoExtractionInput[]): string {
  const items = extractions
    .slice(0, MAX_EXTRACTIONS)
    .map((item, idx) => {
      const examType = normalizeExamType(item.examType);
      if (!examType) return null;
      const data = (item.data ?? {}) as Record<string, unknown>;
      const ce = data.camposEstruturados;
      if (!ce || typeof ce !== 'object' || Array.isArray(ce)) return null;
      const dataExame =
        typeof data.dataExame === 'string' && data.dataExame.trim() ? data.dataExame.trim() : null;
      return {
        id:
          typeof item.fileName === 'string'
            ? `${item.fileName}:${examType}:${idx}`
            : `${examType}:${idx}`,
        fileName: typeof item.fileName === 'string' ? item.fileName : 'arquivo',
        examType,
        eye: normalizeEye(item.eye ?? data.eye),
        dataExame,
        camposEstruturados: ce as Record<string, string | number | null>,
        sourceOrder: idx,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const comparisons = buildTemporalComparisons(items);
  if (comparisons.length === 0) return '';

  return comparisons
    .map((c) => {
      const bits = [
        `Modalidade: ${c.examTypeLabel}`,
        `Olho: ${c.eyeLabel}`,
        `datas: ${c.previousDate ?? 'sem data'} -> ${c.currentDate ?? 'sem data'}`,
        `status: ${c.status} (${getTemporalStatusLabel(c.status)})`,
        `resumo: ${c.progressionSummary}`,
      ];
      if (c.keyTemporalChanges.length > 0) {
        bits.push(`mudanças: ${c.keyTemporalChanges.slice(0, 3).join(' ')}`);
      }
      if (c.temporalLimitations.length > 0) {
        bits.push(`limitações: ${c.temporalLimitations.join(' | ')}`);
      }
      return `- ${bits.join(' | ')}`;
    })
    .join('\n');
}

export function buildIntegratedSummaryForAnalyze(params: {
  analysisAnswer: string;
  initialAnswer?: string;
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  refinementDelta?: RefinementDelta | null;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): IntegratedCaseSummary {
  return buildIntegratedCaseSummary(params);
}

export function buildClinicalPriorityForAnalyze(params: {
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  integratedCaseSummary?: IntegratedCaseSummary | null;
  refinementDelta?: RefinementDelta | null;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): ClinicalPriorityAssessment {
  return buildClinicalPriorityAssessment(params);
}

export function buildClinicalPriorityExplainabilityForAnalyze(params: {
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  integratedCaseSummary?: IntegratedCaseSummary | null;
  refinementDelta?: RefinementDelta | null;
  followUpAnswers?: ClinicalFollowUpAnswer[];
  clinicalPriorityAssessment?: ClinicalPriorityAssessment | null;
}): ClinicalPriorityExplainability {
  return buildClinicalPriorityExplainability(params);
}

export function buildClinicalFollowUpActionsForAnalyze(params: {
  clinicalPriorityAssessment?: ClinicalPriorityAssessment | null;
  qualityContext?: string;
  temporalContext?: string;
  binocularContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
  extractions?: LaudoExtractionInput[];
}): ClinicalFollowUpActions {
  return buildClinicalFollowUpActions(params);
}

export function buildGlaucomaCorrelationForAnalyze(params: {
  extractions?: LaudoExtractionInput[];
  qualityContext?: string;
  temporalContext?: string;
  binocularContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): GlaucomaCorrelation {
  return buildGlaucomaCorrelation(params);
}

export function buildRetinaCorrelationForAnalyze(params: {
  extractions?: LaudoExtractionInput[];
  qualityContext?: string;
  temporalContext?: string;
  binocularContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): RetinaCorrelation {
  return buildRetinaCorrelation(params);
}

export function buildCorneaCorrelationForAnalyze(params: {
  extractions?: LaudoExtractionInput[];
  qualityContext?: string;
  temporalContext?: string;
  binocularContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): CorneaCorrelation {
  return buildCorneaCorrelation(params);
}

export function buildMultiDomainCorrelationForAnalyze(params: {
  glaucomaCorrelation?: GlaucomaCorrelation | null;
  retinaCorrelation?: RetinaCorrelation | null;
  corneaCorrelation?: CorneaCorrelation | null;
}): MultiDomainCorrelation {
  return buildMultiDomainCorrelation(params);
}

export function buildDomainLongitudinalCorrelationForAnalyze(params: {
  extractions?: LaudoExtractionInput[];
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): DomainLongitudinalCorrelation {
  return buildDomainLongitudinalCorrelation(params);
}

async function callGemini(params: {
  creds: GoogleCreds;
  accessToken: string;
  prompt: string;
  tryWebGrounding: boolean;
}): Promise<{ answer: string; usedWebGrounding: boolean }> {
  const { creds, accessToken, prompt, tryWebGrounding } = params;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const geminiModel = resolveGeminiModelId();
  const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

  const basePayload: Record<string, unknown> = {
    systemInstruction: { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 1536,
      temperature: 0.25,
    },
  };

  const attemptPayloads: Array<{ payload: Record<string, unknown>; grounded: boolean }> = [];
  if (tryWebGrounding) {
    attemptPayloads.push({
      payload: {
        ...basePayload,
        tools: [{ googleSearch: {} }],
      },
      grounded: true,
    });
  }
  attemptPayloads.push({ payload: basePayload, grounded: false });

  let lastError = '';
  for (const attempt of attemptPayloads) {
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt.payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      lastError = data?.error?.message || res.statusText || 'Erro no Gemini';
      continue;
    }

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let answer = '';
    for (const p of parts) {
      if (typeof p.text === 'string') answer += p.text;
    }
    const final = answer.trim();
    if (final) return { answer: final, usedWebGrounding: attempt.grounded };
    lastError = 'Resposta vazia do Gemini.';
  }

  throw new Error(lastError || 'Falha ao gerar resposta do Gemini.');
}

export async function POST(request: NextRequest) {
  try {
    const creds = getCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Vertex AI não configurado.' },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      question?: string;
      extractions?: LaudoExtractionInput[];
      followUpQuestions?: ClinicalFollowUpQuestion[];
      followUpAnswers?: ClinicalFollowUpAnswer[];
      initialAnswer?: string;
    };

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const extractions: LaudoExtractionInput[] = Array.isArray(body.extractions)
      ? body.extractions.slice(0, MAX_EXTRACTIONS)
      : [];
    const followUpQuestionsInput: ClinicalFollowUpQuestion[] = Array.isArray(body.followUpQuestions)
      ? body.followUpQuestions
      : [];
    const followUpAnswers: ClinicalFollowUpAnswer[] = Array.isArray(body.followUpAnswers)
      ? body.followUpAnswers
      : [];
    const initialAnswer =
      typeof body.initialAnswer === 'string' && body.initialAnswer.trim()
        ? body.initialAnswer.trim()
        : '';

    if (!question && extractions.length === 0) {
      return NextResponse.json(
        { error: 'Envie uma pergunta ou ao menos um laudo extraído.' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken(creds);
    const dataStoreId = process.env.DISCOVERY_DATA_STORE_ID;
    const engineId = process.env.DISCOVERY_ENGINE_ID;

    let sources: Source[] = [];
    if (dataStoreId || engineId) {
      const servingPath = engineId
        ? `engines/${engineId}/servingConfigs/default_search`
        : `dataStores/${dataStoreId}/servingConfigs/default_search`;
      const searchUrl = `https://discoveryengine.googleapis.com/v1/projects/${creds.projectId}/locations/global/collections/default_collection/${servingPath}:search`;
      const searchPayload = {
        query: buildSearchQuery(
          question || 'Interpretação de laudo oftalmológico exame imagem',
          extractions
        ),
        pageSize: 10,
        contentSearchSpec: {
          snippetSpec: { returnSnippet: true },
          extractiveContentSpec: {
            maxExtractiveSegmentCount: 8,
          },
        },
      };

      const searchRes = await fetch(searchUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
      });
      if (searchRes.ok) {
        const searchData = (await searchRes.json().catch(() => ({}))) as Record<string, unknown>;
        sources = extractSourcesFromSearchResponse(searchData);
      }
    }

    const evidenceText = sources.length
      ? sources.map((s) => `[${s.id}] ${s.title}\n${s.snippet}`).join('\n\n')
      : 'Sem evidências relevantes recuperadas nas apostilas indexadas.';

    const knowledge = await loadKnowledge({
      surface: 'oftreview',
      maxTotalChars: CHAT_KNOWLEDGE_MAX_CHARS,
    });
    const knowledgeText = buildKnowledgeBlock(knowledge).trim();
    const knowledgeSection = knowledgeText
      ? `CONHECIMENTO_BASE:\n${knowledgeText}`
      : 'CONHECIMENTO_BASE: indisponível.';

    const orientacaoSection = `ORIENTACAO_POR_TIPO_DE_EXAME:\n${buildAggregatedExamTypeGuidance(extractions)}`;
    const qualityCtx = buildExtractionQualityContext(extractions);
    const binocularCtx = buildBinocularContext(extractions);
    const temporalCtx = buildTemporalContext(extractions);
    const answeredFollowUp = buildAnsweredFollowUpContext(
      followUpQuestionsInput,
      followUpAnswers
    );
    const hasRefinementAnswers = hasMeaningfulFollowUpAnswers(followUpAnswers);
    const qualitySection = qualityCtx.trim()
      ? `CONTEXTO_QUALIDADE_EXTRAÇÃO:\n${qualityCtx}`
      : '';
    const binocularSection = binocularCtx.trim()
      ? `CORRELAÇÃO_BINOCULAR_ENTRE_OLHOS:\n${binocularCtx}`
      : '';
    const temporalSection = temporalCtx.trim()
      ? `COMPARAÇÃO_TEMPORAL_ENTRE_EXAMES:\n${temporalCtx}`
      : '';
    const laudoSection = `DADOS_EXTRAIDOS_DO_LAUDO:\n${extractionSummary(extractions)}`;
    const userSection = question
      ? `PERGUNTA_DO_USUARIO:\n${question}`
      : 'PERGUNTA_DO_USUARIO:\nGere uma interpretação assistida inicial com base nos dados e no tipo de exame.';
    const followUpQuestionsSection =
      followUpQuestionsInput.length > 0
        ? `PERGUNTAS_CLÍNICAS_DE_REFINAMENTO:\n${followUpQuestionsInput
            .slice(0, 12)
            .map((q) => `- ${q.question}`)
            .join('\n')}`
        : '';
    const followUpAnswersSection =
      hasRefinementAnswers && answeredFollowUp.answeredLines.length > 0
        ? `RESPOSTAS_CLÍNICAS_COMPLEMENTARES:\n${answeredFollowUp.answeredLines.join('\n')}`
        : '';

    const learningRecords = await loadRecentLearningRecords();
    const learningImpactRecords = await loadRecentLearningImpactRecords();
    const learningEffectiveness = aggregateLearningImpact(learningImpactRecords);
    const { learningInsightsApplied, learningContext } = buildAdaptiveLearningForAnalyze({
      records: learningRecords,
      effectiveness: learningEffectiveness,
      extractions,
    });
    const learningSection = learningContext ? `LEARNING_CONTEXT:\n${learningContext}` : '';
    const prompt = buildPromptForAnalyze({
      knowledgeSection,
      evidenceText,
      orientacaoSection,
      qualitySection,
      binocularSection,
      temporalSection,
      learningSection,
      laudoSection,
      followUpQuestionsSection,
      followUpAnswersSection,
      userSection,
    });
    const tryWebGrounding = process.env.LAUDO_EXAMES_ENABLE_WEB_GROUNDING === '1';
    const result = await callGemini({
      creds,
      accessToken,
      prompt,
      tryWebGrounding,
    });
    const followUpQuestions = buildFollowUpQuestions(extractions);
    const refinementDelta =
      hasRefinementAnswers && initialAnswer
        ? buildRefinementDelta({
            initialAnswer,
            refinedAnswer: result.answer,
            answersUsed: followUpAnswers.filter((a) => a.answer && a.answer.trim()),
          })
        : null;
    const integratedCaseSummary = buildIntegratedSummaryForAnalyze({
      analysisAnswer: result.answer,
      initialAnswer,
      qualityContext: qualityCtx,
      binocularContext: binocularCtx,
      temporalContext: temporalCtx,
      refinementDelta,
      followUpAnswers,
    });
    const clinicalPriorityAssessment = buildClinicalPriorityForAnalyze({
      qualityContext: qualityCtx,
      binocularContext: binocularCtx,
      temporalContext: temporalCtx,
      integratedCaseSummary,
      refinementDelta,
      followUpAnswers,
    });
    const clinicalPriorityExplainability = buildClinicalPriorityExplainabilityForAnalyze({
      qualityContext: qualityCtx,
      binocularContext: binocularCtx,
      temporalContext: temporalCtx,
      integratedCaseSummary,
      refinementDelta,
      followUpAnswers,
      clinicalPriorityAssessment,
    });
    const clinicalFollowUpActions = buildClinicalFollowUpActionsForAnalyze({
      clinicalPriorityAssessment,
      qualityContext: qualityCtx,
      temporalContext: temporalCtx,
      binocularContext: binocularCtx,
      followUpAnswers,
      extractions,
    });
    const glaucomaCorrelation = buildGlaucomaCorrelationForAnalyze({
      extractions,
      qualityContext: qualityCtx,
      temporalContext: temporalCtx,
      binocularContext: binocularCtx,
      followUpAnswers,
    });
    const retinaCorrelation = buildRetinaCorrelationForAnalyze({
      extractions,
      qualityContext: qualityCtx,
      temporalContext: temporalCtx,
      binocularContext: binocularCtx,
      followUpAnswers,
    });
    const corneaCorrelation = buildCorneaCorrelationForAnalyze({
      extractions,
      qualityContext: qualityCtx,
      temporalContext: temporalCtx,
      binocularContext: binocularCtx,
      followUpAnswers,
    });
    const multiDomainCorrelation = buildMultiDomainCorrelationForAnalyze({
      glaucomaCorrelation,
      retinaCorrelation,
      corneaCorrelation,
    });
    const domainLongitudinalCorrelation = buildDomainLongitudinalCorrelationForAnalyze({
      extractions,
      followUpAnswers,
    });
    const response: AnalyzeResponse = {
      answer: result.answer,
      sources,
      usedWebGrounding: result.usedWebGrounding,
      followUpQuestions,
      ...(hasRefinementAnswers && {
        refinementUsedAnswersCount: answeredFollowUp.answeredCount,
        refinementUsedQuestions: answeredFollowUp.answeredLines.map((line) =>
          line.split('\n')[0].replace(/^- /, '').trim()
        ),
      }),
      ...(hasMeaningfulRefinementDelta(refinementDelta) && { refinementDelta }),
      ...(hasMeaningfulIntegratedSummary(integratedCaseSummary) && { integratedCaseSummary }),
      ...(hasMeaningfulClinicalPriority(clinicalPriorityAssessment) && {
        clinicalPriorityAssessment,
      }),
      ...(hasMeaningfulClinicalPriorityExplainability(clinicalPriorityExplainability) && {
        clinicalPriorityExplainability,
      }),
      ...(hasMeaningfulClinicalFollowUpActions(clinicalFollowUpActions) && {
        clinicalFollowUpActions,
      }),
      ...(hasMeaningfulGlaucomaCorrelation(glaucomaCorrelation) && {
        glaucomaCorrelation,
      }),
      ...(hasMeaningfulRetinaCorrelation(retinaCorrelation) && {
        retinaCorrelation,
      }),
      ...(hasMeaningfulCorneaCorrelation(corneaCorrelation) && {
        corneaCorrelation,
      }),
      ...(hasMeaningfulMultiDomainCorrelation(multiDomainCorrelation) && {
        multiDomainCorrelation,
      }),
      ...(hasMeaningfulDomainLongitudinalCorrelation(domainLongitudinalCorrelation) && {
        domainLongitudinalCorrelation,
      }),
      ...(learningInsightsApplied.length > 0 && { learningInsightsApplied }),
    };

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[laudo-exames/analyze] erro:', msg, err);
    return NextResponse.json(
      { error: 'Falha ao gerar laudo com IA. Tente novamente.' },
      { status: 500 }
    );
  }
}
