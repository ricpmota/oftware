import {
  buildBinocularComparisons,
  normalizeEye,
  type BinocularComparison,
} from '@/lib/oftpay/laudoOftalmoEye';
import type { OftalmoExamType } from '@/lib/oftpay/laudoOftalmoExtraction';

export type ClinicalQuestionPriority = 'high' | 'medium' | 'low';

export type ClinicalFollowUpQuestion = {
  id: string;
  question: string;
  reason: string;
  priority: ClinicalQuestionPriority;
  examType?: OftalmoExamType;
};

export type ClinicalFollowUpAnswer = {
  questionId: string;
  question?: string;
  answer: string;
};

export type ClinicalQuestionInput = {
  fileName?: string;
  examType?: string;
  eye?: string;
  data?: unknown;
};

export function hasMeaningfulFollowUpAnswers(answers: ClinicalFollowUpAnswer[] | undefined): boolean {
  if (!Array.isArray(answers)) return false;
  return answers.some((a) => typeof a.answer === 'string' && a.answer.trim().length > 0);
}

export function buildAnsweredFollowUpContext(
  questions: ClinicalFollowUpQuestion[] | undefined,
  answers: ClinicalFollowUpAnswer[] | undefined
): { answeredCount: number; answeredLines: string[] } {
  const qMap = new Map<string, ClinicalFollowUpQuestion>();
  for (const q of questions ?? []) qMap.set(q.id, q);

  const lines: string[] = [];
  for (const ans of answers ?? []) {
    const text = typeof ans.answer === 'string' ? ans.answer.trim() : '';
    if (!text) continue;
    const refQ = qMap.get(ans.questionId);
    const qText =
      (refQ?.question && refQ.question.trim()) ||
      (typeof ans.question === 'string' ? ans.question.trim() : '') ||
      'Pergunta clínica';
    lines.push(`- ${qText}\n  Resposta: ${text}`);
  }

  return { answeredCount: lines.length, answeredLines: lines };
}

type Candidate = ClinicalFollowUpQuestion & {
  score: number;
  tags: string[];
};

const BASE_QUESTIONS_BY_EXAM_TYPE: Record<
  OftalmoExamType,
  Array<{ question: string; reason: string; priority: ClinicalQuestionPriority; tags?: string[] }>
