'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Reply,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { PacienteMensagem, PacienteMensagemAnexo } from '@/services/pacienteMensagemService';
import {
  PacienteMensagemService,
  resolveMensagemThreadId,
} from '@/services/pacienteMensagemService';
import { htmlToPlainText, sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';
import {
  appendAssinaturaToPlain,
  ASSINATURA_LOGO_PADRAO,
  buildComposeHtmlWithAssinatura,
  buildDefaultAssinaturaHtml,
  plainBodyWithoutAssinatura,
  type MensagemAssinaturaDefaults,
} from '@/lib/pacienteMensagem/assinaturaMensagem';
import { MensagemAssinaturaService } from '@/services/mensagemAssinaturaService';
import { AvatarBubble, AvatarPair } from '@/components/comunicacao/MensagemAvatars';
import MensagemRichEditor from '@/components/metaadmin/comunicacao/MensagemRichEditor';
import MensagemHtmlBody from '@/components/metaadmin/comunicacao/MensagemHtmlBody';
import MensagemAssinaturaModal from '@/components/metaadmin/comunicacao/MensagemAssinaturaModal';

type Aba = 'entrada' | 'saida';
type PainelDireito = 'vazio' | 'ler' | 'escrever';

type Props = {
  pacienteId: string;
  pacienteEmail: string;
  pacienteNome: string;
  pacientePhotoUrl?: string | null;
  medicoId: string;
  medicoEmail: string;
  medicoNome?: string;
  medicoPhotoUrl?: string | null;
  mensagens: PacienteMensagem[];
  loading: boolean;
  naoLidasEntrada: number;
  onRefresh: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
  className?: string;
  hideHeaderTitle?: boolean;
  assinaturaUserId?: string | null;
  assinaturaDefaults?: MensagemAssinaturaDefaults | null;
};

type ThreadResumo = {
  threadId: string;
  titulo: string;
  tipo: PacienteMensagem['tipo'];
  mensagens: PacienteMensagem[];
  ultima: PacienteMensagem;
  naoLidas: number;
  temEntrada: boolean;
  temSaida: boolean;
};

function formatQuando(d: Date) {
  try {
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
}

function formatQuandoCompleto(d: Date) {
  try {
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '';
  }
}

function assuntoLimpo(titulo: string): string {
  const t = String(titulo || '').replace(/^(re|fw|fwd)\s*:\s*/gi, '').trim();
  return t || 'Sem assunto';
}

function buildThreads(mensagens: PacienteMensagem[]): ThreadResumo[] {
  const map = new Map<string, PacienteMensagem[]>();
  for (const msg of mensagens) {
    const tid = resolveMensagemThreadId(msg);
    const arr = map.get(tid) || [];
    arr.push(msg);
    map.set(tid, arr);
  }

  const threads: ThreadResumo[] = [];
  for (const [threadId, msgs] of map.entries()) {
    const ordered = [...msgs].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
    const ultima = ordered[ordered.length - 1]!;
    const primeira = ordered[0]!;
    threads.push({
      threadId,
      titulo: assuntoLimpo(primeira.titulo || ultima.titulo),
      tipo: ultima.tipo,
      mensagens: ordered,
      ultima,
      // Perspectiva do paciente: não lidas = do médico
      naoLidas: ordered.filter(
        (m) => (m.direcao === 'medico_para_paciente' || !m.direcao) && !m.lida
      ).length,
      temEntrada: ordered.some((m) => m.direcao === 'medico_para_paciente' || !m.direcao),
      temSaida: ordered.some((m) => m.direcao === 'paciente_para_medico'),
    });
  }

  return threads.sort((a, b) => b.ultima.criadoEm.getTime() - a.ultima.criadoEm.getTime());
}

export default function MetaPacienteComunicacaoGmailPanel({
  pacienteId,
  pacienteEmail,
  pacienteNome,
  pacientePhotoUrl = null,
  medicoId,
  medicoEmail,
  medicoNome = 'Médico',
  medicoPhotoUrl = null,
  mensagens,
  loading,
  naoLidasEntrada,
  onRefresh,
  onNotify,
  className = '',
  hideHeaderTitle = false,
  assinaturaUserId = null,
  assinaturaDefaults = null,
}: Props) {
  const [aba, setAba] = useState<Aba>('entrada');
  const [painel, setPainel] = useState<PainelDireito>('vazio');
  const [threadIdAtivo, setThreadIdAtivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<PacienteMensagem['tipo']>('clinico');
  const [html, setHtml] = useState('');
  const [anexos, setAnexos] = useState<PacienteMensagemAnexo[]>([]);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [composeInitialHtml, setComposeInitialHtml] = useState('');

  const [assinaturaHtml, setAssinaturaHtml] = useState('');
  const [showAssinaturaModal, setShowAssinaturaModal] = useState(false);

  const defaultsAssinatura = useMemo<MensagemAssinaturaDefaults>(() => {
    if (assinaturaDefaults) {
      return {
        role: assinaturaDefaults.role,
        displayName: assinaturaDefaults.displayName,
        registro: assinaturaDefaults.registro ?? null,
        telefone: assinaturaDefaults.telefone ?? null,
        email: assinaturaDefaults.email ?? null,
        logoUrl: assinaturaDefaults.logoUrl ?? ASSINATURA_LOGO_PADRAO,
      };
    }
    return {
      role: 'paciente',
      displayName: pacienteNome,
      email: pacienteEmail,
      logoUrl: ASSINATURA_LOGO_PADRAO,
    };
  }, [
    assinaturaDefaults?.role,
    assinaturaDefaults?.displayName,
    assinaturaDefaults?.registro,
    assinaturaDefaults?.telefone,
    assinaturaDefaults?.email,
    assinaturaDefaults?.logoUrl,
    pacienteNome,
    pacienteEmail,
  ]);

  useEffect(() => {
    if (!pacienteId) {
      setAssinaturaHtml(buildDefaultAssinaturaHtml(defaultsAssinatura));
      return;
    }
    let cancelled = false;
    void MensagemAssinaturaService.getAssinaturaHtml(
      {
        userId: assinaturaUserId || pacienteId,
        profileId: pacienteId,
        role: defaultsAssinatura.role,
      },
      defaultsAssinatura
    ).then((h) => {
      if (!cancelled) setAssinaturaHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [assinaturaUserId, pacienteId, defaultsAssinatura]);

  const threads = useMemo(() => buildThreads(mensagens), [mensagens]);

  const lista = useMemo(() => {
    return threads.filter((t) => (aba === 'entrada' ? t.temEntrada : t.temSaida));
  }, [threads, aba]);

  const threadAtivo = useMemo(
    () => threads.find((t) => t.threadId === threadIdAtivo) || null,
    [threads, threadIdAtivo]
  );

  const mobileDetailOpen = painel === 'ler' || painel === 'escrever';

  const seedCompose = useCallback(
    (bodyHtml = '') => {
      const seeded = buildComposeHtmlWithAssinatura(bodyHtml, assinaturaHtml);
      setHtml(seeded);
      setComposeInitialHtml(seeded);
      setEditorKey((k) => k + 1);
    },
    [assinaturaHtml]
  );

  const resetCompose = () => {
    setTitulo('');
    setTipo('clinico');
    setHtml('');
    setComposeInitialHtml('');
    setAnexos([]);
    setReplyThreadId(null);
    setReplyToId(null);
    setEditorKey((k) => k + 1);
  };

  const abrirNova = () => {
    setThreadIdAtivo(null);
    setTitulo('');
    setTipo('clinico');
    setAnexos([]);
    setReplyThreadId(null);
    setReplyToId(null);
    seedCompose('');
    setPainel('escrever');
  };

  const voltarLista = () => {
    if (painel === 'escrever' && threadIdAtivo) {
      resetCompose();
      setPainel('ler');
      return;
    }
    resetCompose();
    setPainel('vazio');
    setThreadIdAtivo(null);
  };

  const abrirThread = async (thread: ThreadResumo) => {
    setThreadIdAtivo(thread.threadId);
    setPainel('ler');
    const naoLidas = thread.mensagens.filter(
      (m) => (m.direcao === 'medico_para_paciente' || !m.direcao) && !m.lida
    );
    if (naoLidas.length === 0) return;
    try {
      await Promise.all(naoLidas.map((m) => PacienteMensagemService.marcarComoLida(m.id)));
      await onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const abrirResponder = (thread: ThreadResumo) => {
    const ultima = thread.ultima;
    const rootId =
      thread.mensagens.find((m) => m.threadId && !String(m.threadId).startsWith('legacy:'))?.threadId ||
      thread.mensagens[0]?.id ||
      ultima.id;

    const precisaConsolidar = thread.mensagens.some((m) => !m.threadId || m.threadId !== rootId);
    if (precisaConsolidar) {
      void PacienteMensagemService.ensureThreadId(
        thread.mensagens.map((m) => m.id),
        rootId
      ).then(() => onRefresh());
    }

    setReplyThreadId(rootId);
    setReplyToId(ultima.id);
    setTitulo(assuntoLimpo(thread.titulo));
    setTipo(ultima.tipo || 'clinico');
    setAnexos([]);
    seedCompose('');
    setPainel('escrever');
  };

  const enviar = async () => {
    const plainBody = plainBodyWithoutAssinatura(html, assinaturaHtml);
    if (!titulo.trim() || (!plainBody && anexos.length === 0)) {
      onNotify?.('Título e mensagem são obrigatórios');
      return;
    }
    setEnviando(true);
    try {
      const assunto = assuntoLimpo(titulo);
      const htmlFinal = sanitizeMensagemHtml(html);
      const plainFinal =
        htmlToPlainText(htmlFinal).trim() ||
        appendAssinaturaToPlain(plainBody || titulo.trim(), assinaturaHtml);
      const novaId = await PacienteMensagemService.criarMensagem({
        pacienteId,
        pacienteEmail,
        medicoId,
        medicoEmail,
        titulo: replyThreadId ? assunto : titulo.trim(),
        mensagem: plainFinal,
        mensagemHtml: htmlFinal,
        anexos,
        tipo,
        lida: false,
        criadoPor: pacienteEmail,
        direcao: 'paciente_para_medico',
        pacienteNome,
        ...(replyThreadId
          ? {
              threadId: replyThreadId,
              emRespostaAId: replyToId || undefined,
            }
          : {}),
      });

      onNotify?.(replyThreadId ? 'Resposta enviada!' : 'Mensagem enviada com sucesso!');
      setAba('saida');
      const nextThreadId = replyThreadId || novaId;
      resetCompose();
      setThreadIdAtivo(nextThreadId);
      setPainel('ler');
      await onRefresh();
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;
    try {
      await PacienteMensagemService.deletarMensagem(id);
      await onRefresh();
      onNotify?.('Mensagem excluída com sucesso!');
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao excluir mensagem.');
    }
  };

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${
        className || 'h-[min(70vh,720px)] min-h-[420px]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {mobileDetailOpen ? (
            <button
              type="button"
              onClick={voltarLista}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
          ) : null}
          {!hideHeaderTitle ? (
            <>
              <Mail className="h-4 w-4 text-gray-500 shrink-0 hidden sm:block" />
              <h3 className="text-sm font-semibold text-gray-900 truncate">Comunicação</h3>
            </>
          ) : null}
          {naoLidasEntrada > 0 ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
              {naoLidasEntrada} nova(s)
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          {assinaturaUserId ? (
            <button
              type="button"
              onClick={() => setShowAssinaturaModal(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <PenLine size={14} />
              Assinatura
            </button>
          ) : null}
          <button
            type="button"
            onClick={abrirNova}
            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          >
            <Plus size={14} />
            Nova
          </button>
        </div>
      </div>

      {naoLidasEntrada > 0 ? (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Você tem {naoLidasEntrada} mensagem(ns) não lida(s) do médico na Caixa de entrada.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,38%)_1fr]">
        <div
          className={`min-h-0 flex-col border-b border-gray-200 lg:border-b-0 lg:border-r ${
            mobileDetailOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex shrink-0 border-b border-gray-200">
            <button
              type="button"
              onClick={() => {
                setAba('entrada');
                setPainel('vazio');
                setThreadIdAtivo(null);
              }}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold border-b-2 ${
                aba === 'entrada'
                  ? 'border-green-600 text-green-700 bg-green-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Caixa de entrada
              {naoLidasEntrada > 0 ? (
                <span className="ml-1 inline-flex rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-800">
                  {naoLidasEntrada}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                setAba('saida');
                setPainel('vazio');
                setThreadIdAtivo(null);
              }}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold border-b-2 ${
                aba === 'saida'
                  ? 'border-green-600 text-green-700 bg-green-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Caixa de saída
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa]">
            {loading && lista.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : lista.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                {aba === 'entrada' ? 'Nenhuma mensagem recebida' : 'Nenhuma mensagem enviada'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100/80">
                {lista.map((thread) => {
                  const msg = thread.ultima;
                  const ativa = threadIdAtivo === thread.threadId && painel === 'ler';
                  const naoLida = thread.naoLidas > 0;
                  const doPaciente = msg.direcao === 'paciente_para_medico';
                  const fromName = doPaciente ? pacienteNome : medicoNome;
                  const fromPhoto = doPaciente ? pacientePhotoUrl : medicoPhotoUrl;
                  const toName = doPaciente ? medicoNome : pacienteNome;
                  const toPhoto = doPaciente ? medicoPhotoUrl : pacientePhotoUrl;
                  const preview = (
                    msg.mensagem || htmlToPlainText(msg.mensagemHtml || '')
                  ).slice(0, 90);

                  return (
                    <li key={thread.threadId}>
                      <button
                        type="button"
                        onClick={() => void abrirThread(thread)}
                        className={`group flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors ${
                          ativa
                            ? 'bg-green-50 shadow-[inset_3px_0_0_#16a34a]'
                            : naoLida
                              ? 'bg-white hover:bg-green-50/40'
                              : 'bg-transparent hover:bg-white'
                        }`}
                      >
                        <AvatarPair
                          fromName={fromName}
                          fromPhoto={fromPhoto}
                          toName={toName}
                          toPhoto={toPhoto}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`truncate text-[13px] ${
                                naoLida ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                              }`}
                            >
                              {fromName} → {toName}
                            </span>
                            <span
                              className={`shrink-0 text-[11px] tabular-nums ${
                                naoLida ? 'font-semibold text-green-700' : 'text-gray-400'
                              }`}
                            >
                              {formatQuando(msg.criadoEm)}
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 flex items-center gap-1.5 truncate text-[13px] ${
                              naoLida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                            }`}
                          >
                            <span className="truncate">{thread.titulo}</span>
                            {thread.mensagens.length > 1 ? (
                              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {thread.mensagens.length}
                              </span>
                            ) : null}
                            {msg.anexos && msg.anexos.length > 0 ? (
                              <Paperclip className="h-3 w-3 shrink-0 text-gray-400" aria-hidden />
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[12px] text-gray-500">
                            {preview || '—'}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] capitalize text-gray-600">
                              {thread.tipo}
                            </span>
                            {naoLida ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                                {thread.naoLidas} nova{thread.naoLidas > 1 ? 's' : ''}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div
          className={`min-h-0 flex-col bg-white ${
            mobileDetailOpen ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {painel === 'vazio' ? (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-500">
              <Mail className="h-10 w-10 text-gray-300" />
              <p className="text-sm">Selecione uma conversa ou escreva uma nova mensagem.</p>
              <button
                type="button"
                onClick={abrirNova}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <Plus size={16} /> Nova mensagem
              </button>
            </div>
          ) : null}

          {painel === 'ler' && threadAtivo ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-gray-900">{threadAtivo.titulo}</h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {threadAtivo.mensagens.length} mensagem
                    {threadAtivo.mensagens.length > 1 ? 'ns' : ''} ·{' '}
                    <span className="capitalize">{threadAtivo.tipo}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => abrirResponder(threadAtivo)}
                    className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    <Reply size={14} />
                    Responder
                  </button>
                  <button
                    type="button"
                    onClick={voltarLista}
                    className="hidden lg:inline-flex rounded-md p-2 text-gray-400 hover:bg-gray-100"
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-3 py-3">
                {threadAtivo.mensagens.map((msg) => {
                  const doPaciente = msg.direcao === 'paciente_para_medico';
                  const fromName = doPaciente ? pacienteNome : medicoNome;
                  const fromPhoto = doPaciente ? pacientePhotoUrl : medicoPhotoUrl;
                  const toName = doPaciente ? medicoNome : pacienteNome;
                  return (
                    <article
                      key={msg.id}
                      className={`rounded-xl border bg-white p-3 shadow-sm ${
                        doPaciente ? 'border-green-100' : 'border-blue-100'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <AvatarBubble name={fromName} photoUrl={fromPhoto} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{fromName}</p>
                            <p className="text-[11px] text-gray-400">
                              Para: {toName} · {formatQuandoCompleto(msg.criadoEm)}
                              {msg.emRespostaAId ? ' · resposta' : ''}
                            </p>
                          </div>
                        </div>
                        {doPaciente ? (
                          <button
                            type="button"
                            onClick={() => void excluir(msg.id)}
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                      <MensagemHtmlBody
                        texto={msg.mensagem}
                        html={msg.mensagemHtml}
                        anexos={msg.anexos}
                      />
                    </article>
                  );
                })}
              </div>

              <div className="border-t border-gray-200 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => abrirResponder(threadAtivo)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100"
                >
                  <Reply size={16} />
                  Responder nesta conversa
                </button>
              </div>
            </div>
          ) : null}

          {painel === 'escrever' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarPair
                    fromName={pacienteNome}
                    fromPhoto={pacientePhotoUrl}
                    toName={medicoNome}
                    toPhoto={medicoPhotoUrl}
                    size={40}
                  />
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-gray-900">
                      {replyThreadId ? 'Responder' : 'Nova mensagem'}
                    </h4>
                    <p className="truncate text-[12px] text-gray-500">
                      De: {pacienteNome} → Para: {medicoNome}
                      {replyThreadId ? ` · ${assuntoLimpo(titulo)}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={voltarLista}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {!replyThreadId ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Assunto *</label>
                      <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Assunto da mensagem"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as PacienteMensagem['tipo'])}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="clinico">Clínico</option>
                        <option value="alerta">Alerta</option>
                        <option value="orientacao">Orientação</option>
                        <option value="revisao">Revisão</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-xs text-green-800">
                    Assunto: <strong>{assuntoLimpo(titulo)}</strong>
                    <span className="text-green-600"> (mesma conversa)</span>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Mensagem *</label>
                  <MensagemRichEditor
                    key={editorKey}
                    pacienteId={pacienteId}
                    initialHtml={composeInitialHtml}
                    onChangeHtml={setHtml}
                    anexos={anexos}
                    onAnexosChange={setAnexos}
                    disabled={enviando}
                    uploadEndpoint="/api/meta/mensagens-anexo-upload"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={voltarLista}
                  className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void enviar()}
                  disabled={enviando}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Send size={15} />
                  {enviando ? 'Enviando…' : replyThreadId ? 'Enviar resposta' : 'Enviar'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {pacienteId ? (
        <MensagemAssinaturaModal
          open={showAssinaturaModal}
          onClose={() => setShowAssinaturaModal(false)}
          userId={assinaturaUserId || pacienteId}
          profileId={pacienteId}
          defaults={defaultsAssinatura}
          uploadPacienteId={pacienteId}
          uploadEndpoint="/api/meta/mensagens-anexo-upload"
          onSaved={(h) => {
            setAssinaturaHtml(h);
            if (painel === 'escrever') {
              const bodyOnly = plainBodyWithoutAssinatura(html, assinaturaHtml);
              const bodyHtml = bodyOnly
                ? `<div>${bodyOnly
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>')}</div>`
                : '';
              const next = buildComposeHtmlWithAssinatura(bodyHtml, h);
              setHtml(next);
              setComposeInitialHtml(next);
              setEditorKey((k) => k + 1);
            }
          }}
          onNotify={onNotify}
        />
      ) : null}
    </div>
  );
}
