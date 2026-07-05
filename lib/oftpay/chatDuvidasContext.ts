import type { Firestore } from 'firebase-admin/firestore';
import {
  countAvailableForTopicAndDifficulty,
  formatSimuladoApostilaLabel,
  type OftpaySimuladoSelection,
} from '@/types/oftpaySimulados';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import { OFTREVIEW_APOSTILA_TOPICS_COLLECTION } from '@/types/oftreviewApostilaTopic';
import type { ChatDuvidasImageAnalysis } from '@/lib/oftpay/chatDuvidasImage';
import { buildPublishedTopicIndex, searchPublishedTopics } from '@/lib/oftpay/simuladoTopicSearch';

export interface MappedTopicRow {
  id: string;
  apostilaTitulo: string;
  topicTitle: string;
  topicSummary?: string;
  keywords?: string[];
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function scoreMappedTopic(topic: MappedTopicRow, rawQuery: string): number {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const topicNorm = normalizeSearchText(topic.topicTitle);
  const apNorm = normalizeSearchText(formatSimuladoApostilaLabel(topic.apostilaTitulo));
  const fullNorm = normalizeSearchText(`${topic.apostilaTitulo} ${topic.topicTitle}`);
  const summaryNorm = normalizeSearchText(topic.topicSummary ?? '');
  const keywordsNorm = (topic.keywords ?? []).map(normalizeSearchText).join(' ');

  if (topicNorm === q || fullNorm.includes(q) && q.length > 4) return 100;
  if (topicNorm.startsWith(q)) return 88;
  if (topicNorm.includes(q)) return 72;
  if (summaryNorm.includes(q)) return 60;
  if (keywordsNorm.includes(q)) return 55;
  if (apNorm.includes(q)) return 45;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => fullNorm.includes(w) || summaryNorm.includes(w))) {
    return 50;
  }

  let hits = 0;
  for (const word of words) {
    if (
      topicNorm.includes(word) ||
      summaryNorm.includes(word) ||
      keywordsNorm.includes(word) ||
      apNorm.includes(word)
    ) {
      hits += 1;
    }
  }
  if (hits > 0) return 28 + hits * 10;

  return 0;
}

export async function loadMappedTopics(db: Firestore): Promise<MappedTopicRow[]> {
  const snap = await db.collection(OFTREVIEW_APOSTILA_TOPICS_COLLECTION).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const topicTitle = String(data.topicTitle ?? '').trim();
      const apostilaTitulo = String(data.apostilaTitulo ?? '').trim();
      if (!topicTitle || !apostilaTitulo) return null;
      const keywords = Array.isArray(data.keywords)
        ? data.keywords.map((k) => String(k).trim()).filter(Boolean)
        : undefined;
      return {
        id: doc.id,
        apostilaTitulo,
        topicTitle,
        topicSummary: String(data.topicSummary ?? '').trim() || undefined,
        keywords,
      } satisfies MappedTopicRow;
    })
    .filter(Boolean) as MappedTopicRow[];
}