> = {
  paquimetria: [
    {
      question: 'Houve piora visual recente ou progressiva?',
      reason: 'Ajuda a correlacionar alteração corneana com evolução clínica.',
      priority: 'high',
    },
    {
      question: 'O paciente coça os olhos com frequência?',
      reason: 'Comportamento pode influenciar ectasia/instabilidade corneana.',
      priority: 'high',
    },
    {
      question: 'Usa lente de contato atualmente?',
      reason: 'Pode interferir nas medidas corneanas.',
      priority: 'medium',
    },
  ],
  topografia: [
    {
      question: 'Há história de cirurgia refrativa prévia?',
      reason: 'Muda interpretação de curvatura e assimetria.',
      priority: 'high',
    },
    {
      question: 'Existe assimetria refracional conhecida entre os olhos?',
      reason: 'Apoia leitura de assimetria topográfica.',
      priority: 'medium',
    },
    {
      question: 'Há exames anteriores para avaliar progressão?',
      reason: 'Progressão é dado clínico-chave em córnea.',
      priority: 'high',
    },
  ],
  galilei: [
    {
      question: 'Há piora visual recente, especialmente noturna?',
      reason: 'Ajuda a contextualizar risco estrutural corneano.',
      priority: 'high',
    },
    {
      question: 'Já realizou cirurgia refrativa ou trauma ocular?',
      reason: 'Contexto altera interpretação tomográfica.',
      priority: 'high',
    },
    {
      question: 'Existem exames tomográficos anteriores para comparação?',
      reason: 'Evolução temporal pode mudar conduta.',
      priority: 'high',
    },
  ],
  microscopia: [
    {
      question: 'Há história de cirurgia intraocular prévia?',
      reason: 'Importante para contexto endotelial.',
      priority: 'high',
    },
    {
      question: 'Existe edema corneano clínico atualmente?',
      reason: 'Correlaciona achados endoteliais com sintomas/sinais.',
      priority: 'medium',
    },
    {
      question: 'O exame está sendo usado para planejamento cirúrgico?',
      reason: 'Define urgência e foco da interpretação.',
      priority: 'medium',
    },
  ],
  campimetria: [
    {
      question: 'O paciente já possui diagnóstico prévio de glaucoma?',
      reason: 'Impacta interpretação de defeito campimétrico.',
      priority: 'high',
    },
    {
      question: 'Qual foi a pressão intraocular recente e uso de colírio hipotensor?',
      reason: 'Dado decisivo para contexto funcional.',
      priority: 'high',
    },
    {
      question: 'Foi primeiro campo visual ou havia baixa colaboração durante o exame?',
      reason: 'Confiabilidade influencia muito a leitura.',
      priority: 'high',
    },
  ],
  retinografia: [
    {
      question: 'Há sintomas visuais recentes (baixa visual, escotoma, distorção)?',
      reason: 'Correlaciona alterações de fundo com queixa clínica.',
      priority: 'high',
    },
    {
      question: 'Paciente tem diabetes, hipertensão ou outra condição vascular?',
      reason: 'Comorbidades mudam hipótese e conduta.',
      priority: 'high',
    },
    {
      question: 'Já houve tratamento retiniano prévio (laser/injeções)?',
      reason: 'Histórico terapêutico muda interpretação das lesões.',
      priority: 'medium',
    },
  ],
  oct_disco: [
    {
      question: 'Existe história familiar de glaucoma?',
      reason: 'Ajuda a qualificar risco estrutural bilateral.',
      priority: 'high',
    },
    {
      question: 'Qual foi a PIO recente e uso de hipotensor ocular?',
      reason: 'Correlaciona estrutura do nervo com controle pressórico.',
      priority: 'high',
    },
    {
      question: 'Há exames prévios comparáveis de RNFL/disco?',
      reason: 'Progressão estrutural é ponto crítico.',
      priority: 'high',
    },
  ],
  oct_macula: [
    {
      question: 'Há baixa visual central ou metamorfopsia?',
      reason: 'Sintoma funcional muda peso dos achados maculares.',
      priority: 'high',
    },
    {
      question: 'O quadro é unilateral ou bilateral na percepção do paciente?',
      reason: 'Ajuda na leitura de simetria/assimetria entre olhos.',
      priority: 'medium',
    },
    {
      question: 'Já recebeu tratamento retiniano prévio?',
      reason: 'Contexto terapêutico altera interpretação de fluido/cicatriz.',
      priority: 'medium',
    },
  ],
};

function normalizeExamType(raw: unknown): OftalmoExamType | null {
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const allowed = [
    'paquimetria',
    'topografia',
    'galilei',
    'microscopia',
    'campimetria',
    'retinografia',
    'oct_disco',
    'oct_macula',
  ];
  return (allowed as readonly string[]).includes(t) ? (t as OftalmoExamType) : null;
}

function priorityScore(p: ClinicalQuestionPriority): number {
  if (p === 'high') return 3;
  if (p === 'medium') return 2;
  return 1;
}

function pushCandidate(
  list: Candidate[],
  question: string,
  reason: string,
  priority: ClinicalQuestionPriority,
  scoreBoost = 0,
  tags: string[] = [],
  examType?: OftalmoExamType
) {
  list.push({
    id: `q_${Math.random().toString(36).slice(2, 10)}`,
    question,
    reason,
    priority,
    examType,
    score: priorityScore(priority) + scoreBoost,
    tags,
  });
}

function dedupeQuestions(candidates: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = c.question.toLowerCase().replace(/\s+/g, ' ').trim();
    const prev = map.get(key);
    if (!prev || c.score > prev.score) map.set(key, c);
  }
  return [...map.values()];
}

