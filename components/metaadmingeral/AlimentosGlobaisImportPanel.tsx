'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileUp,
  Loader2,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  ROTULO_SEGMENTO_ALIMENTO,
  SEGMENTOS_ALIMENTO,
  type SegmentoAlimento,
} from '@/lib/metaadmingeral/alimentosGlobais';
import { ROTULO_STATUS_IMPORTACAO } from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';

type ImportacaoRow = {
  id: string;
  arquivoNome: string;
  fonteNome: string;
  status: keyof typeof ROTULO_STATUS_IMPORTACAO;
  totalPaginas: number;
  paginasProcessadas: number;
  totalItensExtraidos: number;
  totalValidos: number;
  totalComAtencao: number;
  totalParaRevisao: number;
  totalDuplicados: number;
  erro?: string | null;
  criadoEm?: string;
  documentFoodMap?: {
    totalPages: number;
    pagesMapped?: number;
    complete?: boolean;
    ranges?: Array<{
      startPage: number;
      endPage: number;
      classification: string;
    }>;
  } | null;
  mapSummary?: {
    pagesMapped: number;
    totalPages: number;
    complete: boolean;
    tablePages: number;
    narrativePages: number;
    referencePages: number;
    unknownPages: number;
    tableRanges: number;
  } | null;
  observability?: {
    geminiCalls: number;
    retryCalls: number;
    pagesSentToGemini: number;
    pagesSkippedNarrative: number;
    rateLimitHits: number;
    inputTokens: number;
    outputTokens: number;
  } | null;
  publicationSummary?: {
    extraidos: number;
    criados: number;
    mesclados: number;
    ignorados: number;
    comRevisaoPendente: number;
    falharam: number;
  } | null;
};

type ImportItemRow = {
  id: string;
  nome: string;
  codigoOriginal?: string | null;
  segmento?: SegmentoAlimento | null;
  segmentoSugerido?: SegmentoAlimento | null;
  energiaKcal?: number | null;
  proteinasG?: number | null;
  carboidratosG?: number | null;
  gordurasTotaisG?: number | null;
  fibrasG?: number | null;
  sourcePage?: number | null;
  sourceTable?: string | null;
  reviewStatus: string;
  qualityFlags: string[];
  duplicateCandidate: boolean;
  duplicateMatches?: Array<{ scope: string; id?: string; nome: string; reason: string }>;
  valoresOriginais?: Record<string, string | null>;
  nutrientesExtras?: Array<{
    nome: string;
    valor: number | null;
    unidade: string;
    valorOriginal?: string | null;
  }>;
  ignored?: boolean;
  extractionConfidence?: number | null;
  segmentoConfidence?: number | null;
  publicationAction?: 'CREATE' | 'MERGE' | 'SKIP' | null;
  publicationReadiness?: 'READY' | 'NEEDS_REVIEW' | 'BLOCKED' | 'IGNORED' | null;
  publicationStatus?: 'pending' | 'published' | 'skipped' | 'failed' | null;
  publishedFoodId?: string | null;
  mergeTargetFoodId?: string | null;
  publicationError?: string | null;
};

type MergeSuggestion = {
  field: string;
  existingValue: unknown;
  importedValue: unknown;
  suggestedResolution: string;
};

const inputCls =
  'w-full rounded-lg border border-white/20 bg-[#0A1F44] px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/35 focus:border-[#4CCB7A]/50 focus:outline-none';

