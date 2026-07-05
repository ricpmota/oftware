'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import { auth } from '@/lib/firebase';
import ExameLaboratorialIaUploadBlock, {
  type ExameIaFeedback,
} from '@/components/metaadmin/ExameLaboratorialIaUploadBlock';
import type {
  LaudoOftalmoExtracaoData,
  LaudoReviewStatus,
} from '@/lib/oftpay/laudoOftalmoExtracaoData';
import {
  getExamTypeLabel,
  type OftalmoExamType,
} from '@/lib/oftpay/laudoOftalmoExtraction';
import {
  buildBinocularComparisons,
  getBinocularStatusLabel,
  getEyeLabel,
  normalizeEye,
  type OftalmoEye,
} from '@/lib/oftpay/laudoOftalmoEye';
import {
  buildTemporalComparisons,
  getTemporalStatusLabel,
} from '@/lib/oftpay/laudoOftalmoTemporal';
import {
  getStructuredFieldPreview,
  getStructuredFieldLabel,
  QUALITY_FLAG_LABELS_PT,
} from '@/lib/oftpay/laudoOftalmoExtractionPostProcess';
import { getChecklistStatusLabel } from '@/lib/oftpay/laudoOftalmoChecklist';
import {
  buildPostReextractMessage,
  type SimpleChecklistSnapshot,
} from '@/components/oftpay/laudoExamesWorkspace.helpers';
import type {
  ClinicalFollowUpAnswer,
  ClinicalFollowUpQuestion,
} from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { RefinementDelta } from '@/lib/oftpay/refinementDelta';
import type { IntegratedCaseSummary } from '@/lib/oftpay/integratedCaseSummary';
import type {
  ClinicalPriorityAssessment,
  ClinicalPriorityLevel,
} from '@/lib/oftpay/clinicalPriorityAssessment';
import type { ClinicalPriorityExplainability } from '@/lib/oftpay/clinicalPriorityExplainability';
import type { ClinicalFollowUpActions } from '@/lib/oftpay/clinicalFollowUpActions';
import type { GlaucomaCorrelation } from '@/lib/oftpay/glaucomaCorrelation';
import type { RetinaCorrelation } from '@/lib/oftpay/retinaCorrelation';
import type { CorneaCorrelation } from '@/lib/oftpay/corneaCorrelation';
import type { MultiDomainCorrelation } from '@/lib/oftpay/multiDomainCorrelation';
import type { DomainLongitudinalCorrelation } from '@/lib/oftpay/domainLongitudinalCorrelation';
import type { DoctorAgreement } from '@/lib/oftpay/laudoCaseArchive';
import type { LearningInsight } from '@/lib/oftpay/learningInsights';

export type { OftalmoExamType };

const EXAM_TYPE_OPTIONS: { value: OftalmoExamType; label: string }[] = [
  { value: 'paquimetria', label: 'Paquimetria' },
  { value: 'topografia', label: 'Topografia' },
  { value: 'galilei', label: 'Galilei' },
  { value: 'microscopia', label: 'Microscopia' },
  { value: 'campimetria', label: 'Campimetria' },
  { value: 'retinografia', label: 'Retinografia' },
  { value: 'oct_disco', label: 'OCT Disco' },
  { value: 'oct_macula', label: 'OCT Mácula' },
];
const EYE_OPTIONS: { value: OftalmoEye; label: string }[] = [
  { value: 'od', label: 'OD' },
  { value: 'oe', label: 'OE' },
  { value: 'ao', label: 'AO' },
  { value: 'nao_informado', label: 'Não informado' },
];

type ExtractedFile = {
  id: string;
  fileName: string;
  /** Tipo de exame escolhido pelo médico no momento do upload (obrigatório no fluxo atual). */
  examType: OftalmoExamType;
  eye: OftalmoEye;
  /** Arquivo original mantido em memória para permitir re-extração por item. */
  originalFile: File;
  data: LaudoOftalmoExtracaoData;
};

type ChatSource = {
  id: number;
  title: string;
  snippet: string;
  page?: number;
};