export function rankMappedTopics(query: string, topics: MappedTopicRow[], limit = 8): MappedTopicRow[] {
  return topics
    .map((topic) => ({ topic, score: scoreMappedTopic(topic, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.topic);
}

export function buildChatDuvidasSearchQuery(
  question: string,
  imageAnalysis?: ChatDuvidasImageAnalysis | null
): string {
  const parts = [question.trim()];
  if (imageAnalysis) {
    if (imageAnalysis.description) parts.push(imageAnalysis.description);
    if (imageAnalysis.findings?.length) parts.push(imageAnalysis.findings.join(' '));
    if (imageAnalysis.searchTerms?.length) parts.push(imageAnalysis.searchTerms.join(' '));
  }
  return parts.filter(Boolean).join(' ').trim();
}

export function buildChatDuvidasContextPrompt(
  searchQuery: string,
  mappedTopics: MappedTopicRow[],
  publishedIndex: ReturnType<typeof buildPublishedTopicIndex>,
  imageAnalysis?: ChatDuvidasImageAnalysis | null
): string {
  const rankedMapped = rankMappedTopics(searchQuery, mappedTopics, 6);
  const rankedPublished = searchPublishedTopics(publishedIndex, searchQuery, { limit: 8 });

  const imageBlock = imageAnalysis
    ? `
INTERPRETAÇÃO DA IMAGEM (visão computacional — use para correlacionar com os tópicos abaixo):
Tipo/contexto: ${imageAnalysis.examOrContext ?? 'não especificado'}
Descrição: ${imageAnalysis.description}
Achados observados: ${(imageAnalysis.findings ?? []).join('; ') || '—'}
Termos para busca: ${(imageAnalysis.searchTerms ?? []).join(', ') || '—'}
`
    : '';

  const mappedBlock =
    rankedMapped.length > 0
      ? rankedMapped
          .map((t, i) => {
            const pub = rankedPublished.find(
              (p) =>
                normalizeSearchText(p.topicLabel) === normalizeSearchText(t.topicTitle) &&
                normalizeSearchText(p.subjectLabel) ===
                  normalizeSearchText(formatSimuladoApostilaLabel(t.apostilaTitulo))
            );
            const counts = pub
              ? `questões publicadas: fácil ${pub.facil}, médio ${pub.medio}, difícil ${pub.dificil}`
              : 'sem questões publicadas vinculadas';
            return `${i + 1}. Apostila: ${formatSimuladoApostilaLabel(t.apostilaTitulo)}
   Tópico: ${t.topicTitle}
   Resumo: ${t.topicSummary ?? '—'}
   Palavras-chave: ${(t.keywords ?? []).join(', ') || '—'}
   ${counts}`;
          })
          .join('\n\n')
      : 'Nenhum tópico mapeado encontrado com correspondência direta.';

  const publishedOnlyBlock =
    rankedPublished.length > 0
      ? rankedPublished
          .map(
            (p, i) =>
              `${i + 1}. ${p.fullLabel} — fácil ${p.facil}, médio ${p.medio}, difícil ${p.dificil} (total ${p.totalPublicadas})`
          )
          .join('\n')
      : 'Nenhum tópico com questões publicadas encontrado.';

  return `PERGUNTA DO ALUNO:
${searchQuery.trim()}
${imageBlock}
TÓPICOS MAPEADOS RELEVANTES (conteúdo oficial das apostilas):
${mappedBlock}

TÓPICOS COM QUESTÕES NO BANCO:
${publishedOnlyBlock}`;
}

export interface ChatDuvidasSimuladoSuggestion {
  title: string;
  selections: OftpaySimuladoSelection[];
}

export function buildFallbackSimuladoSuggestion(
  question: string,
  publicadas: OftpayQuestaoDoc[],
  mappedTopics: MappedTopicRow[]
): ChatDuvidasSimuladoSuggestion | null {
  const index = buildPublishedTopicIndex(publicadas);
  const matches = searchPublishedTopics(index, question, { limit: 3 });
  if (matches.length === 0) {
    const mapped = rankMappedTopics(question, mappedTopics, 1)[0];
    if (!mapped) return null;
    const fallbackMatch = index.find(
      (p) =>
        normalizeSearchText(p.topicLabel) === normalizeSearchText(mapped.topicTitle) &&
        normalizeSearchText(p.subjectLabel) ===
          normalizeSearchText(formatSimuladoApostilaLabel(mapped.apostilaTitulo))
    );
    if (!fallbackMatch) return null;
    matches.push(fallbackMatch);
  }

  const selections: OftpaySimuladoSelection[] = matches.map((topic) => {
    const dificuldade: QuestaoDificuldade =
      topic.medio > 0 ? 'medio' : topic.facil > 0 ? 'facil' : 'dificil';
    const disponiveis = countAvailableForTopicAndDifficulty(
      publicadas,
      topic.topicLabel,
      dificuldade,
      topic.subjectLabel
    );
    return {
      apostilaTitulo: topic.subjectLabel,
      capituloTitulo: topic.topicLabel,
      dificuldade,
      quantidade: Math.max(1, Math.min(disponiveis, Math.max(5, Math.ceil(disponiveis * 0.4)))),
    };
  });

  const title =
    matches.length === 1
      ? `Simulado — ${matches[0].fullLabel}`
      : `Simulado — ${question.trim().slice(0, 48)}`;

  return { title, selections };
}

export function sanitizeSimuladoSuggestion(
  raw: unknown,
  publicadas: OftpayQuestaoDoc[]
): ChatDuvidasSimuladoSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const title = String(root.title ?? '').trim();
  const selectionsRaw = root.selections;
  if (!title || !Array.isArray(selectionsRaw)) return null;

  const selections: OftpaySimuladoSelection[] = [];
  for (const item of selectionsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const dificuldade = row.dificuldade;
    if (dificuldade !== 'facil' && dificuldade !== 'medio' && dificuldade !== 'dificil') continue;

    const quantidade =
      typeof row.quantidade === 'number'
        ? row.quantidade
        : parseInt(String(row.quantidade ?? ''), 10);
    if (!Number.isFinite(quantidade) || quantidade < 1) continue;

    const apostilaTitulo = String(row.apostilaTitulo ?? '').trim();
    const capituloTitulo = String(row.capituloTitulo ?? row.tema ?? '').trim();
    if (!apostilaTitulo && !capituloTitulo) continue;

    const cap = capituloTitulo || undefined;
    const disponiveis = cap
      ? countAvailableForTopicAndDifficulty(publicadas, cap, dificuldade, apostilaTitulo || undefined)
      : 0;
    if (disponiveis <= 0) continue;

    selections.push({
      ...(apostilaTitulo ? { apostilaTitulo } : {}),
      ...(cap ? { capituloTitulo: cap } : {}),
      dificuldade,
      quantidade: Math.min(quantidade, disponiveis),
    });
  }

  if (selections.length === 0) return null;
  return { title, selections };
}

/** Carrega questões publicadas no servidor (admin). */
export async function loadPublishedQuestoesAdmin(db: Firestore): Promise<OftpayQuestaoDoc[]> {
  const snap = await db.collection('oftpayQuestoes').where('status', '==', 'publicado').get();
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const fonte = (data.fonte ?? {}) as Record<string, unknown>;
    return {
      id: doc.id,
      courseId: 'oftreview' as const,
      tema: String(data.tema ?? ''),
      capituloTitulo: data.capituloTitulo != null ? String(data.capituloTitulo) : undefined,
      subtema: data.subtema != null ? String(data.subtema) : undefined,
      enunciado: String(data.enunciado ?? ''),
      alternativas: Array.isArray(data.alternativas) ? (data.alternativas as OftpayQuestaoDoc['alternativas']) : [],
      explicacao: String(data.explicacao ?? ''),
      dificuldade:
        data.dificuldade === 'facil' || data.dificuldade === 'medio' || data.dificuldade === 'dificil'
          ? data.dificuldade
          : 'medio',
      status: 'publicado' as const,
      fonte: {
        apostilaTitulo: String(fonte.apostilaTitulo ?? ''),
        sourceType: 'pdf_bucket' as const,
        ...(fonte.pagina != null ? { pagina: Number(fonte.pagina) } : {}),
        ...(fonte.trechoBase != null ? { trechoBase: String(fonte.trechoBase) } : {}),
      },
      criadoPor: String(data.criadoPor ?? ''),
    };
  });
}

export function summarizeTopicsForAnswer(topics: MappedTopicRow[]): string {
  if (topics.length === 0) return '';
  return topics
    .slice(0, 3)
    .map((t) => `${formatSimuladoApostilaLabel(t.apostilaTitulo)} — ${t.topicTitle}`)
    .join('; ');
}