export function buildFollowUpQuestions(
  extractions: ClinicalQuestionInput[],
  binocularComparisons?: BinocularComparison[]
): ClinicalFollowUpQuestion[] {
  const candidates: Candidate[] = [];
  const examTypesSeen = new Set<OftalmoExamType>();
  let hasWeakCoverage = false;
  let hasLowQuality = false;
  let hasMismatch = false;

  for (const item of extractions) {
    const examType = normalizeExamType(item.examType);
    if (!examType) continue;
    examTypesSeen.add(examType);
    const data = (item.data ?? {}) as Record<string, unknown>;
    const base = BASE_QUESTIONS_BY_EXAM_TYPE[examType] ?? [];
    for (const q of base) {
      pushCandidate(candidates, q.question, q.reason, q.priority, 0, q.tags ?? [], examType);
    }

    const checklistStatus = data.checklistStatus;
    if (checklistStatus === 'weak' || checklistStatus === 'partial') {
      hasWeakCoverage = true;
    }
    const qualityFlags = Array.isArray(data.qualityFlags)
      ? data.qualityFlags.filter((x): x is string => typeof x === 'string')
      : [];
    if (
      qualityFlags.includes('low_confidence_extraction') ||
      qualityFlags.includes('possible_ocr_issue') ||
      qualityFlags.includes('limited_interpretability')
    ) {
      hasLowQuality = true;
    }
    if (data.examTypeMismatch === true || qualityFlags.includes('possible_exam_type_mismatch')) {
      hasMismatch = true;
    }
  }

  if (hasWeakCoverage) {
    pushCandidate(
      candidates,
      'Há outro exame/imagem melhor para complementar os campos-chave ausentes?',
      'Cobertura incompleta reduz confiabilidade da interpretação.',
      'high',
      2,
      ['quality']
    );
  }
  if (hasLowQuality) {
    pushCandidate(
      candidates,
      'O exame teve baixa colaboração/qualidade técnica durante a aquisição?',
      'Baixa qualidade pode gerar falsos achados ou leitura incompleta.',
      'high',
      2,
      ['quality']
    );
  }
  if (hasMismatch) {
    pushCandidate(
      candidates,
      'Confirma que a modalidade selecionada corresponde ao arquivo enviado?',
      'Há sinais de possível divergência de tipo de exame.',
      'high',
      2,
      ['mismatch']
    );
  }

  const binocular =
    binocularComparisons ??
    buildBinocularComparisons(
      extractions
        .map((item, idx) => {
          const examType = normalizeExamType(item.examType);
          if (!examType) return null;
          const data = (item.data ?? {}) as Record<string, unknown>;
          const ce = data.camposEstruturados;
          if (!ce || typeof ce !== 'object' || Array.isArray(ce)) return null;
          const eyeRaw = typeof item.eye === 'string' ? item.eye : data.eye;
          return {
            id: `cmp_${idx}`,
            fileName: typeof item.fileName === 'string' ? item.fileName : `arquivo_${idx + 1}`,
            examType,
            eye: normalizeEye(eyeRaw),
            camposEstruturados: ce as Record<string, string | number | null>,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    );

  for (const b of binocular) {
    if (b.status === 'marked_asymmetry' || b.status === 'mild_asymmetry') {
      pushCandidate(
        candidates,
        'Os sintomas predominam em um olho específico (OD ou OE)?',
        `Há ${b.status === 'marked_asymmetry' ? 'assimetria relevante' : 'assimetria leve'} entre os olhos nessa modalidade.`,
        'high',
        b.status === 'marked_asymmetry' ? 2 : 1,
        ['binocular'],
        b.examType
      );
    }
  }

  let deduped = dedupeQuestions(candidates).sort((a, b) => b.score - a.score);
  if (deduped.length < 3) {
    pushCandidate(
      deduped,
      'Existem exames anteriores comparáveis para avaliar progressão?',
      'Contexto longitudinal melhora precisão da interpretação.',
      'medium',
      0,
      ['fallback']
    );
    pushCandidate(
      deduped,
      'Há sintomas visuais recentes que motivaram este exame?',
      'Correlaciona achados estruturais com quadro clínico atual.',
      'medium',
      0,
      ['fallback']
    );
    pushCandidate(
      deduped,
      'Há comorbidades relevantes (ex.: diabetes, hipertensão, glaucoma)?',
      'Comorbidades mudam hipóteses e risco.',
      'medium',
      0,
      ['fallback']
    );
    deduped = dedupeQuestions(deduped).sort((a, b) => b.score - a.score);
  }

  const limited = deduped.slice(0, 7);
  const min = Math.min(3, limited.length);
  return limited.slice(0, Math.max(min, Math.min(7, limited.length))).map((q, idx) => ({
    id: `follow_up_${idx + 1}`,
    question: q.question,
    reason: q.reason,
    priority: q.priority,
    ...(q.examType ? { examType: q.examType } : {}),
  }));
}