async function authFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Não autenticado.');
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
    throw new Error(
      `API retornou HTML (HTTP ${res.status}) em vez de JSON. Rota ausente ou deploy antigo — atualize o servidor e tente de novo.`
    );
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Resposta inválida da API (HTTP ${res.status}): ${trimmed.slice(0, 120)}`
    );
  }
}

function formatMacro(v: number | null | undefined) {
  if (v == null) return '—';
  return String(v);
}

function reviewBadge(status: string) {
  if (status === 'OK') return 'border-[#4CCB7A]/40 bg-[#4CCB7A]/15 text-[#4CCB7A]';
  if (status === 'ATTENTION') return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  if (status === 'IGNORE') return 'border-white/15 bg-white/5 text-[#E8EDED]/40';
  return 'border-red-400/40 bg-red-950/40 text-red-200';
}

function readinessBadge(r: string | null | undefined) {
  if (r === 'READY') return 'border-[#4CCB7A]/40 bg-[#4CCB7A]/15 text-[#4CCB7A]';
  if (r === 'NEEDS_REVIEW') return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  if (r === 'IGNORED') return 'border-white/15 bg-white/5 text-[#E8EDED]/40';
  return 'border-red-400/40 bg-red-950/40 text-red-200';
}

function isSafeBatchItem(item: ImportItemRow) {
  return (
    !item.ignored &&
    item.publicationStatus !== 'published' &&
    item.publicationStatus !== 'skipped' &&
    (item.publicationAction === 'CREATE' || !item.publicationAction) &&
    item.publicationReadiness === 'READY' &&
    !item.duplicateCandidate
  );
}

export default function AlimentosGlobaisImportPanel() {
  const [importacoes, setImportacoes] = useState<ImportacaoRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fonteNome, setFonteNome] = useState('');
  const [fonteVersao, setFonteVersao] = useState('');
  const [fonteAno, setFonteAno] = useState('');
  const [licenca, setLicenca] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipoConteudo, setTipoConteudo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState<{
    phase: 'mapping' | 'reading';
    done: number;
    total: number;
    label: string;
  } | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeImport, setActiveImport] = useState<ImportacaoRow | null>(null);
  const [itens, setItens] = useState<ImportItemRow[]>([]);
  const [detailItem, setDetailItem] = useState<ImportItemRow | null>(null);
  const [lotes, setLotes] = useState<
    Array<{
      id: string;
      status: string;
      error?: string | null;
      pageStart: number;
      pageEnd: number;
      foodsExtracted?: number;
    }>
  >([]);
  const [publishMode, setPublishMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [mergeItem, setMergeItem] = useState<ImportItemRow | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
  const [mergeResolutions, setMergeResolutions] = useState<Record<string, string>>({});
  const [mergeLoading, setMergeLoading] = useState(false);
  const [inspectPage, setInspectPage] = useState<number | ''>('');
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState<{
    pageNumber: number;
    classification: string;
    textQuality: string;
    textChars: number;
    textPreview: string;
    schemaId?: string | null;
    foodsExtractedInLote?: number | null;
    loteStatus?: string | null;
    imageBase64?: string | null;
    imageMimeType?: string | null;
  } | null>(null);

  const carregarLista = useCallback(async () => {
    setLoadingList(true);
    setErro(null);
    try {
      const res = await authFetch('/api/metaadmingeral/alimentos-globais/importacoes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao listar.');
      setImportacoes(Array.isArray(data.importacoes) ? data.importacoes : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao listar importações.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  const abrirImportacao = async (id: string) => {
    setErro(null);
    setActiveId(id);
    try {
      const res = await authFetch(`/api/metaadmingeral/alimentos-globais/importacoes/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao abrir.');
      setActiveImport(data.importacao);
      setItens(Array.isArray(data.itens) ? data.itens : []);
      setLotes(Array.isArray(data.lotes) ? data.lotes : []);
      setSelected({});
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao abrir importação.');
    }
  };

  const upload = async () => {
    if (!file) {
      setErro('Selecione um PDF.');
      return;
    }
    if (!fonteNome.trim()) {
      setErro('Informe o nome da fonte.');
      return;
    }
    setUploading(true);
    setErro(null);
    setOkMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fonteNome', fonteNome.trim());
      if (fonteVersao.trim()) fd.append('fonteVersao', fonteVersao.trim());
      if (fonteAno.trim()) fd.append('fonteAno', fonteAno.trim());
      if (licenca.trim()) fd.append('licenca', licenca.trim());
      if (observacao.trim()) fd.append('observacao', observacao.trim());
      if (tipoConteudo.trim()) fd.append('tipoConteudoEsperado', tipoConteudo.trim());

      const res = await authFetch('/api/metaadmingeral/alimentos-globais/importacoes', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload.');
      setShowUpload(false);
      setFile(null);
      setOkMsg('PDF enviado. Mapeando páginas (quais têm tabela)…');
      await carregarLista();
      if (data.importacao?.id) {
        await abrirImportacao(data.importacao.id);
        await mapearDocumento(data.importacao.id);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no upload.');
    } finally {
      setUploading(false);
    }
  };

  const mapearDocumento = async (id: string, restart = false) => {
    setProcessing(true);
    setErro(null);
    setOkMsg(null);
    setPhaseProgress({
      phase: 'mapping',
      done: 0,
      total: activeImport?.totalPaginas || 1,
      label: 'Lendo arquivo e mapeando páginas com tabela…',
    });
    try {
      let done = false;
      let guard = 0;
      let first = true;
      while (!done && guard < 80) {
        guard += 1;
        const res = await authFetch(
          `/api/metaadmingeral/alimentos-globais/importacoes/${id}/map`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageBatchSize: 40,
              restart: first && restart,
            }),
          }
        );
        first = false;
        const data = await readApiJson(res);
        if (!res.ok) throw new Error(String(data.error || 'Falha no mapeamento.'));
        done = Boolean(data.done);
        const pagesMapped = Number(data.pagesMapped) || 0;
        const totalPages = Number(data.totalPages) || 1;
        if (data.importacao) setActiveImport(data.importacao as ImportacaoRow);
        setPhaseProgress({
          phase: 'mapping',
          done: pagesMapped,
          total: totalPages,
          label: String(data.message || `Mapeando ${pagesMapped}/${totalPages}…`),
        });
        setOkMsg(String(data.message || ''));
        if (done) break;
      }
      await carregarLista();
      await abrirImportacao(id);
      setOkMsg((prev) => prev || 'Mapeamento concluído. Clique em Ler Tabelas.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao mapear.');
    } finally {
      setProcessing(false);
      setPhaseProgress(null);
    }
  };

  const lerTabelas = async (id: string, maxLotes = 1) => {
    setProcessing(true);
    setErro(null);
    setOkMsg(null);
    const totalHint = activeImport?.totalPaginas || 1;
    setPhaseProgress({
      phase: 'reading',
      done: activeImport?.paginasProcessadas || 0,
      total: totalHint,
      label: 'Identificando colunas e lendo linhas das tabelas…',
    });
    try {
      let done = false;
      let guard = 0;
      while (!done && guard < 8) {
        guard += 1;
        const res = await authFetch(
          `/api/metaadmingeral/alimentos-globais/importacoes/${id}/process`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxLotes }),
          }
        );
        const data = await readApiJson(res);
        if (!res.ok) throw new Error(String(data.error || 'Falha na leitura das tabelas.'));
        done = Boolean(data.done);
        if (data.importacao) {
          const imp = data.importacao as ImportacaoRow;
          setActiveImport(imp);
          setPhaseProgress({
            phase: 'reading',
            done: imp.paginasProcessadas,
            total: Math.max(1, imp.totalPaginas),
            label: String(
              (data.messages as string[] | undefined)?.[0] ||
                `Lendo tabelas ${imp.paginasProcessadas}/${imp.totalPaginas}…`
            ),
          });
        }
        if (Array.isArray(data.itens)) setItens(data.itens as ImportItemRow[]);
        if (Array.isArray(data.messages) && data.messages.length) {
          setOkMsg((data.messages as string[]).join(' · '));
        }
        const msg = String((data.messages as string[] | undefined)?.[0] || '');
        if (/Aguardando Gemini|Limite temporário/i.test(msg)) {
          break;
        }
        if (done) break;
      }
      await carregarLista();
      await abrirImportacao(id);
      if (!done) {
        setOkMsg((prev) => prev || 'Leitura parcial — clique em Continuar leitura quando quiser.');
      } else {
        setOkMsg((prev) => prev || 'Leitura concluída. Revise antes de publicar.');
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao ler tabelas.');
    } finally {
      setProcessing(false);
      setPhaseProgress(null);
    }
  };

  const retryLote = async (loteId: string) => {
    if (!activeId) return;
    setProcessing(true);
    setErro(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/retry-lote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loteId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no retry.');
      setOkMsg(data.message || 'Lote reprocessado.');
      await abrirImportacao(activeId);
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no retry.');
    } finally {
      setProcessing(false);
    }
  };

  const resetarEReprocessar = async () => {
    if (!activeId) return;
    const ok = window.confirm(
      'Zerar esta importação e mapear de novo do início?\n\nItens já extraídos desta importação serão apagados (nada publicado em alimentos_globais é afetado).'
    );
    if (!ok) return;
    setProcessing(true);
    setErro(null);
    setOkMsg(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' }),
        }
      );
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(String(data.error || 'Falha ao resetar.'));
      setOkMsg(String(data.message || 'Reset ok. Mapeando…'));
      if (data.importacao) setActiveImport(data.importacao as ImportacaoRow);
      setLotes(Array.isArray(data.lotes) ? (data.lotes as typeof lotes) : []);
      setItens([]);
      await mapearDocumento(activeId, true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao reprocessar.');
      setProcessing(false);
      setPhaseProgress(null);
    }
  };

  const inspecionarPagina = async () => {
    if (!activeId || !inspectPage) return;
    setInspectLoading(true);
    setErro(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/inspect-page?page=${inspectPage}`
      );
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(String(data.error || 'Falha ao inspecionar.'));
      setInspectData(data as typeof inspectData);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao inspecionar página.');
    } finally {
      setInspectLoading(false);
    }
  };

  const patchItem = async (itemId: string, patch: Record<string, unknown>) => {
    if (!activeId) return;
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/itens/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar.');
      setItens((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...data.item } : i)));
      if (detailItem?.id === itemId) setDetailItem({ ...detailItem, ...data.item });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao editar item.');
    }
  };

  const publishOne = async (item: ImportItemRow, forceReviewAlerts = false) => {
    if (!activeId) return;
    setPublishing(true);
    setErro(null);
    try {
      const action = item.publicationAction === 'SKIP' ? 'SKIP' : 'CREATE';
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/itens/${item.id}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, forceReviewAlerts }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.result?.error || 'Falha ao publicar.');
      if (data.result && !data.result.ok) throw new Error(data.result.error || 'Não publicado.');
      if (data.item) {
        setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...data.item } : i)));
      }
      setOkMsg(
        data.result?.idempotent
          ? 'Já estava publicado (idempotente).'
          : action === 'SKIP'
            ? 'Item ignorado.'
            : 'Alimento criado.'
      );
      await abrirImportacao(activeId);
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const publishSelected = async () => {
    if (!activeId) return;
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .filter((id) => {
        const item = itens.find((i) => i.id === id);
        return item && isSafeBatchItem(item);
      });
    if (!ids.length) {
      setErro('Selecione itens READY + CREATE sem duplicidade.');
      return;
    }
    setPublishing(true);
    setErro(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: ids }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na publicação em lote.');
      const ok = (data.results || []).filter((r: { ok: boolean }) => r.ok).length;
      const fail = (data.results || []).length - ok;
      setOkMsg(
        `Publicação em lote: ${ok} ok · ${fail} falha. Criados: ${data.summary?.criados ?? '—'} · Mesclados: ${data.summary?.mesclados ?? '—'}`
      );
      if (Array.isArray(data.itens)) setItens(data.itens);
      if (data.importacao) setActiveImport(data.importacao);
      setSelected({});
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no lote.');
    } finally {
      setPublishing(false);
    }
  };

  const openMerge = async (item: ImportItemRow) => {
    const defaultTarget =
      item.mergeTargetFoodId ||
      item.duplicateMatches?.find((m) => m.scope === 'global' && m.id)?.id ||
      '';
    setMergeItem(item);
    setMergeTargetId(defaultTarget);
    setMergeSuggestions([]);
    setMergeResolutions({});
    if (defaultTarget && activeId) {
      await loadMergePreview(item.id, defaultTarget);
    }
  };

  const loadMergePreview = async (itemId: string, targetFoodId: string) => {
    if (!activeId || !targetFoodId.trim()) return;
    setMergeLoading(true);
    setErro(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/itens/${itemId}/merge?targetFoodId=${encodeURIComponent(targetFoodId.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no preview.');
      const suggestions: MergeSuggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];
      setMergeSuggestions(suggestions);
      const resMap: Record<string, string> = {};
      for (const s of suggestions) {
        resMap[s.field] = s.suggestedResolution;
      }
      setMergeResolutions(resMap);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no preview de merge.');
    } finally {
      setMergeLoading(false);
    }
  };

  const confirmMerge = async () => {
    if (!activeId || !mergeItem || !mergeTargetId.trim()) return;
    const unresolved = Object.values(mergeResolutions).some((r) => r === 'UNRESOLVED');
    if (unresolved) {
      setErro('Resolva todos os conflitos antes de mesclar.');
      return;
    }
    setPublishing(true);
    setErro(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/alimentos-globais/importacoes/${activeId}/itens/${mergeItem.id}/merge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetFoodId: mergeTargetId.trim(),
            resolutions: mergeResolutions,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no merge.');
      if (data.result && !data.result.ok) throw new Error(data.result.error || 'Merge recusado.');
      setOkMsg(data.result?.idempotent ? 'Merge já aplicado (idempotente).' : 'Merge concluído.');
      setMergeItem(null);
      await abrirImportacao(activeId);
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no merge.');
    } finally {
      setPublishing(false);
    }
  };

  const visibleItens = useMemo(
    () => (publishMode ? itens : itens.filter((i) => !i.ignored)),
    [itens, publishMode]
  );

  const summary = activeImport?.publicationSummary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#E8EDED]">Importações PDF</h3>
          <p className="mt-1 text-xs text-[#E8EDED]/55 max-w-2xl leading-relaxed">
            PDF → Gemini → draft → revisão humana → CREATE / MERGE / SKIP →{' '}
            <code className="text-[#4CCB7A]/90">alimentos_globais</code>. MetaNutri ainda não
            consome esta base (ETAPA 05).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setErro(null);
            setShowUpload(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 px-3.5 py-2.5 text-sm font-semibold text-[#4CCB7A] hover:bg-[#4CCB7A]/25"
        >
          <FileUp className="h-4 w-4" />
          Importar PDF
        </button>
      </div>

      {erro ? (
        <p className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {erro}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-3 py-2 text-sm text-[#4CCB7A]">
          {okMsg}
        </p>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {loadingList ? (
          <div className="flex items-center gap-2 px-4 py-8 text-sm text-[#E8EDED]/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando importações...
          </div>
        ) : importacoes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#E8EDED]/45">
            Nenhuma importação ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-[#E8EDED]/45 bg-black/20">
                <tr>
                  <th className="px-3 py-2">Arquivo</th>
                  <th className="px-3 py-2">Fonte</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Progresso</th>
                  <th className="px-3 py-2">Encontrados</th>
                  <th className="px-3 py-2">Revisão</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {importacoes.map((imp) => (
                  <tr key={imp.id} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2 text-[#E8EDED]">{imp.arquivoNome}</td>
                    <td className="px-3 py-2 text-[#E8EDED]/70">{imp.fonteNome}</td>
                    <td className="px-3 py-2 text-xs">
                      {ROTULO_STATUS_IMPORTACAO[imp.status] || imp.status}
                      {imp.erro ? (
                        <span className="ml-1 text-red-300" title={imp.erro}>
                          !
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-[#E8EDED]/70">
                      {imp.paginasProcessadas}/{imp.totalPaginas}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{imp.totalItensExtraidos}</td>
                    <td className="px-3 py-2 text-xs text-[#E8EDED]/60">
                      OK {imp.totalValidos} · Atenção {imp.totalComAtencao} · Revisar{' '}
                      {imp.totalParaRevisao}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => void abrirImportacao(imp.id)}
                        className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-[#E8EDED]/80 hover:bg-white/10"
                      >
                        Abrir
                      </button>
                      {imp.status === 'uploaded' || imp.status === 'mapping' ? (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => void mapearDocumento(imp.id)}
                          className="rounded-lg border border-[#4CCB7A]/30 px-2 py-1 text-[11px] font-semibold text-[#4CCB7A] hover:bg-[#4CCB7A]/10 disabled:opacity-50"
                        >
                          {processing && activeId === imp.id ? '…' : 'Mapear'}
                        </button>
                      ) : null}
                      {imp.status === 'mapped' ||
                      imp.status === 'processing' ||
                      imp.status === 'failed' ||
                      imp.status === 'partially_completed' ? (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => void lerTabelas(imp.id)}
                          className="rounded-lg border border-[#4CCB7A]/30 px-2 py-1 text-[11px] font-semibold text-[#4CCB7A] hover:bg-[#4CCB7A]/10 disabled:opacity-50"
                        >
                          {processing && activeId === imp.id
                            ? '…'
                            : imp.status === 'mapped'
                              ? 'Ler Tabelas'
                              : 'Continuar'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeImport ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-[#E8EDED]">{activeImport.arquivoNome}</h4>
              <p className="text-xs text-[#E8EDED]/55">
                {activeImport.fonteNome} · {activeImport.paginasProcessadas}/
                {activeImport.totalPaginas} págs lidas ·{' '}
                {itens.filter((i) => !i.ignored).length} itens
              </p>
              {activeImport.mapSummary ? (
                <p className="mt-1 text-[11px] text-[#E8EDED]/70 tabular-nums">
                  Mapeadas: {activeImport.mapSummary.pagesMapped}/
                  {activeImport.mapSummary.totalPages} · Tabelas:{' '}
                  {activeImport.mapSummary.tablePages} págs (
                  {activeImport.mapSummary.tableRanges} faixa
                  {activeImport.mapSummary.tableRanges === 1 ? '' : 's'}) · Narrativa{' '}
                  {activeImport.mapSummary.narrativePages}
                  {activeImport.mapSummary.complete ? '' : ' · mapa incompleto'}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-amber-200/80">
                  Documento ainda não mapeado — use Mapear páginas.
                </p>
              )}
              <p className="mt-1 text-[11px] text-[#E8EDED]/70 tabular-nums">
                Lidas: {activeImport.paginasProcessadas}/{activeImport.totalPaginas} ·
                Alimentos: {activeImport.totalItensExtraidos} · Revisar:{' '}
                {activeImport.totalParaRevisao}
              </p>
              {activeImport.observability ? (
                <p className="mt-1 text-[11px] text-[#E8EDED]/55 tabular-nums">
                  Gemini {activeImport.observability.geminiCalls} · Retries{' '}
                  {activeImport.observability.retryCalls} · Rate limits{' '}
                  {activeImport.observability.rateLimitHits} · Págs. enviadas{' '}
                  {activeImport.observability.pagesSentToGemini} · Narrativa{' '}
                  {activeImport.observability.pagesSkippedNarrative}
                </p>
              ) : null}
              {summary ? (
                <p className="mt-1 text-[11px] text-[#E8EDED]/70">
                  Extraídos {summary.extraidos} · Criados {summary.criados} · Mesclados{' '}
                  {summary.mesclados} · Ignorados {summary.ignorados} · Pendentes{' '}
                  {summary.comRevisaoPendente} · Falhas {summary.falharam}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-amber-200/80 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Nada publicado automaticamente — use revisão humana.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!activeImport.mapSummary?.complete ? (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => void mapearDocumento(activeImport.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4CCB7A] px-3 py-2 text-xs font-semibold text-[#0A1F44] disabled:opacity-50"
                >
                  {processing && phaseProgress?.phase === 'mapping' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Mapear páginas
                </button>
              ) : null}
              {activeImport.mapSummary?.complete &&
              activeImport.status !== 'review' &&
              activeImport.status !== 'completed' ? (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => void lerTabelas(activeImport.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4CCB7A] px-3 py-2 text-xs font-semibold text-[#0A1F44] disabled:opacity-50"
                >
                  {processing && phaseProgress?.phase === 'reading' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {activeImport.status === 'mapped' || activeImport.paginasProcessadas === 0
                    ? 'Ler Tabelas'
                    : 'Continuar leitura'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={processing}
                onClick={() => void resetarEReprocessar()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50"
                title="Zera itens/lotes/mapa e remapeia o PDF do início"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reprocessar do início
              </button>
              <button
                type="button"
                onClick={() => setPublishMode((v) => !v)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  publishMode
                    ? 'border-[#4CCB7A]/50 bg-[#4CCB7A]/15 text-[#4CCB7A]'
                    : 'border-white/15 text-[#E8EDED]/80'
                }`}
              >
                {publishMode ? 'Revisar para publicação ✓' : 'Preparar publicação'}
              </button>
              {publishMode ? (
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => void publishSelected()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#4CCB7A]/40 bg-[#4CCB7A]/20 px-3 py-2 text-xs font-semibold text-[#4CCB7A] disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Publicar selecionados
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setActiveId(null);
                  setActiveImport(null);
                  setItens([]);
                  setPublishMode(false);
                }}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-[#E8EDED]/70"
              >
                Fechar
              </button>
            </div>
          </div>

          {phaseProgress ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-[#E8EDED]/80">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4CCB7A]" />
                  {phaseProgress.phase === 'mapping'
                    ? 'Fase 1 — Mapear páginas'
                    : 'Fase 2 — Ler Tabelas'}
                </span>
                <span className="tabular-nums text-[#E8EDED]/55">
                  {phaseProgress.done}/{phaseProgress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#4CCB7A] transition-[width] duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (100 * phaseProgress.done) / Math.max(1, phaseProgress.total)
                      )
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-[#E8EDED]/55">{phaseProgress.label}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#E8EDED]/55">Inspecionar página</span>
            <input
              type="number"
              min={1}
              max={activeImport.totalPaginas || undefined}
              value={inspectPage}
              onChange={(e) =>
                setInspectPage(e.target.value ? Number(e.target.value) : '')
              }
              className="w-20 rounded-lg border border-white/20 bg-[#0A1F44] px-2 py-1 text-xs text-[#E8EDED]"
              placeholder="Nº"
            />
            <button
              type="button"
              disabled={inspectLoading || !inspectPage}
              onClick={() => void inspecionarPagina()}
              className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-[#E8EDED]/80 hover:bg-white/10 disabled:opacity-50"
            >
              {inspectLoading ? '…' : 'Abrir'}
            </button>
            {inspectData ? (
              <span className="text-[11px] text-[#E8EDED]/60 tabular-nums">
                p{inspectData.pageNumber}: {inspectData.classification} ·{' '}
                {inspectData.textQuality} · {inspectData.textChars} chars · lote{' '}
                {inspectData.loteStatus || '—'} · foods{' '}
                {inspectData.foodsExtractedInLote ?? '—'}
              </span>
            ) : null}
          </div>
          {inspectData ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-[#E8EDED]/70">
                {inspectData.textPreview}
              </pre>
              {inspectData.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:${inspectData.imageMimeType || 'image/png'};base64,${inspectData.imageBase64}`}
                  alt={`Página ${inspectData.pageNumber}`}
                  className="max-h-80 w-auto rounded-lg border border-white/10"
                />
              ) : (
                <p className="text-[11px] text-amber-200/80">Imagem indisponível nesta página.</p>
              )}
            </div>
          ) : null}

          {lotes.some(
            (l) =>
              l.status === 'failed' ||
              l.status === 'failed_extraction' ||
              l.status === 'failed_transient' ||
              l.status === 'waiting_retry' ||
              (l.status === 'done' && (l.foodsExtracted ?? 0) === 0)
          ) ? (
            <div className="space-y-1">
              {lotes
                .filter(
                  (l) =>
                    l.status === 'failed' ||
                    l.status === 'failed_extraction' ||
                    l.status === 'failed_transient' ||
                    l.status === 'waiting_retry' ||
                    (l.status === 'done' && (l.foodsExtracted ?? 0) === 0)
                )
                .slice(0, 12)
                .map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-950/20 px-3 py-2 text-xs text-amber-100"
                  >
                    <span>
                      Lote {l.pageStart}-{l.pageEnd}:{' '}
                      {l.status === 'waiting_retry'
                        ? 'Limite temporário — nova tentativa'
                        : l.status === 'failed_transient'
                          ? 'Falha temporária'
                          : l.status === 'failed_extraction'
                            ? 'Revisar extração'
                            : l.status}
                      {(l.foodsExtracted ?? 0) === 0 && l.status !== 'waiting_retry'
                        ? ' · 0 alimentos'
                        : ''}
                      {l.error ? ` — ${l.error}` : ''}
                    </span>
                    {l.status !== 'waiting_retry' ? (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => void retryLote(l.id)}
                        className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-[#E8EDED]/45 bg-black/20">
                <tr>
                  {publishMode ? <th className="px-2 py-2">Sel.</th> : null}
                  <th className="px-2 py-2">Status</th>
                  {publishMode ? <th className="px-2 py-2">Pub.</th> : null}
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Segmento</th>
                  <th className="px-2 py-2 text-right">kcal</th>
                  <th className="px-2 py-2 text-right">Prot.</th>
                  <th className="px-2 py-2 text-right">Carb.</th>
                  <th className="px-2 py-2 text-right">Gord.</th>
                  <th className="px-2 py-2 text-right">Fibra</th>
                  <th className="px-2 py-2">Dup.</th>
                  {publishMode ? <th className="px-2 py-2">Ação</th> : null}
                  <th className="px-2 py-2">Pág.</th>
                  <th className="px-2 py-2 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleItens.map((item) => {
                  const published = item.publicationStatus === 'published';
                  const safe = isSafeBatchItem(item);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.03]">
                      {publishMode ? (
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            disabled={!safe || published}
                            checked={Boolean(selected[item.id])}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))
                            }
                            title={
                              safe
                                ? 'Seguro para lote'
                                : 'Somente READY + CREATE sem duplicidade'
                            }
                          />
                        </td>
                      ) : null}
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${reviewBadge(item.reviewStatus)}`}
                        >
                          {item.reviewStatus}
                        </span>
                      </td>
                      {publishMode ? (
                        <td className="px-2 py-2">
                          {published ? (
                            <span className="inline-flex items-center gap-1 rounded border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#4CCB7A]">
                              Publicado
                            </span>
                          ) : (
                            <span
                              className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${readinessBadge(item.publicationReadiness)}`}
                            >
                              {item.publicationReadiness || '—'}
                            </span>
                          )}
                        </td>
                      ) : null}
                      <td className="px-2 py-2 text-xs text-[#E8EDED]/60">
                        {item.codigoOriginal || '—'}
                      </td>
                      <td className="px-2 py-2 text-[#E8EDED] max-w-[200px]">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => setDetailItem(item)}
                        >
                          {item.nome}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={item.segmento || ''}
                          disabled={published}
                          onChange={(e) =>
                            void patchItem(item.id, {
                              segmento: e.target.value || null,
                            })
                          }
                          className="max-w-[140px] rounded border border-white/15 bg-[#0A1F44] px-1 py-1 text-[11px] text-[#E8EDED] disabled:opacity-50"
                        >
                          <option value="">—</option>
                          {SEGMENTOS_ALIMENTO.map((s) => (
                            <option key={s} value={s}>
                              {ROTULO_SEGMENTO_ALIMENTO[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatMacro(item.energiaKcal)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatMacro(item.proteinasG)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatMacro(item.carboidratosG)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatMacro(item.gordurasTotaisG)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatMacro(item.fibrasG)}
                      </td>
                      <td className="px-2 py-2 text-[10px] text-amber-200/80">
                        {item.duplicateCandidate ? 'sim' : '—'}
                      </td>
                      {publishMode ? (
                        <td className="px-2 py-2">
                          <select
                            disabled={published}
                            value={item.publicationAction || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              void patchItem(item.id, { publicationAction: v });
                            }}
                            className="rounded border border-white/15 bg-[#0A1F44] px-1 py-1 text-[10px] text-[#E8EDED] disabled:opacity-50"
                          >
                            <option value="">—</option>
                            <option value="CREATE">Criar novo</option>
                            <option value="MERGE">Mesclar</option>
                            <option value="SKIP">Ignorar</option>
                          </select>
                        </td>
                      ) : null}
                      <td className="px-2 py-2 text-xs">{item.sourcePage ?? '—'}</td>
                      <td className="px-2 py-2 text-right space-x-1 whitespace-nowrap">
                        {published && item.publishedFoodId ? (
                          <a
                            href={`#alimento-${item.publishedFoodId}`}
                            className="inline-flex items-center gap-0.5 text-[10px] text-[#4CCB7A] hover:underline"
                            title={item.publishedFoodId}
                            onClick={(e) => {
                              e.preventDefault();
                              setOkMsg(`Alimento publicado: ${item.publishedFoodId}`);
                            }}
                          >
                            Ver alimento <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : publishMode ? (
                          <>
                            {item.publicationAction === 'MERGE' || item.duplicateCandidate ? (
                              <button
                                type="button"
                                onClick={() => void openMerge(item)}
                                className="text-[10px] text-amber-200 hover:underline"
                              >
                                Mesclar
                              </button>
                            ) : null}
                            {item.publicationAction === 'CREATE' || !item.publicationAction ? (
                              <button
                                type="button"
                                disabled={publishing || item.publicationReadiness === 'BLOCKED'}
                                onClick={() =>
                                  void publishOne(
                                    { ...item, publicationAction: 'CREATE' },
                                    item.publicationReadiness === 'NEEDS_REVIEW'
                                  )
                                }
                                className="text-[10px] text-[#4CCB7A] hover:underline disabled:opacity-40"
                              >
                                Publicar
                              </button>
                            ) : null}
                            {item.publicationAction === 'SKIP' ? (
                              <button
                                type="button"
                                disabled={publishing}
                                onClick={() =>
                                  void publishOne({ ...item, publicationAction: 'SKIP' })
                                }
                                className="text-[10px] text-[#E8EDED]/50 hover:underline"
                              >
                                Confirmar skip
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void patchItem(item.id, { ignored: true, reviewStatus: 'IGNORE' })
                            }
                            className="text-[10px] text-[#E8EDED]/45 hover:text-red-300"
                          >
                            Ignorar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showUpload ? (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F2744] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-[#E8EDED]">Importar PDF</h3>
              <button type="button" onClick={() => setShowUpload(false)} className="p-1.5 text-[#E8EDED]/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Arquivo PDF *</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-[#E8EDED]/70"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Nome da fonte *</span>
                <input
                  className={inputCls}
                  value={fonteNome}
                  onChange={(e) => setFonteNome(e.target.value)}
                  placeholder="Ex.: Tabela TBCA 2023"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">Versão</span>
                  <input
                    className={inputCls}
                    value={fonteVersao}
                    onChange={(e) => setFonteVersao(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">Ano</span>
                  <input
                    className={inputCls}
                    value={fonteAno}
                    onChange={(e) => setFonteAno(e.target.value)}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Licença</span>
                <input className={inputCls} value={licenca} onChange={(e) => setLicenca(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Tipo esperado (opcional)</span>
                <input
                  className={inputCls}
                  value={tipoConteudo}
                  onChange={(e) => setTipoConteudo(e.target.value)}
                  placeholder="Ex.: tabela carboidratos / quadro 1"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Observação</span>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </label>
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-[#E8EDED]/80"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void upload()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#4CCB7A] py-2.5 text-sm font-semibold text-[#0A1F44] disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Processar PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailItem ? (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0F2744] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex justify-between">
              <h3 className="font-bold text-[#E8EDED] text-sm">{detailItem.nome}</h3>
              <button type="button" onClick={() => setDetailItem(null)}>
                <X className="h-5 w-5 text-[#E8EDED]/60" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-xs text-[#E8EDED]/75 max-h-[70vh] overflow-y-auto">
              <p>
                Página: {detailItem.sourcePage ?? '—'} · Tabela: {detailItem.sourceTable || '—'} ·
                Código: {detailItem.codigoOriginal || '—'}
              </p>
              <p>
                Pub: {detailItem.publicationReadiness || '—'} / {detailItem.publicationAction || '—'}{' '}
                / {detailItem.publicationStatus || 'pending'}
                {detailItem.publishedFoodId ? ` → ${detailItem.publishedFoodId}` : ''}
              </p>
              <p className="font-semibold text-[#E8EDED]">qualityFlags</p>
              <p>{(detailItem.qualityFlags || []).join(', ') || '—'}</p>
              {detailItem.duplicateCandidate ? (
                <div>
                  <p className="font-semibold text-amber-200">Duplicatas (sugestão)</p>
                  <ul className="list-disc pl-4">
                    {(detailItem.duplicateMatches || []).map((m, idx) => (
                      <li key={idx}>
                        [{m.scope}] {m.nome} — {m.reason}
                        {m.id ? ` (${m.id})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="font-semibold text-[#E8EDED]">valoresOriginais</p>
              <pre className="rounded bg-black/30 p-2 overflow-x-auto text-[10px]">
                {JSON.stringify(detailItem.valoresOriginais || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {mergeItem ? (
        <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0F2744] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex justify-between">
              <div>
                <h3 className="font-bold text-[#E8EDED] text-sm">Mesclar com existente</h3>
                <p className="text-[11px] text-[#E8EDED]/55">{mergeItem.nome}</p>
              </div>
              <button type="button" onClick={() => setMergeItem(null)}>
                <X className="h-5 w-5 text-[#E8EDED]/60" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="flex gap-2 items-end">
                <label className="flex-1 block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">
                    ID do alimento global
                  </span>
                  <input
                    className={inputCls}
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    placeholder="id em alimentos_globais"
                  />
                </label>
                <button
                  type="button"
                  disabled={mergeLoading || !mergeTargetId.trim()}
                  onClick={() => void loadMergePreview(mergeItem.id, mergeTargetId)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-[#E8EDED] disabled:opacity-50"
                >
                  {mergeLoading ? '…' : 'Comparar'}
                </button>
              </div>
              {mergeSuggestions.length ? (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/20 text-[10px] uppercase text-[#E8EDED]/45">
                      <tr>
                        <th className="px-2 py-2">Campo</th>
                        <th className="px-2 py-2">Existente</th>
                        <th className="px-2 py-2">Importado</th>
                        <th className="px-2 py-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mergeSuggestions
                        .filter(
                          (s) =>
                            s.suggestedResolution === 'UNRESOLVED' ||
                            s.suggestedResolution === 'USE_IMPORTED' ||
                            (s.existingValue != null && s.importedValue != null)
                        )
                        .map((s) => (
                          <tr key={s.field}>
                            <td className="px-2 py-1.5 font-mono text-[10px]">{s.field}</td>
                            <td className="px-2 py-1.5">{String(s.existingValue ?? '—')}</td>
                            <td className="px-2 py-1.5">{String(s.importedValue ?? '—')}</td>
                            <td className="px-2 py-1.5">
                              <select
                                value={mergeResolutions[s.field] || s.suggestedResolution}
                                onChange={(e) =>
                                  setMergeResolutions((prev) => ({
                                    ...prev,
                                    [s.field]: e.target.value,
                                  }))
                                }
                                className={`rounded border bg-[#0A1F44] px-1 py-1 text-[10px] ${
                                  (mergeResolutions[s.field] || s.suggestedResolution) ===
                                  'UNRESOLVED'
                                    ? 'border-red-400/50 text-red-200'
                                    : 'border-white/15 text-[#E8EDED]'
                                }`}
                              >
                                <option value="KEEP_EXISTING">Manter existente</option>
                                <option value="USE_IMPORTED">Usar importado</option>
                                <option value="UNRESOLVED">Não resolvido</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#E8EDED]/45">
                  Informe o ID e clique em Comparar.
                </p>
              )}
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => setMergeItem(null)}
                className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-[#E8EDED]/80"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={publishing || mergeLoading || !mergeSuggestions.length}
                onClick={() => void confirmMerge()}
                className="flex-1 rounded-lg bg-[#4CCB7A] py-2.5 text-sm font-semibold text-[#0A1F44] disabled:opacity-50"
              >
                Confirmar merge
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