type AnalyzeResult = {
  answer: string;
  sources: ChatSource[];
  usedWebGrounding?: boolean;
  followUpQuestions: ClinicalFollowUpQuestion[];
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

type RefinedAnalyzeResult = {
  answer: string;
  usedAnswersCount: number;
  usedQuestions: string[];
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

type ArchiveFeedbackState = { type: 'idle' | 'success' | 'error'; text?: string };

type Props = {
  courseId: string;
  courseName: string;
};

function reviewStatusBadgeClass(status: LaudoReviewStatus | undefined): string {
  const s = status ?? 'ok';
  if (s === 'ok') return 'bg-emerald-100 text-emerald-900';
  if (s === 'attention') return 'bg-amber-100 text-amber-900';
  return 'bg-rose-100 text-rose-900';
}

function reviewStatusShortLabel(status: LaudoReviewStatus | undefined): string {
  const s = status ?? 'ok';
  if (s === 'ok') return 'OK';
  if (s === 'attention') return 'Atenção';
  return 'Revisar';
}

function cleanSnippet(snippet: string): string {
  if (!snippet || !snippet.trim()) return snippet;
  return snippet
    .replace(/Licensed to\s.+/gi, '')
    .replace(/OFT-REVIEW\s*[-|]\s*EXTENSIVE/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clinicalPriorityBadgeClass(level: ClinicalPriorityLevel): string {
  if (level === 'routine') return 'bg-emerald-100 text-emerald-800';
  if (level === 'attention') return 'bg-amber-100 text-amber-800';
  if (level === 'priority') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-200 text-slate-700';
}

export default function LaudoExamesWorkspace({ courseId, courseName }: Props) {
  const [filesData, setFilesData] = useState<ExtractedFile[]>([]);
  /** Tipo aplicado aos próximos uploads; obrigatório antes de enviar arquivos. */
  const [selectedExamType, setSelectedExamType] = useState<OftalmoExamType | ''>('');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<ExameIaFeedback>({ type: 'idle' });
  const [question, setQuestion] = useState('');
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingRefineAnalyze, setLoadingRefineAnalyze] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [refinedResult, setRefinedResult] = useState<RefinedAnalyzeResult | null>(null);
  const [followUpAnswersById, setFollowUpAnswersById] = useState<Record<string, string>>({});
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingEyeId, setEditingEyeId] = useState<string | null>(null);
  const [pendingExamTypeById, setPendingExamTypeById] = useState<
    Record<string, OftalmoExamType>
  >({});
  const [pendingEyeById, setPendingEyeById] = useState<Record<string, OftalmoEye>>({});
  const [reextractingId, setReextractingId] = useState<string | null>(null);
  const [reextractMessageById, setReextractMessageById] = useState<Record<string, string>>({});
  const [doctorAgreement, setDoctorAgreement] = useState<DoctorAgreement | ''>('');
  const [doctorComment, setDoctorComment] = useState('');
  const [doctorFinalInterpretation, setDoctorFinalInterpretation] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveFeedback, setArchiveFeedback] = useState<ArchiveFeedbackState>({ type: 'idle' });

  const totalCamposMapeados = useMemo(() => {
    return filesData.reduce((acc, item) => {
      const lab = Object.keys(item.data.camposMapeados ?? {}).length;
      const ce = item.data.camposEstruturados;
      const structured =
        ce && typeof ce === 'object'
          ? Object.values(ce).filter(
              (v) => v !== null && v !== undefined && String(v).trim() !== ''
            ).length
          : 0;
      return acc + lab + structured;
    }, 0);
  }, [filesData]);
  const binocularComparisons = useMemo(
    () =>
      buildBinocularComparisons(
        filesData.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          examType: item.examType,
          eye: item.eye,
          camposEstruturados: item.data.camposEstruturados ?? {},
        }))
      ),
    [filesData]
  );
  const temporalComparisons = useMemo(
    () =>
      buildTemporalComparisons(
        filesData.map((item, idx) => ({
          id: item.id,
          fileName: item.fileName,
          examType: item.examType,
          eye: item.eye,
          dataExame: item.data.dataExame ?? null,
          camposEstruturados: item.data.camposEstruturados ?? {},
          sourceOrder: idx,
        }))
      ),
    [filesData]
  );
  const answeredFollowUpAnswers = useMemo(() => {
    if (!result?.followUpQuestions) return [];
    return result.followUpQuestions
      .map((q) => {
        const answer = (followUpAnswersById[q.id] ?? '').trim();
        if (!answer) return null;
        const out: ClinicalFollowUpAnswer = {
          questionId: q.id,
          question: q.question,
          answer,
        };
        return out;
      })
      .filter((x): x is ClinicalFollowUpAnswer => x !== null);
  }, [result, followUpAnswersById]);
  const displayedIntegratedSummary = useMemo(
    () => refinedResult?.integratedCaseSummary ?? result?.integratedCaseSummary ?? null,
    [refinedResult, result]
  );
  const displayedClinicalPriority = useMemo(
    () => refinedResult?.clinicalPriorityAssessment ?? result?.clinicalPriorityAssessment ?? null,
    [refinedResult, result]
  );
  const displayedClinicalPriorityExplainability = useMemo(
    () =>
      refinedResult?.clinicalPriorityExplainability ??
      result?.clinicalPriorityExplainability ??
      null,
    [refinedResult, result]
  );
  const displayedClinicalFollowUpActions = useMemo(
    () => refinedResult?.clinicalFollowUpActions ?? result?.clinicalFollowUpActions ?? null,
    [refinedResult, result]
  );
  const displayedGlaucomaCorrelation = useMemo(
    () => refinedResult?.glaucomaCorrelation ?? result?.glaucomaCorrelation ?? null,
    [refinedResult, result]
  );
  const displayedRetinaCorrelation = useMemo(
    () => refinedResult?.retinaCorrelation ?? result?.retinaCorrelation ?? null,
    [refinedResult, result]
  );
  const displayedCorneaCorrelation = useMemo(
    () => refinedResult?.corneaCorrelation ?? result?.corneaCorrelation ?? null,
    [refinedResult, result]
  );
  const displayedMultiDomainCorrelation = useMemo(
    () => refinedResult?.multiDomainCorrelation ?? result?.multiDomainCorrelation ?? null,
    [refinedResult, result]
  );
  const displayedDomainLongitudinal = useMemo(
    () =>
      refinedResult?.domainLongitudinalCorrelation ??
      result?.domainLongitudinalCorrelation ??
      null,
    [refinedResult, result]
  );

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (!selectedExamType) {
      setFeedback({
        type: 'error',
        text: 'Selecione o tipo do exame antes de enviar o arquivo.',
      });
      return;
    }

    const examTypeForBatch = selectedExamType;

    setUploading(true);
    setAnalyzeError(null);
    setResult(null);
    setRefinedResult(null);
    setFollowUpAnswersById({});
    setArchiveFeedback({ type: 'idle' });
    setFeedback({ type: 'idle' });

    const okItems: ExtractedFile[] = [];
    const failed: string[] = [];

    for (const file of files) {
      try {
        const extracted = await extractSingleFile(file, examTypeForBatch, 'nao_informado');
        if (!extracted) {
          failed.push(file.name);
          continue;
        }
        okItems.push({
          id: `${Date.now()}_${file.name}_${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          examType: examTypeForBatch,
          eye: normalizeEye(extracted.eye ?? extracted.detectedEye ?? 'nao_informado'),
          originalFile: file,
          data: extracted,
        });
      } catch {
        failed.push(file.name);
      }
    }

    if (okItems.length > 0) {
      setFilesData((prev) => [...okItems, ...prev]);
    }

    if (okItems.length > 0 && failed.length === 0) {
      setFeedback({
        type: 'success',
        text: `${okItems.length} arquivo(s) lido(s) com sucesso.`,
      });
    } else if (okItems.length > 0 && failed.length > 0) {
      setFeedback({
        type: 'success',
        text: `${okItems.length} arquivo(s) lido(s). Falha em ${failed.length}.`,
      });
    } else {
      setFeedback({
        type: 'error',
        text: 'Não foi possível ler os arquivos enviados.',
      });
    }

    setUploading(false);
  };

  const removeFile = (id: string) => {
    setFilesData((prev) => prev.filter((x) => x.id !== id));
    setPendingExamTypeById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingTypeId === id) setEditingTypeId(null);
    if (editingEyeId === id) setEditingEyeId(null);
    setReextractMessageById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingEyeById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setResult(null);
    setRefinedResult(null);
    setArchiveFeedback({ type: 'idle' });
  };

  const extractSingleFile = async (
    file: File,
    examType: OftalmoExamType,
    eye?: OftalmoEye
  ): Promise<LaudoOftalmoExtracaoData | null> => {
    const form = new FormData();
    form.append('file', file);
    form.append('examType', examType);
    if (eye) form.append('eye', eye);
    const res = await fetch('/api/oftpay/laudo-exames/extract', {
      method: 'POST',
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.data) return null;
    return data.data as LaudoOftalmoExtracaoData;
  };

  const startEditType = (item: ExtractedFile) => {
    setEditingTypeId(item.id);
    setPendingExamTypeById((prev) => ({
      ...prev,
      [item.id]: prev[item.id] ?? item.examType,
    }));
  };

  const cancelEditType = (id: string) => {
    setEditingTypeId((prev) => (prev === id ? null : prev));
    setPendingExamTypeById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const startEditEye = (item: ExtractedFile) => {
    setEditingEyeId(item.id);
    setPendingEyeById((prev) => ({
      ...prev,
      [item.id]: prev[item.id] ?? item.eye,
    }));
  };

  const cancelEditEye = (id: string) => {
    setEditingEyeId((prev) => (prev === id ? null : prev));
    setPendingEyeById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveEyeForFile = (item: ExtractedFile, eye: OftalmoEye) => {
    setFilesData((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? {
              ...f,
              eye,
              data: {
                ...f.data,
                eye,
                eyeLabel: getEyeLabel(eye),
              },
            }
          : f
      )
    );
    setReextractMessageById((prev) => ({
      ...prev,
      [item.id]: `Olho atualizado para ${getEyeLabel(eye)} em ${item.fileName}.`,
    }));
    cancelEditEye(item.id);
  };

  const reextractSingleFile = async (item: ExtractedFile, newExamType: OftalmoExamType) => {
    const previousChecklist: SimpleChecklistSnapshot | null =
      typeof item.data.checklistFilledCount === 'number' &&
      typeof item.data.checklistTotal === 'number'
        ? {
            filled: item.data.checklistFilledCount,
            total: item.data.checklistTotal,
            status: item.data.checklistStatus ?? null,
          }
        : null;

    setReextractingId(item.id);
    setAnalyzeError(null);
    setResult(null);
    setRefinedResult(null);
    try {
      const extracted = await extractSingleFile(item.originalFile, newExamType, item.eye);
      if (!extracted) {
        setAnalyzeError(`Falha ao reprocessar ${item.fileName}.`);
        return;
      }
      setFilesData((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                examType: newExamType,
                eye: normalizeEye(extracted.eye ?? item.eye),
                data: extracted,
              }
            : f
        )
      );
      setFeedback({
        type: 'success',
        text: `Arquivo "${item.fileName}" reprocessado.`,
      });
      setReextractMessageById((prev) => ({
        ...prev,
        [item.id]: buildPostReextractMessage({
          fileName: item.fileName,
          examTypeLabel: getExamTypeLabel(newExamType),
          previousChecklist,
          currentChecklist: {
            filled: extracted.checklistFilledCount ?? 0,
            total: extracted.checklistTotal ?? 0,
            status: extracted.checklistStatus ?? null,
          },
          reviewStatus: extracted.reviewStatus ?? null,
        }),
      }));
      cancelEditType(item.id);
    } catch {
      setAnalyzeError(`Erro de conexão ao reprocessar ${item.fileName}.`);
    } finally {
      setReextractingId(null);
    }
  };

  const runAnalyze = async () => {
    if (!question.trim() && filesData.length === 0) return;

    setLoadingAnalyze(true);
    setAnalyzeError(null);
    setResult(null);
    setRefinedResult(null);

    try {
      const res = await fetch('/api/oftpay/laudo-exames/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          extractions: filesData.map((f) => ({
            fileName: f.fileName,
            examType: f.examType,
            eye: f.eye,
            data: f.data,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalyzeError(
          typeof data?.error === 'string'
            ? data.error
            : 'Falha ao gerar laudo com IA.'
        );
        return;
      }
      setResult({
        answer: typeof data?.answer === 'string' ? data.answer : 'Resposta indisponível.',
        sources: Array.isArray(data?.sources) ? (data.sources as ChatSource[]) : [],
        usedWebGrounding:
          typeof data?.usedWebGrounding === 'boolean'
            ? data.usedWebGrounding
            : undefined,
        followUpQuestions: Array.isArray(data?.followUpQuestions)
          ? (data.followUpQuestions as ClinicalFollowUpQuestion[])
          : [],
        integratedCaseSummary:
          data?.integratedCaseSummary && typeof data.integratedCaseSummary === 'object'
            ? (data.integratedCaseSummary as IntegratedCaseSummary)
            : undefined,
        clinicalPriorityAssessment:
          data?.clinicalPriorityAssessment && typeof data.clinicalPriorityAssessment === 'object'
            ? (data.clinicalPriorityAssessment as ClinicalPriorityAssessment)
            : undefined,
        clinicalPriorityExplainability:
          data?.clinicalPriorityExplainability &&
          typeof data.clinicalPriorityExplainability === 'object'
            ? (data.clinicalPriorityExplainability as ClinicalPriorityExplainability)
            : undefined,
        clinicalFollowUpActions:
          data?.clinicalFollowUpActions && typeof data.clinicalFollowUpActions === 'object'
            ? (data.clinicalFollowUpActions as ClinicalFollowUpActions)
            : undefined,
        glaucomaCorrelation:
          data?.glaucomaCorrelation && typeof data.glaucomaCorrelation === 'object'
            ? (data.glaucomaCorrelation as GlaucomaCorrelation)
            : undefined,
        retinaCorrelation:
          data?.retinaCorrelation && typeof data.retinaCorrelation === 'object'
            ? (data.retinaCorrelation as RetinaCorrelation)
            : undefined,
        corneaCorrelation:
          data?.corneaCorrelation && typeof data.corneaCorrelation === 'object'
            ? (data.corneaCorrelation as CorneaCorrelation)
            : undefined,
        multiDomainCorrelation:
          data?.multiDomainCorrelation && typeof data.multiDomainCorrelation === 'object'
            ? (data.multiDomainCorrelation as MultiDomainCorrelation)
            : undefined,
        domainLongitudinalCorrelation:
          data?.domainLongitudinalCorrelation &&
          typeof data.domainLongitudinalCorrelation === 'object'
            ? (data.domainLongitudinalCorrelation as DomainLongitudinalCorrelation)
            : undefined,
        learningInsightsApplied: Array.isArray(data?.learningInsightsApplied)
          ? (data.learningInsightsApplied as LearningInsight[])
          : undefined,
      });
      setFollowUpAnswersById({});
    } catch {
      setAnalyzeError('Erro de conexão ao gerar laudo.');
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const runRefinedAnalyze = async () => {
    if (!result || answeredFollowUpAnswers.length === 0) return;

    setLoadingRefineAnalyze(true);
    setAnalyzeError(null);
    try {
      const res = await fetch('/api/oftpay/laudo-exames/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          extractions: filesData.map((f) => ({
            fileName: f.fileName,
            examType: f.examType,
            eye: f.eye,
            data: f.data,
          })),
          followUpQuestions: result.followUpQuestions,
          followUpAnswers: answeredFollowUpAnswers,
          initialAnswer: result.answer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalyzeError(
          typeof data?.error === 'string' ? data.error : 'Falha ao refinar interpretação.'
        );
        return;
      }

      setRefinedResult({
        answer:
          typeof data?.answer === 'string'
            ? data.answer
            : 'Interpretação refinada indisponível.',
        usedAnswersCount:
          typeof data?.refinementUsedAnswersCount === 'number'
            ? data.refinementUsedAnswersCount
            : answeredFollowUpAnswers.length,
        usedQuestions: Array.isArray(data?.refinementUsedQuestions)
          ? (data.refinementUsedQuestions as string[])
          : answeredFollowUpAnswers.map((a) => a.question ?? 'Pergunta clínica'),
        refinementDelta:
          data?.refinementDelta && typeof data.refinementDelta === 'object'
            ? (data.refinementDelta as RefinementDelta)
            : undefined,
        integratedCaseSummary:
          data?.integratedCaseSummary && typeof data.integratedCaseSummary === 'object'
            ? (data.integratedCaseSummary as IntegratedCaseSummary)
            : undefined,
        clinicalPriorityAssessment:
          data?.clinicalPriorityAssessment && typeof data.clinicalPriorityAssessment === 'object'
            ? (data.clinicalPriorityAssessment as ClinicalPriorityAssessment)
            : undefined,
        clinicalPriorityExplainability:
          data?.clinicalPriorityExplainability &&
          typeof data.clinicalPriorityExplainability === 'object'
            ? (data.clinicalPriorityExplainability as ClinicalPriorityExplainability)
            : undefined,
        clinicalFollowUpActions:
          data?.clinicalFollowUpActions && typeof data.clinicalFollowUpActions === 'object'
            ? (data.clinicalFollowUpActions as ClinicalFollowUpActions)
            : undefined,
        glaucomaCorrelation:
          data?.glaucomaCorrelation && typeof data.glaucomaCorrelation === 'object'
            ? (data.glaucomaCorrelation as GlaucomaCorrelation)
            : undefined,
        retinaCorrelation:
          data?.retinaCorrelation && typeof data.retinaCorrelation === 'object'
            ? (data.retinaCorrelation as RetinaCorrelation)
            : undefined,
        corneaCorrelation:
          data?.corneaCorrelation && typeof data.corneaCorrelation === 'object'
            ? (data.corneaCorrelation as CorneaCorrelation)
            : undefined,
        multiDomainCorrelation:
          data?.multiDomainCorrelation && typeof data.multiDomainCorrelation === 'object'
            ? (data.multiDomainCorrelation as MultiDomainCorrelation)
            : undefined,
        domainLongitudinalCorrelation:
          data?.domainLongitudinalCorrelation &&
          typeof data.domainLongitudinalCorrelation === 'object'
            ? (data.domainLongitudinalCorrelation as DomainLongitudinalCorrelation)
            : undefined,
        learningInsightsApplied: Array.isArray(data?.learningInsightsApplied)
          ? (data.learningInsightsApplied as LearningInsight[])
          : undefined,
      });
    } catch {
      setAnalyzeError('Erro de conexão ao refinar interpretação.');
    } finally {
      setLoadingRefineAnalyze(false);
    }
  };

  const archiveCase = async () => {
    if (!result || archiveLoading) return;
    setArchiveLoading(true);
    setArchiveFeedback({ type: 'idle' });
    try {
      const user = auth.currentUser;
      if (!user) {
        setArchiveFeedback({
          type: 'error',
          text: 'Faça login novamente para arquivar o caso.',
        });
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/oftpay/laudo-exames/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          files: filesData.map((f) => ({
            fileName: f.fileName,
            examType: f.examType,
            examTypeLabel: getExamTypeLabel(f.examType),
            eye: f.eye,
            eyeLabel: getEyeLabel(f.eye),
            dataExame: f.data.dataExame ?? null,
            camposEstruturados: f.data.camposEstruturados ?? {},
            qualityFlags: f.data.qualityFlags ?? [],
            qualitySummary: f.data.qualitySummary ?? null,
            reviewStatus: f.data.reviewStatus ?? null,
            checklistCoverage: f.data.checklistCoverage ?? null,
            checklistStatus: f.data.checklistStatus ?? null,
          })),
          binocularContext: binocularComparisons,
          temporalContext: temporalComparisons,
          aiOutput: {
            initialAnalysis: result.answer,
            followUpQuestions: result.followUpQuestions ?? [],
            followUpAnswers: answeredFollowUpAnswers ?? [],
            refinedAnalysis: refinedResult?.answer ?? '',
            refinementDelta: refinedResult?.refinementDelta,
            integratedCaseSummary: refinedResult?.integratedCaseSummary ?? result.integratedCaseSummary,
            clinicalPriorityAssessment:
              refinedResult?.clinicalPriorityAssessment ?? result.clinicalPriorityAssessment,
            clinicalPriorityExplainability:
              refinedResult?.clinicalPriorityExplainability ?? result.clinicalPriorityExplainability,
            clinicalFollowUpActions:
              refinedResult?.clinicalFollowUpActions ?? result.clinicalFollowUpActions,
            glaucomaCorrelation: refinedResult?.glaucomaCorrelation ?? result.glaucomaCorrelation,
            retinaCorrelation: refinedResult?.retinaCorrelation ?? result.retinaCorrelation,
            corneaCorrelation: refinedResult?.corneaCorrelation ?? result.corneaCorrelation,
            multiDomainCorrelation:
              refinedResult?.multiDomainCorrelation ?? result.multiDomainCorrelation,
            domainLongitudinalCorrelation:
              refinedResult?.domainLongitudinalCorrelation ??
              result.domainLongitudinalCorrelation,
            learningInsightsApplied:
              refinedResult?.learningInsightsApplied ?? result.learningInsightsApplied ?? [],
          },
          feedback: {
            doctorAgreement: doctorAgreement || undefined,
            doctorComment: doctorComment.trim() || undefined,
            doctorFinalInterpretation: doctorFinalInterpretation.trim() || undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setArchiveFeedback({
          type: 'error',
          text: typeof data?.error === 'string' ? data.error : 'Falha ao arquivar caso.',
        });
        return;
      }
      setArchiveFeedback({ type: 'success', text: 'Caso arquivado com sucesso.' });
    } catch {
      setArchiveFeedback({ type: 'error', text: 'Erro de conexão ao arquivar caso.' });
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-5 md:py-6 space-y-4">
        <div className="rounded-xl border border-blue-100 bg-white p-4 md:p-5">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">
            {courseName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Envie PDF ou imagem do exame, extraia os dados com IA e gere um laudo
            inicial com referências das apostilas.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            1) Upload do exame
          </h2>
          <div className="space-y-1.5">
            <label
              htmlFor="laudo-exame-tipo"
              className="block text-xs font-medium text-gray-700"
            >
              Tipo do exame <span className="text-red-600">*</span>
            </label>
            <select
              id="laudo-exame-tipo"
              value={selectedExamType}
              onChange={(e) =>
                setSelectedExamType((e.target.value as OftalmoExamType) || '')
              }
              className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o tipo…</option>
              {EXAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {!selectedExamType && (
              <p className="text-xs text-amber-700">
                Escolha o tipo para habilitar o envio do arquivo.
              </p>
            )}
          </div>
          <ExameLaboratorialIaUploadBlock
            loading={uploading}
            feedback={feedback}
            onSelectFiles={processFiles}
            disabled={!selectedExamType || uploading}
          />
          <p className="text-xs text-gray-500">
            Formatos aceitos: PDF, JPG, PNG e WEBP.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              2) Dados extraídos ({filesData.length} arquivo(s))
            </h2>
            <span className="text-xs text-gray-500">
              Campos preenchidos: {totalCamposMapeados}
            </span>
          </div>

          {filesData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              Nenhum exame processado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {filesData.map((item) => {
                const mapeadosLab = Object.keys(item.data.camposMapeados ?? {});
                const ce = item.data.camposEstruturados;
                const structuredFilled =
                  ce && typeof ce === 'object'
                    ? Object.values(ce).filter(
                        (v) => v !== null && v !== undefined && String(v).trim() !== ''
                      ).length
                    : 0;
                const reviewStatus = item.data.reviewStatus;
                const fieldPreview = getStructuredFieldPreview(
                  item.examType,
                  ce && typeof ce === 'object' ? ce : {},
                  6
                );
                const flagList = (item.data.qualityFlags ?? []).slice(0, 4);
                const suggestedType = item.data.suggestedExamType;
                const suggestedTypeLabel =
                  item.data.suggestedExamTypeLabel ??
                  (suggestedType ? getExamTypeLabel(suggestedType) : null);
                const suggestionConfidence = item.data.examTypeConfidence;
                const suggestionReason = item.data.examTypeSuggestionReason;
                const mismatch = item.data.examTypeMismatch === true;
                const detectedEye = normalizeEye(item.data.detectedEye ?? 'nao_informado');
                const eyeConfidence = item.data.eyeConfidence;
                const showDetectedEyeHint =
                  detectedEye !== 'nao_informado' &&
                  detectedEye !== item.eye &&
                  typeof eyeConfidence === 'number' &&
                  eyeConfidence >= 0.65;
                const isEditing = editingTypeId === item.id;
                const pendingExamType = pendingExamTypeById[item.id] ?? item.examType;
                const isReextracting = reextractingId === item.id;
                const isEditingEye = editingEyeId === item.id;
                const pendingEye = pendingEyeById[item.id] ?? item.eye;
                const checklistFilled = item.data.checklistFilledCount ?? 0;
                const checklistTotal = item.data.checklistTotal ?? 0;
                const checklistStatus = item.data.checklistStatus ?? 'weak';
                const missingChecklist = (item.data.missingKeyFields ?? []).slice(0, 4);
                const postReextractMessage = reextractMessageById[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.fileName}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs items-center">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${reviewStatusBadgeClass(reviewStatus)}`}
                        title="Qualidade percebida da extração"
                      >
                        {reviewStatusShortLabel(reviewStatus)}
                      </span>
                      <span
                        className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800 font-medium"
                        title="Tipo de exame informado no upload"
                      >
                        {getExamTypeLabel(item.examType)}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                        {structuredFilled} campo(s) estruturado(s)
                        {mapeadosLab.length > 0
                          ? ` · ${mapeadosLab.length} legado`
                          : ''}
                      </span>
                      {item.data.dataExame && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-700">
                          Data: {item.data.dataExame}
                        </span>
                      )}
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800">
                        {getEyeLabel(item.eye)}
                      </span>
                      {mismatch && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-800">
                          Possível divergência de tipo
                        </span>
                      )}
                    </div>

                    {(suggestedTypeLabel || suggestionReason) && (
                      <div className="mt-2 rounded-md border border-slate-200 bg-slate-100/80 p-2">
                        {suggestedTypeLabel && (
                          <p className="text-xs text-slate-700">
                            Sugestão da IA: <span className="font-medium">{suggestedTypeLabel}</span>
                            {typeof suggestionConfidence === 'number'
                              ? ` (confiança ${Math.round(suggestionConfidence * 100)}%)`
                              : ''}
                          </p>
                        )}
                        {suggestionReason && (
                          <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">
                            {suggestionReason}
                          </p>
                        )}
                      </div>
                    )}

                    {showDetectedEyeHint && (
                      <p className="mt-1 text-[11px] text-violet-700">
                        Olho detectado no documento: {getEyeLabel(detectedEye)} (confiança{' '}
                        {Math.round((eyeConfidence ?? 0) * 100)}%)
                      </p>
                    )}

                    {item.data.qualitySummary && (
                      <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                        {item.data.qualitySummary}
                      </p>
                    )}

                    {checklistTotal > 0 && (
                      <div className="mt-1.5 rounded-md border border-gray-200 bg-white/80 px-2 py-1.5">
                        <p className="text-[11px] text-gray-700">
                          Campos-chave: {checklistFilled}/{checklistTotal} · Cobertura{' '}
                          {getChecklistStatusLabel(checklistStatus)}
                        </p>
                        {missingChecklist.length > 0 && (
                          <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-2">
                            Faltantes: {missingChecklist
                              .map((k) => getStructuredFieldLabel(item.examType, k))
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {postReextractMessage && (
                      <p className="mt-1.5 text-[11px] text-emerald-700">{postReextractMessage}</p>
                    )}

                    {flagList.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {flagList.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-700"
                            title={f}
                          >
                            {QUALITY_FLAG_LABELS_PT[f] ?? f}
                          </span>
                        ))}
                      </div>
                    )}

                    {fieldPreview.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-gray-700 border-t border-gray-200/80 pt-2">
                        {fieldPreview.map((row) => (
                          <li key={row.key} className="flex gap-2 min-w-0">
                            <span className="shrink-0 text-gray-500">{row.label}:</span>
                            <span className="truncate" title={row.value}>
                              {row.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {item.data.rawSummary && (
                      <p className="mt-2 text-xs text-gray-600 line-clamp-3">
                        {item.data.rawSummary}
                      </p>
                    )}

                    {item.data.avisos.length > 0 && (
                      <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                        {item.data.avisos.join(' | ')}
                      </div>
                    )}

                    <div className="mt-2 border-t border-gray-200/80 pt-2">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => startEditType(item)}
                          className="text-xs text-blue-700 hover:underline"
                        >
                          Alterar tipo e reprocessar este arquivo
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={pendingExamType}
                            onChange={(e) =>
                              setPendingExamTypeById((prev) => ({
                                ...prev,
                                [item.id]: e.target.value as OftalmoExamType,
                              }))
                            }
                            disabled={isReextracting}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          >
                            {EXAM_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => reextractSingleFile(item, pendingExamType)}
                            disabled={isReextracting}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {isReextracting ? 'Reprocessando...' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEditType(item.id)}
                            disabled={isReextracting}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5">
                      {!isEditingEye ? (
                        <button
                          type="button"
                          onClick={() => startEditEye(item)}
                          className="text-xs text-violet-700 hover:underline"
                        >
                          Ajustar olho (OD/OE/AO)
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={pendingEye}
                            onChange={(e) =>
                              setPendingEyeById((prev) => ({
                                ...prev,
                                [item.id]: normalizeEye(e.target.value),
                              }))
                            }
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          >
                            {EYE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => saveEyeForFile(item, pendingEye)}
                            className="rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700"
                          >
                            Salvar olho
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEditEye(item.id)}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {binocularComparisons.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Correlação binocular</h2>
            <div className="space-y-2">
              {binocularComparisons.map((c) => (
                <div key={c.examType} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <p className="text-xs font-medium text-gray-900">
                    {c.examTypeLabel} · {getBinocularStatusLabel(c.status)}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5">{c.interEyeSummary}</p>
                  {c.keyAsymmetries.length > 0 && (
                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                      Diferenças: {c.keyAsymmetries.slice(0, 2).join(' ')}
                    </p>
                  )}
                  {c.limitations.length > 0 && (
                    <p className="text-[11px] text-amber-700 mt-0.5 line-clamp-1">
                      Limitação: {c.limitations[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {temporalComparisons.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Comparação temporal</h2>
            <div className="space-y-2">
              {temporalComparisons.map((c, idx) => (
                <div
                  key={`${c.examType}-${c.eye}-${idx}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                >
                  <p className="text-xs font-medium text-gray-900">
                    {c.examTypeLabel} ({c.eyeLabel}) · {getTemporalStatusLabel(c.status)}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Datas: {c.previousDate ?? 'sem data'} {'->'} {c.currentDate ?? 'sem data'}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5">{c.progressionSummary}</p>
                  {c.keyTemporalChanges.length > 0 && (
                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                      Mudanças: {c.keyTemporalChanges.slice(0, 2).join(' ')}
                    </p>
                  )}
                  {c.temporalLimitations.length > 0 && (
                    <p className="text-[11px] text-amber-700 mt-0.5 line-clamp-1">
                      Limitação: {c.temporalLimitations[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            3) Pergunta clínica / solicitação do laudo
          </h2>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex.: Interpretar os achados, hipóteses principais, riscos e próximos passos."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={runAnalyze}
            disabled={loadingAnalyze || (!question.trim() && filesData.length === 0)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingAnalyze ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando laudo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar laudo com IA
              </>
            )}
          </button>
        </div>

        {analyzeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {analyzeError}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Laudo sugerido pela IA
              </h2>
              {result.usedWebGrounding && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Internet habilitada
                </span>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 font-sans">
                {result.answer}
              </pre>
            </div>

            {result.followUpQuestions.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Perguntas clínicas para refinar a interpretação
                </h3>
                <ul className="mt-2 space-y-2">
                  {result.followUpQuestions.map((q) => (
                    <li key={q.id} className="text-sm text-gray-800">
                      <p>- {q.question}</p>
                      {q.reason ? <p className="text-xs text-gray-600 mt-0.5">{q.reason}</p> : null}
                      <textarea
                        value={followUpAnswersById[q.id] ?? ''}
                        onChange={(e) =>
                          setFollowUpAnswersById((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="Resposta opcional para refinamento..."
                        rows={2}
                        className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runRefinedAnalyze}
                    disabled={loadingRefineAnalyze || answeredFollowUpAnswers.length === 0}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingRefineAnalyze ? 'Refinando...' : 'Refinar interpretação com respostas'}
                  </button>
                  <span className="text-[11px] text-gray-600">
                    {answeredFollowUpAnswers.length} resposta(s) preenchida(s)
                  </span>
                </div>
              </div>
            )}

            {refinedResult && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Interpretação refinada com contexto clínico adicional
                </h3>
                <p className="text-xs text-gray-600">
                  {refinedResult.usedAnswersCount} resposta(s) clínica(s) considerada(s).
                </p>
                {refinedResult.usedQuestions.length > 0 && (
                  <p className="text-[11px] text-gray-600 line-clamp-2">
                    Perguntas usadas: {refinedResult.usedQuestions.slice(0, 3).join(' | ')}
                  </p>
                )}
                <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 font-sans">
                  {refinedResult.answer}
                </pre>
              </div>
            )}

            {refinedResult?.refinementDelta && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  O que mudou com as respostas clínicas
                </h3>
                <p className="text-xs text-gray-700">{refinedResult.refinementDelta.summary}</p>

                {refinedResult.refinementDelta.keyChanges.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Ganharam força</p>
                    <ul className="mt-1 space-y-0.5">
                      {refinedResult.refinementDelta.keyChanges.slice(0, 3).map((item, idx) => (
                        <li key={`kc-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {refinedResult.refinementDelta.reducedLikelihoods.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Perderam força</p>
                    <ul className="mt-1 space-y-0.5">
                      {refinedResult.refinementDelta.reducedLikelihoods
                        .slice(0, 2)
                        .map((item, idx) => (
                          <li key={`rl-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {refinedResult.refinementDelta.remainingLimitations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Limitações que permanecem</p>
                    <ul className="mt-1 space-y-0.5">
                      {refinedResult.refinementDelta.remainingLimitations
                        .slice(0, 2)
                        .map((item, idx) => (
                          <li key={`lim-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {displayedIntegratedSummary && (
              <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Síntese integradora do caso</h3>
                <p className="text-sm text-gray-800">{displayedIntegratedSummary.headline}</p>
                <p className="text-xs text-gray-700">
                  {displayedIntegratedSummary.mainClinicalImpression}
                </p>

                {displayedIntegratedSummary.mostRelevantFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Fatores mais relevantes</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedIntegratedSummary.mostRelevantFactors.map((item, idx) => (
                        <li key={`factor-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedIntegratedSummary.recommendedNextSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Próximos passos sugeridos</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedIntegratedSummary.recommendedNextSteps
                        .slice(0, 4)
                        .map((item, idx) => (
                          <li key={`next-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedIntegratedSummary.remainingUncertainties.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Incertezas remanescentes</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedIntegratedSummary.remainingUncertainties
                        .slice(0, 3)
                        .map((item, idx) => (
                          <li key={`unc-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedIntegratedSummary.basedOn.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Baseado em: {displayedIntegratedSummary.basedOn.join(', ')}.
                  </p>
                )}
              </div>
            )}

            {displayedClinicalPriority && (
              <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Prioridade clínica sugerida</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${clinicalPriorityBadgeClass(
                      displayedClinicalPriority.level
                    )}`}
                  >
                    {displayedClinicalPriority.label}
                  </span>
                  <p className="text-xs text-gray-700">{displayedClinicalPriority.summary}</p>
                </div>

                {displayedClinicalPriority.mainReasons.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Razões principais</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedClinicalPriority.mainReasons.slice(0, 4).map((r, idx) => (
                        <li key={`pr-${idx}`} className="text-xs text-gray-700">
                          - {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-gray-700">
                  Ação sugerida: {displayedClinicalPriority.recommendedAction}
                </p>

                {displayedClinicalPriority.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações: {displayedClinicalPriority.limitations.join(' | ')}
                  </p>
                )}

                {displayedClinicalPriorityExplainability && (
                  <div className="rounded-md border border-fuchsia-100 bg-white/70 p-2.5 space-y-2">
                    <p className="text-xs font-medium text-gray-800">Fatores que mais pesaram</p>
                    {displayedClinicalPriorityExplainability.topDrivers.length > 0 && (
                      <ul className="space-y-0.5">
                        {displayedClinicalPriorityExplainability.topDrivers
                          .slice(0, 4)
                          .map((item, idx) => (
                            <li key={`cp-top-${idx}`} className="text-xs text-gray-700">
                              - {item.message}
                            </li>
                          ))}
                      </ul>
                    )}
                    {displayedClinicalPriorityExplainability.increasedPriorityFactors.length > 0 && (
                      <p className="text-[11px] text-gray-700">
                        Elevou prioridade:{' '}
                        {displayedClinicalPriorityExplainability.increasedPriorityFactors
                          .slice(0, 2)
                          .join(' | ')}
                      </p>
                    )}
                    {displayedClinicalPriorityExplainability.reducedPriorityFactors.length > 0 && (
                      <p className="text-[11px] text-gray-700">
                        Reduziu preocupação:{' '}
                        {displayedClinicalPriorityExplainability.reducedPriorityFactors
                          .slice(0, 2)
                          .join(' | ')}
                      </p>
                    )}
                    {displayedClinicalPriorityExplainability.uncertaintyFactors.length > 0 && (
                      <p className="text-[11px] text-gray-700">
                        Aumentou incerteza:{' '}
                        {displayedClinicalPriorityExplainability.uncertaintyFactors
                          .slice(0, 2)
                          .join(' | ')}
                      </p>
                    )}
                  </div>
                )}

                {displayedClinicalFollowUpActions &&
                  displayedClinicalFollowUpActions.actions.length > 0 && (
                    <div className="rounded-md border border-fuchsia-100 bg-white/70 p-2.5 space-y-1.5">
                      <p className="text-xs font-medium text-gray-800">Ações sugeridas</p>
                      <ul className="space-y-0.5">
                        {displayedClinicalFollowUpActions.actions.slice(0, 5).map((item, idx) => (
                          <li key={`cfa-${idx}`} className="text-xs text-gray-700">
                            - {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <p className="text-[11px] text-gray-600">
                  Sugestão de prioridade com base nos dados disponíveis. A decisão final permanece
                  responsabilidade do médico assistente.
                </p>
              </div>
            )}

            {displayedGlaucomaCorrelation?.isApplicable && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Correlação especializada — Glaucoma
                </h3>
                <p className="text-xs text-gray-700">
                  Estrutura x função: {displayedGlaucomaCorrelation.structureFunctionCorrelation}
                </p>
                {displayedGlaucomaCorrelation.dominantEye !== 'nao_informado' && (
                  <p className="text-xs text-gray-700">
                    Olho dominante: {displayedGlaucomaCorrelation.dominantEye.toUpperCase()}
                  </p>
                )}
                <p className="text-xs text-gray-700">
                  {displayedGlaucomaCorrelation.interEyeGlaucomaAsymmetry}
                </p>
                <p className="text-xs text-gray-700">
                  {displayedGlaucomaCorrelation.glaucomaInterpretation}
                </p>

                {displayedGlaucomaCorrelation.mainFindings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Principais achados</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedGlaucomaCorrelation.mainFindings.slice(0, 4).map((item, idx) => (
                        <li key={`gl-main-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedGlaucomaCorrelation.conflictsOrGaps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Conflitos / lacunas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedGlaucomaCorrelation.conflictsOrGaps
                        .slice(0, 3)
                        .map((item, idx) => (
                          <li key={`gl-gap-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedGlaucomaCorrelation.progressionSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Sinais temporais</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedGlaucomaCorrelation.progressionSignals
                        .slice(0, 2)
                        .map((item, idx) => (
                          <li key={`gl-prog-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedGlaucomaCorrelation.recommendedGlaucomaChecks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Checagens sugeridas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedGlaucomaCorrelation.recommendedGlaucomaChecks
                        .slice(0, 4)
                        .map((item, idx) => (
                          <li key={`gl-check-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedGlaucomaCorrelation.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações: {displayedGlaucomaCorrelation.limitations.slice(0, 3).join(' | ')}
                  </p>
                )}
              </div>
            )}

            {displayedRetinaCorrelation?.isApplicable && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Correlação especializada — Retina/Mácula
                </h3>
                <p className="text-xs text-gray-700">
                  Anatomia x sintomas: {displayedRetinaCorrelation.anatomicalClinicalCorrelation}
                </p>
                {displayedRetinaCorrelation.dominantEye !== 'nao_informado' && (
                  <p className="text-xs text-gray-700">
                    Olho dominante: {displayedRetinaCorrelation.dominantEye.toUpperCase()}
                  </p>
                )}
                <p className="text-xs text-gray-700">{displayedRetinaCorrelation.mainMacularFinding}</p>
                <p className="text-xs text-gray-700">
                  {displayedRetinaCorrelation.interEyeRetinaAsymmetry}
                </p>
                <p className="text-xs text-gray-700">{displayedRetinaCorrelation.retinaInterpretation}</p>

                {displayedRetinaCorrelation.mainFindings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Principais achados</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedRetinaCorrelation.mainFindings.slice(0, 4).map((item, idx) => (
                        <li key={`ret-main-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedRetinaCorrelation.conflictsOrGaps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Conflitos / lacunas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedRetinaCorrelation.conflictsOrGaps.slice(0, 3).map((item, idx) => (
                        <li key={`ret-gap-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedRetinaCorrelation.temporalSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Sinais temporais</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedRetinaCorrelation.temporalSignals.slice(0, 2).map((item, idx) => (
                        <li key={`ret-temp-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedRetinaCorrelation.recommendedRetinaChecks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Checagens sugeridas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedRetinaCorrelation.recommendedRetinaChecks
                        .slice(0, 4)
                        .map((item, idx) => (
                          <li key={`ret-check-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedRetinaCorrelation.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações: {displayedRetinaCorrelation.limitations.slice(0, 3).join(' | ')}
                  </p>
                )}
              </div>
            )}

            {displayedCorneaCorrelation?.isApplicable && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Correlação especializada — Córnea/Ectasia
                </h3>
                <p className="text-xs text-gray-700">
                  Coerência estrutural corneana: {displayedCorneaCorrelation.cornealStructuralCorrelation}
                </p>
                {displayedCorneaCorrelation.dominantEye !== 'nao_informado' && (
                  <p className="text-xs text-gray-700">
                    Olho dominante: {displayedCorneaCorrelation.dominantEye.toUpperCase()}
                  </p>
                )}
                <p className="text-xs text-gray-700">{displayedCorneaCorrelation.mainCornealFinding}</p>
                <p className="text-xs text-gray-700">
                  {displayedCorneaCorrelation.interEyeCornealAsymmetry}
                </p>
                <p className="text-xs text-gray-700">{displayedCorneaCorrelation.corneaInterpretation}</p>

                {displayedCorneaCorrelation.mainFindings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Principais achados</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedCorneaCorrelation.mainFindings.slice(0, 4).map((item, idx) => (
                        <li key={`cor-main-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedCorneaCorrelation.conflictsOrGaps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Conflitos / lacunas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedCorneaCorrelation.conflictsOrGaps.slice(0, 3).map((item, idx) => (
                        <li key={`cor-gap-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedCorneaCorrelation.progressionSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Sinais temporais</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedCorneaCorrelation.progressionSignals.slice(0, 2).map((item, idx) => (
                        <li key={`cor-temp-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayedCorneaCorrelation.recommendedCorneaChecks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Checagens sugeridas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedCorneaCorrelation.recommendedCorneaChecks
                        .slice(0, 4)
                        .map((item, idx) => (
                          <li key={`cor-check-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedCorneaCorrelation.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações: {displayedCorneaCorrelation.limitations.slice(0, 3).join(' | ')}
                  </p>
                )}
              </div>
            )}

            {displayedMultiDomainCorrelation?.isApplicable && (
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Harmonização dos eixos clínicos</h3>
                <p className="text-xs text-gray-700">
                  Domínios ativos:{' '}
                  {displayedMultiDomainCorrelation.activeDomains
                    .map((d) => `${d.domain} (${d.status})`)
                    .join(' | ')}
                </p>
                <p className="text-xs text-gray-700">
                  Domínio principal:{' '}
                  {displayedMultiDomainCorrelation.primaryDomain === 'indeterminate'
                    ? 'Indeterminado'
                    : displayedMultiDomainCorrelation.primaryDomain}
                </p>
                {displayedMultiDomainCorrelation.secondaryDomains.length > 0 && (
                  <p className="text-xs text-gray-700">
                    Secundários: {displayedMultiDomainCorrelation.secondaryDomains.join(', ')}
                  </p>
                )}
                <p className="text-xs text-gray-700">
                  {displayedMultiDomainCorrelation.harmonizedInterpretation}
                </p>

                {displayedMultiDomainCorrelation.domainConvergences.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Convergências</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedMultiDomainCorrelation.domainConvergences
                        .slice(0, 3)
                        .map((item, idx) => (
                          <li key={`md-conv-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedMultiDomainCorrelation.domainConflicts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Conflitos / ambiguidades</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedMultiDomainCorrelation.domainConflicts
                        .slice(0, 3)
                        .map((item, idx) => (
                          <li key={`md-conf-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedMultiDomainCorrelation.recommendedCrossChecks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-800">Checagens cruzadas</p>
                    <ul className="mt-1 space-y-0.5">
                      {displayedMultiDomainCorrelation.recommendedCrossChecks
                        .slice(0, 4)
                        .map((item, idx) => (
                          <li key={`md-check-${idx}`} className="text-xs text-gray-700">
                            - {item}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {displayedMultiDomainCorrelation.remainingAmbiguities.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Ambiguidades remanescentes:{' '}
                    {displayedMultiDomainCorrelation.remainingAmbiguities.slice(0, 3).join(' | ')}
                  </p>
                )}
                {displayedMultiDomainCorrelation.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações: {displayedMultiDomainCorrelation.limitations.slice(0, 3).join(' | ')}
                  </p>
                )}
              </div>
            )}

            {displayedDomainLongitudinal?.glaucomaLongitudinal?.isApplicable && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Longitudinal especializado — Glaucoma
                </h3>
                <p className="text-xs text-gray-700">
                  Tendência estrutural: {displayedDomainLongitudinal.glaucomaLongitudinal.structuralTrend}
                </p>
                <p className="text-xs text-gray-700">
                  Tendência funcional: {displayedDomainLongitudinal.glaucomaLongitudinal.functionalTrend}
                </p>
                <p className="text-xs text-gray-700">
                  Consistência longitudinal:{' '}
                  {displayedDomainLongitudinal.glaucomaLongitudinal.longitudinalConsistency}
                </p>
                {displayedDomainLongitudinal.glaucomaLongitudinal.dominantEye !== 'nao_informado' && (
                  <p className="text-xs text-gray-700">
                    Olho dominante:{' '}
                    {displayedDomainLongitudinal.glaucomaLongitudinal.dominantEye.toUpperCase()}
                  </p>
                )}
                <p className="text-xs text-gray-700">
                  {displayedDomainLongitudinal.glaucomaLongitudinal.glaucomaLongitudinalInterpretation}
                </p>
                {displayedDomainLongitudinal.glaucomaLongitudinal.progressionSignals.length > 0 && (
                  <ul className="space-y-0.5">
                    {displayedDomainLongitudinal.glaucomaLongitudinal.progressionSignals
                      .slice(0, 3)
                      .map((item, idx) => (
                        <li key={`lg-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                  </ul>
                )}
                {displayedDomainLongitudinal.glaucomaLongitudinal.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações:{' '}
                    {displayedDomainLongitudinal.glaucomaLongitudinal.limitations
                      .slice(0, 3)
                      .join(' | ')}
                  </p>
                )}
              </div>
            )}

            {displayedDomainLongitudinal?.retinaLongitudinal?.isApplicable && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Longitudinal especializado — Retina/Mácula
                </h3>
                <p className="text-xs text-gray-700">
                  Tendência retiniana: {displayedDomainLongitudinal.retinaLongitudinal.retinaTrend}
                </p>
                {displayedDomainLongitudinal.retinaLongitudinal.dominantEye !== 'nao_informado' && (
                  <p className="text-xs text-gray-700">
                    Olho dominante:{' '}
                    {displayedDomainLongitudinal.retinaLongitudinal.dominantEye.toUpperCase()}
                  </p>
                )}
                <p className="text-xs text-gray-700">
                  {displayedDomainLongitudinal.retinaLongitudinal.mainTemporalFinding}
                </p>
                <p className="text-xs text-gray-700">
                  {displayedDomainLongitudinal.retinaLongitudinal.retinaLongitudinalInterpretation}
                </p>
                {displayedDomainLongitudinal.retinaLongitudinal.progressionSignals.length > 0 && (
                  <ul className="space-y-0.5">
                    {displayedDomainLongitudinal.retinaLongitudinal.progressionSignals
                      .slice(0, 3)
                      .map((item, idx) => (
                        <li key={`lr-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                  </ul>
                )}
                {displayedDomainLongitudinal.retinaLongitudinal.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações:{' '}
                    {displayedDomainLongitudinal.retinaLongitudinal.limitations
                      .slice(0, 3)
                      .join(' | ')}
                  </p>
                )}
              </div>
            )}

            {displayedDomainLongitudinal?.corneaLongitudinal?.isApplicable && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Longitudinal especializado — Córnea/Ectasia
                </h3>
                <p className="text-xs text-gray-700">
                  Tendência corneana: {displayedDomainLongitudinal.corneaLongitudinal.cornealTrend}
                </p>
                {displayedDomainLongitudinal.corneaLongitudinal.dominantEye !== 'nao_informado' && (
                  <p className="text-xs text-gray-700">
                    Olho dominante:{' '}
                    {displayedDomainLongitudinal.corneaLongitudinal.dominantEye.toUpperCase()}
                  </p>
                )}
                <p className="text-xs text-gray-700">
                  {displayedDomainLongitudinal.corneaLongitudinal.corneaLongitudinalInterpretation}
                </p>
                {displayedDomainLongitudinal.corneaLongitudinal.progressionSignals.length > 0 && (
                  <ul className="space-y-0.5">
                    {displayedDomainLongitudinal.corneaLongitudinal.progressionSignals
                      .slice(0, 3)
                      .map((item, idx) => (
                        <li key={`lc-${idx}`} className="text-xs text-gray-700">
                          - {item}
                        </li>
                      ))}
                  </ul>
                )}
                {displayedDomainLongitudinal.corneaLongitudinal.limitations.length > 0 && (
                  <p className="text-[11px] text-gray-600">
                    Limitações:{' '}
                    {displayedDomainLongitudinal.corneaLongitudinal.limitations
                      .slice(0, 3)
                      .join(' | ')}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Avaliação médica do caso</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <label className="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="doctorAgreement"
                    checked={doctorAgreement === 'agree'}
                    onChange={() => setDoctorAgreement('agree')}
                  />
                  Concordo
                </label>
                <label className="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="doctorAgreement"
                    checked={doctorAgreement === 'partial'}
                    onChange={() => setDoctorAgreement('partial')}
                  />
                  Parcialmente concordo
                </label>
                <label className="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="doctorAgreement"
                    checked={doctorAgreement === 'disagree'}
                    onChange={() => setDoctorAgreement('disagree')}
                  />
                  Discordo
                </label>
              </div>
              <textarea
                value={doctorComment}
                onChange={(e) => setDoctorComment(e.target.value)}
                rows={2}
                placeholder="Comentário médico (opcional)"
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={doctorFinalInterpretation}
                onChange={(e) => setDoctorFinalInterpretation(e.target.value)}
                rows={3}
                placeholder="Interpretação final (opcional)"
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={archiveCase}
                  disabled={archiveLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {archiveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {archiveLoading ? 'Arquivando...' : 'Arquivar caso'}
                </button>
                {archiveFeedback.type === 'success' && (
                  <span className="text-xs text-emerald-700">{archiveFeedback.text}</span>
                )}
                {archiveFeedback.type === 'error' && (
                  <span className="text-xs text-red-700">{archiveFeedback.text}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">
                Fontes ({result.sources.length})
              </h3>
              {result.sources.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Sem fontes recuperadas para esta pergunta.
                </p>
              ) : (
                <div className="space-y-2">
                  {result.sources.map((src) => (
                    <div
                      key={`${src.id}-${src.title}`}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        [{src.id}] {src.title.replace(/\.(cdr|pdf)$/i, '')}
                      </p>
                      {src.page != null && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pág. {src.page}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                        {cleanSnippet(src.snippet)}
                      </p>
                      <a
                        href={`/api/oftpay/apostila-signed-url?title=${encodeURIComponent(
                          src.title.replace(/\.(cdr|pdf)$/i, '')
                        )}&courseId=${encodeURIComponent(courseId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-2"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Abrir apostila
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
