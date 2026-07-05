/**
 * Tipos e constantes do Banco de Questões Oftpay (Oftreview).
 * Questões devem referenciar exclusivamente PDFs oficiais em
 * gs://oftware/OFTREVIEW 2023/APOSTILAS/*.pdf
 */

/** E-mail autorizado a acessar a área do criador (revisão futura). */
export const QUESTOES_ADMIN_EMAIL = 'ricpmota.med@gmail.com';

/** Prefixo GCS das apostilas oficiais do Oftreview. */
export const OFTREVIEW_APOSTILAS_GCS_PREFIX = 'gs://oftware/OFTREVIEW 2023/APOSTILAS/';

/** Glob completo dos PDFs oficiais (compatível com a UI da etapa 1). */
export const OFTREVIEW_APOSTILAS_GCS_URI = `${OFTREVIEW_APOSTILAS_GCS_PREFIX}*.pdf`;

export type QuestaoStatus = 'rascunho' | 'revisao' | 'publicado';

export type QuestaoDificuldade = 'facil' | 'medio' | 'dificil';

export type AlternativaLetra = 'A' | 'B' | 'C' | 'D' | 'E';

export interface OftpayQuestaoAlternativa {
  letra: AlternativaLetra;
  texto: string;
  correta: boolean;
}

export interface OftpayQuestaoFonte {
  apostilaTitulo: string;
  pagina?: number | null;
  trechoBase?: string;
  uri?: string;
  sourceType: 'pdf_bucket';
  bucketPath?: string;
}

export interface OftpayQuestao {
  id?: string;
  courseId: 'oftreview';
  /** Referência legada; use getQuestaoCapituloDisplay() na UI. */
  tema: string;
  subtema?: string;
  /** Vínculo com oftreviewKnowledgeMap (Mapa das Apostilas). */
  knowledgeMapId?: string;
  /** Capítulo do mapa; referência pedagógica principal quando presente. */
  capituloTitulo?: string;
  enunciado: string;
  alternativas: OftpayQuestaoAlternativa[];
  explicacao: string;
  dificuldade: QuestaoDificuldade;
  status: QuestaoStatus;
  fonte: OftpayQuestaoFonte;
  /** Vínculo futuro com oftreviewSources (etapa 5 — ainda não utilizado). */
  sourceId?: string;
  /** Tópico mapeado (oftreviewApostilaTopics). */
  apostilaTopicId?: string;
  /** Assunto planejado coberto por esta questão. */
  plannedSubjectId?: string;
  plannedSubjectTitle?: string;
  criadoPor: string;
  createdAt?: any;
  updatedAt?: any;
}

/** Abas da página /oftpay/questoes. */
export type OftpayQuestoesArea = 'aluno' | 'criador';

/** Capítulo/tema para exibição (prioriza capituloTitulo do mapa). */
export function getQuestaoCapituloDisplay(
  questao: Pick<OftpayQuestao, 'capituloTitulo' | 'tema'>
): string {
  const cap = (questao.capituloTitulo ?? '').trim();
  return cap || (questao.tema ?? '').trim();
}

export type QuestaoPublishCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  optional?: boolean;
};

/** Checklist visual antes de publicar (revisão editorial). */
export function getQuestaoPublishChecklist(questao: Partial<OftpayQuestao>): {
  items: QuestaoPublishCheckItem[];
  canPublish: boolean;
} {
  const enunciado = (questao.enunciado ?? '').trim();
  const explicacao = (questao.explicacao ?? '').trim();
  const alts = questao.alternativas ?? [];
  const corretas = alts.filter((a) => a.correta);
  const altCount = alts.length;
  const apostila = (questao.fonte?.apostilaTitulo ?? '').trim();
  const hasSourceId = Boolean(questao.sourceId?.trim());

  const items: QuestaoPublishCheckItem[] = [
    { id: 'enunciado', label: 'Enunciado presente', ok: Boolean(enunciado) },
    {
      id: 'alternativas',
      label: '4 ou 5 alternativas',
      ok: altCount >= 4 && altCount <= 5,
    },
    {
      id: 'correta',
      label: 'Exatamente 1 alternativa correta',
      ok: corretas.length === 1,
    },
    { id: 'explicacao', label: 'Explicação presente', ok: Boolean(explicacao) },
    {
      id: 'fonte',
      label: 'Fonte oficial presente (apostila)',
      ok: Boolean(apostila),
    },
    {
      id: 'sourceId',
      label: 'Questão vinculada a trecho oficial (sourceId)',
      ok: hasSourceId ? Boolean(questao.sourceId?.trim()) : true,
      optional: !hasSourceId,
    },
  ];

  const required = items.filter((i) => !i.optional);
  const canPublish = required.every((i) => i.ok) && validateOftpayQuestaoForPublish(questao);

  return { items, canPublish };
}

function validateOftpayQuestaoForPublish(questao: Partial<OftpayQuestao>): boolean {
  const alts = questao.alternativas ?? [];
  if (!(questao.enunciado ?? '').trim()) return false;
  if (!(questao.explicacao ?? '').trim()) return false;
  if (!(questao.fonte?.apostilaTitulo ?? '').trim()) return false;
  if (alts.length < 4 || alts.length > 5) return false;
  if (alts.filter((a) => a.correta).length !== 1) return false;
  if (alts.some((a) => !(a.texto ?? '').trim())) return false;
  return true;
}
