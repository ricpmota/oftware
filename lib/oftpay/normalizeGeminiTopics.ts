export interface GeminiTopicJson {
  topicTitle?: string;
  topicSummary?: string;
  pages?: number[];
  keywords?: string[];
  estimatedQuestionCapacity?: number;
  questionSubjects?: string[];
}

function parseCapacity(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function readTopicTitle(t: Record<string, unknown>): string {
  return String(
    t.topicTitle ??
      t.topic_title ??
      t.titulo ??
      t.title ??
      t.nome ??
      t.topico ??
      t.name ??
      ''
  ).trim();
}

/** Normaliza payload JSON da IA para lista de tópicos (tolerante a nomes de campo). */
export function normalizeTopicsFromPayload(parsed: unknown): GeminiTopicJson[] {
  if (!parsed || typeof parsed !== 'object') return [];

  const root = parsed as Record<string, unknown>;
  let items: unknown[] = [];

  if (Array.isArray(root.topics)) {
    items = root.topics;
  } else if (Array.isArray(root.topicos)) {
    items = root.topicos;
  } else if (Array.isArray(root.data)) {
    items = root.data;
  } else if (Array.isArray(parsed)) {
    items = parsed;
  } else if (root.topic && typeof root.topic === 'object') {
    items = [root.topic];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const t = item as Record<string, unknown>;
      const topicTitle = readTopicTitle(t);
      if (!topicTitle) return null;

      const pagesRaw = t.pages ?? t.paginas ?? t.pageNumbers ?? t.page_numbers;
      const pages = Array.isArray(pagesRaw)
        ? pagesRaw
            .map((p) => (typeof p === 'number' ? p : parseInt(String(p), 10)))
            .filter((n) => Number.isFinite(n) && n > 0)
        : undefined;

      const keywordsRaw = t.keywords ?? t.palavrasChave ?? t.palavras_chave;
      const keywords = Array.isArray(keywordsRaw)
        ? keywordsRaw.map((k) => String(k).trim()).filter(Boolean)
        : undefined;

      const subjectsRaw =
        t.questionSubjects ??
        t.question_subjects ??
        t.assuntos ??
        t.plannedSubjects ??
        t.subjects ??
        t.angulos;
      const questionSubjects = Array.isArray(subjectsRaw)
        ? subjectsRaw.map((s) => String(s).trim()).filter(Boolean)
        : undefined;

      return {
        topicTitle,
        topicSummary:
          String(t.topicSummary ?? t.topic_summary ?? t.resumo ?? t.summary ?? '').trim() ||
          undefined,
        pages,
        keywords,
        questionSubjects,
        estimatedQuestionCapacity: parseCapacity(
          t.estimatedQuestionCapacity ?? t.estimated_question_capacity ?? t.capacidade ?? t.capacity
        ),
      } satisfies GeminiTopicJson;
    })
    .filter(Boolean) as GeminiTopicJson[];
}
