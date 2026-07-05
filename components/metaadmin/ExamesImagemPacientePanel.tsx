'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { storagePathFromGcsPublicUrl } from '@/lib/metaadmin/examesImagemStoragePath';
import type { ExameDeImagemPaciente } from '@/types/obesidade';
import {
  TIPOS_EXAME_IMAGEM,
  type TipoExameImagem,
  type ExameImagemExtracaoNormalizada,
  mergeExameImagemExtracoes,
  normalizarRespostaExameImagemIA,
} from '@/lib/metaadmin/exameImagemExtracao';
import { prepararPdfsParaIaGemini } from '@/lib/metaadmin/prepararPdfsParaIaGemini';
import { avaliarPdfProvavelSecaoExames } from '@/lib/metaadmin/pdfSecaoExamesHeuristica';
import {
  exameImagemExibeComoImagem,
  isMimeExameImagemAceito,
  mimeNormalizadoExameImagem,
} from '@/lib/metaadmin/examesImagemAllowedMime';

/** Imagens antes de PDF: em Safari iOS (e alguns Android) `application/pdf` primeiro faz o picker parecer “só PDF”. */
const ACCEPT_EXAMES_IMAGEM_ATTR =
  'image/*,image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,application/pdf,.pdf';

function normalizarNomeComparacao(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

const TIPO_LABELS: Record<TipoExameImagem, string> = {
  usg: 'Ultrassonografia (USG)',
  tomografia: 'Tomografia (TC)',
  ressonancia: 'Ressonância magnética (RM)',
  raio_x: 'Raio-X',
  densitometria: 'Densitometria óssea',
  medicina_nuclear: 'Medicina nuclear / PET-CT',
  endoscopia: 'Endoscopia',
  outro: 'Outro exame de imagem',
  desconhecido: 'Não identificado',
};

async function fetchWithMedicoAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

type Props = {
  pacienteId: string;
  nomePacienteProntuario: string;
  examesDeImagem: ExameDeImagemPaciente[] | undefined;
  onAdicionarExame: (item: ExameDeImagemPaciente) => void;
  onRemoverExame: (id: string) => void;
  confirmarNomePacienteDoAnexo: (nomeAnexo: string, nomeProntuario: string) => Promise<boolean>;
  /** Lista compacta no mobile; pré-visualização em modal separado. */
  layout?: 'default' | 'mobileStack';
  /** Portal paciente: sem adicionar/remover; só lista e visualização. */
  somenteLeitura?: boolean;
};

export function ExamesImagemPacientePanel({
  pacienteId,
  nomePacienteProntuario,
  examesDeImagem,
  onAdicionarExame,
  onRemoverExame,
  confirmarNomePacienteDoAnexo,
  layout = 'default',
  somenteLeitura = false,
}: Props) {
  const mobileStack = layout === 'mobileStack';
  const exames = examesDeImagem ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Mobile: PDF só neste modal, não na lista. */
  const [visualizarPdfModalAberto, setVisualizarPdfModalAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [faseModal, setFaseModal] = useState<'escolher' | 'ia' | 'revisar'>('escolher');
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null);
  const [extraido, setExtraido] = useState<ExameImagemExtracaoNormalizada | null>(null);
  const [tipoEdicao, setTipoEdicao] = useState<TipoExameImagem>('desconhecido');
  const [dataEdicao, setDataEdicao] = useState('');
  const [erroModal, setErroModal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  useEffect(() => {
    if (!exames.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !exames.some((e) => e.id === selectedId)) {
      setSelectedId(exames[0].id);
    }
  }, [exames, selectedId]);

  const selecionado = useMemo(
    () => exames.find((e) => e.id === selectedId) ?? null,
    [exames, selectedId]
  );

  const previewComoImagem = useMemo(
    () => exameImagemExibeComoImagem(selecionado?.mimeArquivo, selecionado?.nomeArquivo),
    [selecionado?.mimeArquivo, selecionado?.nomeArquivo]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      if (!selecionado) {
        setPreviewSrc(null);
        setPreviewErr(null);
        setPreviewLoading(false);
        return;
      }
      if (mobileStack && !visualizarPdfModalAberto) {
        setPreviewSrc(null);
        setPreviewErr(null);
        setPreviewLoading(false);
        return;
      }
      const pub = selecionado.pdfUrl?.trim();
      if (pub) {
        setPreviewSrc(pub);
        setPreviewErr(null);
        setPreviewLoading(false);
        return;
      }
      const sp = selecionado.storagePath?.trim();
      if (!sp) {
        setPreviewSrc(null);
        setPreviewErr(null);
        setPreviewLoading(false);
        return;
      }
      setPreviewLoading(true);
      setPreviewErr(null);
      setPreviewSrc(null);
      try {
        const user = auth.currentUser;
        if (!user) {
          if (!cancelled) {
            setPreviewErr('Faça login para visualizar o documento.');
            setPreviewLoading(false);
          }
          return;
        }
        const token = await user.getIdToken();
        const u = new URL('/api/metaadmin/exames-imagem-signed-url', window.location.origin);
        u.searchParams.set('pacienteId', pacienteId);
        u.searchParams.set('storagePath', sp);
        const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${token}` } });
        const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (cancelled) return;
        if (!res.ok || !j.ok || !j.url) {
          setPreviewErr(j.error || 'Não foi possível abrir o documento.');
        } else {
          setPreviewSrc(j.url);
        }
      } catch {
        if (!cancelled) setPreviewErr('Erro ao carregar o documento.');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }
    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selecionado, pacienteId, mobileStack, visualizarPdfModalAberto]);

  const resetModal = useCallback(() => {
    setFaseModal('escolher');
    setArquivoPendente(null);
    setExtraido(null);
    setTipoEdicao('desconhecido');
    setDataEdicao('');
    setErroModal(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    resetModal();
  }, [resetModal]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    setErroModal(null);
    if (!f) return;
    const mime = mimeNormalizadoExameImagem(f);
    if (!isMimeExameImagemAceito(mime)) {
      setErroModal('Envie PDF ou imagem (JPEG, PNG, WEBP ou GIF).');
      return;
    }
    void (async () => {
      const isPdf = mime === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const secao = await avaliarPdfProvavelSecaoExames(f);
        if (secao === 'laboratorial') {
          const continua = window.confirm(
            `"${f.name}" parece ser resultado de exame laboratorial (hemograma, bioquímica, etc.). ` +
              'Anexe em "Exames Laboratoriais" para leitura correta dos valores.\n\n' +
              'Continuar mesmo assim em Exames de Imagem?'
          );
          if (!continua) return;
        }
      }
      setArquivoPendente(f);
    })();
  };

  const executarIaENome = useCallback(async () => {
    if (!arquivoPendente) return;
    const artigo = 'este exame de imagem';
    const ok = window.confirm(`Deseja anexar ${artigo} ao prontuário de ${nomePacienteProntuario}?`);
    if (!ok) return;

    setErroModal(null);
    setFaseModal('ia');
    try {
      const mimePend = mimeNormalizadoExameImagem(arquivoPendente);
      const isPdf =
        mimePend === 'application/pdf' || arquivoPendente.name.toLowerCase().endsWith('.pdf');
      const MAX_IA = Math.floor(4.2 * 1024 * 1024);

      let partes: File[];
      let avisosPrep: string[];
      let errosPrep: string[];

      if (isPdf) {
        const prep = await prepararPdfsParaIaGemini([arquivoPendente]);
        partes = prep.arquivos;
        avisosPrep = prep.avisos;
        errosPrep = prep.erros;
      } else {
        if (arquivoPendente.size > MAX_IA) {
          setErroModal('Imagem muito grande. Máximo 4,2 MB para leitura pela IA.');
          setFaseModal('escolher');
          return;
        }
        partes = [arquivoPendente];
        avisosPrep = [];
        errosPrep = [];
      }

      if (!partes.length) {
        setErroModal(
          [...errosPrep].filter(Boolean).join(' ') || 'Não foi possível preparar o arquivo para leitura.'
        );
        setFaseModal('escolher');
        return;
      }

      const lista: ExameImagemExtracaoNormalizada[] = [];
      const errosEnvio: string[] = [...errosPrep];

      for (const parte of partes) {
        try {
          const fd = new FormData();
          fd.append('file', parte);
          fd.append('pacienteId', pacienteId);
          const res = await fetchWithMedicoAuth('/api/metaadmin/exames-imagem-extrair-ia', {
            method: 'POST',
            body: fd,
          });
          const json = (await res.json()) as {
            ok?: boolean;
            error?: string;
            data?: unknown;
          };
          if (!res.ok || !json.ok || !json.data) {
            errosEnvio.push(json.error || `Não foi possível ler "${parte.name}".`);
            continue;
          }

          const normalized = normalizarRespostaExameImagemIA(json.data);

          const nomeAnexo = normalized.nomePacienteDocumento || '';
          if (nomeAnexo && nomePacienteProntuario) {
            const a = normalizarNomeComparacao(nomeAnexo);
            const b = normalizarNomeComparacao(nomePacienteProntuario);
            if (a && b && a !== b) {
              const continua = await confirmarNomePacienteDoAnexo(nomeAnexo, nomePacienteProntuario);
              if (!continua) {
                setErroModal('Inclusão cancelada: nome no laudo difere do prontuário.');
                setFaseModal('escolher');
                return;
              }
            }
          }

          lista.push(normalized);
        } catch {
          errosEnvio.push(`Erro ao enviar "${parte.name}".`);
        }
      }

      if (!lista.length) {
        setErroModal(errosEnvio.filter(Boolean).join(' ') || 'Nenhuma parte do arquivo foi lida.');
        setFaseModal('escolher');
        return;
      }

      const merged = mergeExameImagemExtracoes(lista);
      merged.avisos = [...avisosPrep, ...merged.avisos];
      for (const e of errosEnvio) {
        if (e.trim()) merged.avisos.push(`Leitura: ${e.trim()}`);
      }

      setExtraido(merged);
      setTipoEdicao(merged.tipoExame || 'desconhecido');
      setDataEdicao(merged.dataExame || '');
      setFaseModal('revisar');
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Falha ao processar o arquivo.');
      setFaseModal('escolher');
    }
  }, [arquivoPendente, pacienteId, nomePacienteProntuario, confirmarNomePacienteDoAnexo]);

  const salvarNoProntuario = useCallback(async () => {
    if (!arquivoPendente) return;
    setErroModal(null);
    setFaseModal('ia');
    try {
      const fdUp = new FormData();
      fdUp.append('file', arquivoPendente);
      fdUp.append('pacienteId', pacienteId);
      const resUp = await fetchWithMedicoAuth('/api/metaadmin/exames-imagem-upload-pdf', { method: 'POST', body: fdUp });
      const jsonUp = (await resUp.json()) as { ok?: boolean; error?: string; storagePath?: string };
      if (!resUp.ok || !jsonUp.ok || !jsonUp.storagePath) {
        throw new Error(jsonUp.error || 'Falha ao enviar o arquivo para o armazenamento.');
      }

      const mimeSalvar = mimeNormalizadoExameImagem(arquivoPendente);
      const novo: ExameDeImagemPaciente = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        nomeArquivo: arquivoPendente.name,
        mimeArquivo: mimeSalvar,
        tipoExame: tipoEdicao,
        dataExame: dataEdicao.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dataEdicao.trim()) ? dataEdicao.trim() : null,
        nomePacienteDocumento: extraido?.nomePacienteDocumento ?? null,
        resumoEquipamentoOuRegiao: extraido?.resumoEquipamentoOuRegiao ?? null,
        storagePath: jsonUp.storagePath,
        criadoEm: new Date().toISOString(),
      };

      onAdicionarExame(novo);
      setSelectedId(novo.id);
      fecharModal();
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Erro ao salvar.');
      setFaseModal('revisar');
    }
  }, [arquivoPendente, pacienteId, tipoEdicao, dataEdicao, extraido, onAdicionarExame, fecharModal]);

  const removerExame = async (id: string) => {
    if (somenteLeitura) return;
    if (!window.confirm('Remover este exame de imagem do prontuário?')) return;
    const ex = exames.find((e) => e.id === id);
    const path =
      ex?.storagePath?.trim() ||
      (ex?.pdfUrl ? storagePathFromGcsPublicUrl(ex.pdfUrl) : null);
    if (path) {
      try {
        const res = await fetchWithMedicoAuth('/api/metaadmin/exames-imagem-delete-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pacienteId, storagePath: path }),
        });
        const j = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !j.ok) {
          console.warn('[exames-imagem] Falha ao excluir arquivo:', j.error);
        }
      } catch {
        /* ainda remove do prontuário local */
      }
    }
    onRemoverExame(id);
  };

  useEffect(() => {
    if (visualizarPdfModalAberto && selectedId && !exames.some((e) => e.id === selectedId)) {
      setVisualizarPdfModalAberto(false);
    }
  }, [exames, selectedId, visualizarPdfModalAberto]);

  return (
    <div
      className={
        mobileStack
          ? 'flex min-h-0 flex-1 flex-col gap-3'
          : 'flex min-h-[min(70vh,560px)] flex-col gap-4'
      }
    >
      <div
        className={`flex flex-wrap items-center justify-end gap-2 ${mobileStack ? 'shrink-0' : ''}`}
      >
        {!somenteLeitura && (
        <button
          type="button"
          onClick={() => {
            setVisualizarPdfModalAberto(false);
            resetModal();
            setModalAberto(true);
          }}
          className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 ${
            mobileStack ? 'w-full justify-center py-3 sm:py-2.5' : ''
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          Adicionar novo exame
        </button>
        )}
      </div>

      <div
        className={
          mobileStack
            ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'
            : 'grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6'
        }
      >
        <div
          className={
            mobileStack
              ? 'flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-900/40'
              : 'flex min-h-[280px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-900/40'
          }
        >
          <h4 className="mb-2 shrink-0 text-sm font-semibold text-gray-800 dark:text-gray-200">
            Exames anexados
          </h4>
          {mobileStack && exames.length > 0 && (
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {somenteLeitura
                ? 'Toque num exame para ver em ecrã inteiro.'
                : 'Toque num exame para abrir o ficheiro em ecrã inteiro.'}
            </p>
          )}
          <div
            className={`space-y-2 overflow-y-auto pr-1 ${mobileStack ? 'min-h-0 flex-1' : 'flex-1'}`}
          >
            {exames.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                {somenteLeitura
                  ? 'Nenhum exame de imagem anexado pelo seu médico.'
                  : 'Nenhum anexo. Use &quot;Adicionar novo exame&quot; para enviar PDF ou imagem (JPEG, PNG, WEBP, GIF).'}
              </p>
            ) : (
              exames.map((ex) => (
                <div
                  key={ex.id}
                  className={`flex gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                    selectedId === ex.id
                      ? 'border-green-500 bg-green-50/80 dark:border-green-500 dark:bg-green-950/25'
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(ex.id);
                      if (mobileStack) setVisualizarPdfModalAberto(true);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-gray-500 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {ex.nomeArquivo}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {TIPO_LABELS[ex.tipoExame]}
                          {ex.dataExame ? ` · ${ex.dataExame}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                  {!somenteLeitura && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removerExame(ex.id);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Remover exame"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {!mobileStack && (
        <div className="flex min-h-[320px] flex-col rounded-xl border border-gray-200 bg-gray-50/80 p-3 shadow-sm dark:border-gray-600 dark:bg-gray-900/30">
          <h4 className="mb-2 shrink-0 text-sm font-semibold text-gray-800 dark:text-gray-200">
            Visualização
          </h4>
          <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-950">
            {previewLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/90 text-sm text-gray-600 dark:bg-gray-950/90 dark:text-gray-300">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                Carregando…
              </div>
            )}
            {previewErr && !previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600 dark:text-red-400">
                {previewErr}
              </div>
            )}
            {!previewLoading && !previewErr && previewSrc ? (
              previewComoImagem ? (
                <img
                  src={previewSrc}
                  alt={selecionado ? selecionado.nomeArquivo : 'Anexo'}
                  className="absolute inset-0 h-full w-full object-contain bg-gray-50 dark:bg-gray-950"
                />
              ) : (
                <iframe
                  key={previewSrc}
                  title={selecionado ? `Documento ${selecionado.nomeArquivo}` : 'Documento'}
                  src={previewSrc}
                  className="absolute inset-0 h-full w-full border-0"
                />
              )
            ) : null}
            {!previewLoading && !previewErr && !previewSrc && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Selecione um exame à esquerda para visualizar aqui.
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {mobileStack && visualizarPdfModalAberto && selecionado && (
        <div
          className="fixed inset-0 z-[140] flex flex-col bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-visualizar-pdf-imagem"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
            <div className="min-w-0 flex-1">
              <h3 id="titulo-visualizar-pdf-imagem" className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selecionado.nomeArquivo}
              </h3>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {TIPO_LABELS[selecionado.tipoExame]}
                {selecionado.dataExame ? ` · ${selecionado.dataExame}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVisualizarPdfModalAberto(false)}
              className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Fechar visualização"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1 bg-gray-100 dark:bg-gray-950">
            {previewLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/95 text-sm text-gray-600 dark:bg-gray-950/95 dark:text-gray-300">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                Carregando…
              </div>
            )}
            {previewErr && !previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600 dark:text-red-400">
                {previewErr}
              </div>
            )}
            {!previewLoading && !previewErr && previewSrc ? (
              previewComoImagem ? (
                <img
                  src={previewSrc}
                  alt={selecionado.nomeArquivo}
                  className="absolute inset-0 h-full w-full object-contain bg-white"
                />
              ) : (
                <iframe
                  key={previewSrc}
                  title={`Documento ${selecionado.nomeArquivo}`}
                  src={previewSrc}
                  className="absolute inset-0 h-full w-full border-0 bg-white"
                />
              )
            ) : null}
          </div>
        </div>
      )}

      {modalAberto && !somenteLeitura && (
        <div
          className={`fixed inset-0 flex items-center justify-center bg-black/50 p-4 ${
            mobileStack ? 'z-[150]' : 'z-[120]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-exame-imagem-titulo"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-600">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 id="modal-exame-imagem-titulo" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Novo exame de imagem
              </h3>
              <button
                type="button"
                onClick={fecharModal}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {faseModal === 'escolher' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Envie laudo em <strong>PDF</strong> ou <strong>imagem</strong> (JPEG, PNG, WEBP, GIF). PDFs acima de 4,2 MB
                  são divididos em partes para a IA. A leitura identifica tipo, data e nome; você confirma antes de gravar.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT_EXAMES_IMAGEM_ATTR}
                  className="hidden"
                  onChange={onFileChange}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 py-8 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-500 dark:text-gray-200 dark:hover:border-blue-500"
                >
                  {arquivoPendente ? arquivoPendente.name : 'Toque para escolher PDF ou imagem'}
                </button>
                {erroModal && (
                  <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {erroModal}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={fecharModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!arquivoPendente}
                    onClick={executarIaENome}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Continuar com IA
                  </button>
                </div>
              </div>
            )}

            {faseModal === 'ia' && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Lendo o arquivo e extraindo informações…
                </p>
              </div>
            )}

            {faseModal === 'revisar' && extraido && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-100">
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Leitura concluída — revise e salve
                  </p>
                  {extraido.nomePacienteDocumento && (
                    <p className="mt-2 text-xs opacity-90">
                      Nome no laudo: <strong>{extraido.nomePacienteDocumento}</strong>
                    </p>
                  )}
                  {extraido.resumoEquipamentoOuRegiao && (
                    <p className="mt-1 text-xs opacity-90">{extraido.resumoEquipamentoOuRegiao}</p>
                  )}
                  {extraido.avisos?.length ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-amber-900 dark:text-amber-100">
                      {extraido.avisos.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de exame</label>
                  <select
                    value={tipoEdicao}
                    onChange={(e) => setTipoEdicao(e.target.value as TipoExameImagem)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  >
                    {TIPOS_EXAME_IMAGEM.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Data do exame</label>
                  <input
                    type="date"
                    value={dataEdicao}
                    onChange={(e) => setDataEdicao(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>

                {erroModal && (
                  <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {erroModal}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={fecharModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarNoProntuario}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Salvar no prontuário
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
