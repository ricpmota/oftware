'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, FileText, Loader2, MessageCircle, Send, Users, X } from 'lucide-react';
import CalendarioPacienteAuthAvatar from '@/components/metaadmin/CalendarioPacienteAuthAvatar';
import MensagemEnvioEdicao from '@/components/metaadmin/MensagemEnvioEdicao';

type Props = {
  pacienteNome: string;
  fotoUrl?: string | null;
  valorParcela?: number;
  rotuloParcela?: string;
  situacao?: 'pago' | 'atrasada' | 'pendente';
  valorTotal?: number;
  valorPago?: number;
  valorAberto?: number;
  pctPago?: number;
  linkWhatsapp: string | null;
  enviando: boolean;
  erro: string;
  mensagem: string;
  onMensagemChange: (mensagem: string) => void;
  getAuthToken: () => Promise<string | null>;
  onCancel: () => void;
  onEscolher: (via: 'medico' | 'canal_chat') => void;
};

function formatarReais(valor: number | undefined): string {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return '—';
  return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function LembretePagamentoEnvioModal({
  pacienteNome,
  fotoUrl,
  valorParcela,
  rotuloParcela,
  situacao = 'pendente',
  valorTotal,
  valorPago,
  valorAberto,
  pctPago,
  linkWhatsapp,
  enviando,
  erro,
  mensagem,
  onMensagemChange,
  getAuthToken,
  onCancel,
  onEscolher,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [medicoConnected, setMedicoConnected] = useState(false);
  const [setorFinanceiroConnected, setSetorFinanceiroConnected] = useState(false);
  const [erroStatus, setErroStatus] = useState('');
  const getAuthTokenRef = useRef(getAuthToken);
  const verMensagemRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  getAuthTokenRef.current = getAuthToken;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      htmlOverflow: html.style.overflow,
    };
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    const travados: { el: HTMLElement; overflow: string }[] = [];
    document.querySelectorAll<HTMLElement>('[aria-label="Detalhes do dia"], [aria-label="Detalhes do dia"] .overflow-y-auto').forEach((el) => {
      travados.push({ el, overflow: el.style.overflow });
      el.style.overflow = 'hidden';
    });

    let ultimoY = 0;
    const aoToque = (event: TouchEvent) => {
      ultimoY = event.touches[0]?.clientY ?? 0;
    };
    const aoArrastar = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      const dy = y - ultimoY;
      ultimoY = y;
      const sheet = sheetRef.current;
      const alvo = event.target;
      const editor = alvo instanceof Element ? alvo.closest('[data-mensagem-envio-scroll]') : null;
      let painel: HTMLElement | null = null;
      if (editor instanceof HTMLElement && alvo instanceof Element) {
        let node: Element | null = alvo;
        while (node && node !== editor.parentElement) {
          if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 1) {
            painel = node;
            break;
          }
          node = node.parentElement;
        }
        painel = painel ?? editor;
      } else if (sheet && alvo instanceof Node && sheet.contains(alvo)) {
        painel = sheet;
      }
      if (!painel) {
        event.preventDefault();
        return;
      }
      const podeRolar = painel.scrollHeight > painel.clientHeight + 1;
      if (!podeRolar) {
        event.preventDefault();
        return;
      }
      const noTopo = painel.scrollTop <= 0;
      const noFim = painel.scrollTop + painel.clientHeight >= painel.scrollHeight - 1;
      if ((noTopo && dy > 0) || (noFim && dy < 0)) event.preventDefault();
    };
    document.addEventListener('touchstart', aoToque, { passive: true });
    document.addEventListener('touchmove', aoArrastar, { passive: false });

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      html.style.overflow = prev.htmlOverflow;
      travados.forEach(({ el, overflow }) => {
        el.style.overflow = overflow;
      });
      document.removeEventListener('touchstart', aoToque);
      document.removeEventListener('touchmove', aoArrastar);
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCarregando(true);
      setErroStatus('');
      try {
        const token = await getAuthTokenRef.current();
        if (!token) {
          if (!cancelled) setErroStatus('Sessão indisponível. Faça login novamente.');
          return;
        }
        const res = await fetch('/api/metaadmin/financeiro/lembrete-parcela-whatsapp', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          medicoConnected?: boolean;
          setorFinanceiroConnected?: boolean;
        } | null;
        if (!res.ok || data?.ok === false) {
          if (!cancelled) setErroStatus(data?.error || 'Não foi possível consultar as conexões.');
          return;
        }
        if (!cancelled) {
          setMedicoConnected(data?.medicoConnected === true);
          setSetorFinanceiroConnected(data?.setorFinanceiroConnected === true);
        }
      } catch {
        if (!cancelled) setErroStatus('Não foi possível consultar as conexões.');
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const abrirWhatsappDoPaciente = () => {
    if (!linkWhatsapp) {
      setErroStatus('Paciente sem telefone para abrir o WhatsApp.');
      return;
    }
    window.open(linkWhatsapp, '_blank', 'noopener,noreferrer');
    onCancel();
  };

  const abrirVerMensagem = () => {
    const botao = verMensagemRef.current?.querySelector('button');
    if (!botao || botao.disabled) return;
    botao.click();
  };

  const pct = typeof pctPago === 'number' && Number.isFinite(pctPago) ? pctPago : 0;
  const larguraBarra = Math.min(100, Math.max(0, pct));
  const bloqueado = enviando || carregando;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center overscroll-none px-3 pt-5 md:items-center md:p-6">
      <div className="animate-sheet-backdrop absolute inset-0 bg-black/50" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lembrete-pagamento-titulo"
        className="animate-sheet-rise relative flex max-h-[calc(100dvh-20px)] w-full max-w-[640px] flex-col overflow-hidden overscroll-contain rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(10,31,68,0.12)] md:rounded-[28px] md:shadow-2xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden />
        <div
          ref={sheetRef}
          className="max-h-[calc(100dvh-36px)] overflow-y-auto overscroll-none px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-6 md:pt-5"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Lembrete de pagamento
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={enviando}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-60"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2
            id="lembrete-pagamento-titulo"
            className="mt-5 text-[25px] font-bold leading-tight text-[#0A1F44] md:text-[28px]"
          >
            Como deseja enviar esta mensagem?
          </h2>

          <div
            className="mt-4 rounded-lg p-3 shadow-sm md:rounded-xl"
            style={
              situacao === 'pago'
                ? { background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)', border: '1px solid #86efac', borderLeft: '4px solid #16a34a' }
                : situacao === 'atrasada'
                  ? { background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626' }
                  : { background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)', border: '1px solid #fdba74', borderLeft: '4px solid #ea580c' }
            }
          >
            <div className="flex items-start gap-1.5 sm:gap-2">
              <CalendarioPacienteAuthAvatar
                name={pacienteNome}
                photoUrl={fotoUrl}
                dimensionClass="h-[30px] w-[30px] text-[10px] md:h-[53px] md:w-[53px] md:text-[15px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate pr-2 text-sm font-semibold text-gray-900" title={pacienteNome}>
                    {pacienteNome}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white p-0.5 pr-1 ring-1 ring-gray-200">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold leading-none tabular-nums text-gray-800">
                      {formatarReais(valorParcela)}
                    </span>
                    {rotuloParcela ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-[#0A1F44] px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums text-white">
                        {rotuloParcela}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 rounded-xl bg-white/75 px-2.5 py-2 ring-1 ring-black/[0.05]" title={`${pct}% pago`}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-gray-600">
                <span>Total <span className="font-semibold text-gray-900">{formatarReais(valorTotal)}</span></span>
                <span>Pago <span className="font-semibold text-gray-900">{formatarReais(valorPago)}</span></span>
                <span>Em aberto <span className="font-semibold text-gray-900">{formatarReais(valorAberto)}</span></span>
                <span className="shrink-0 font-semibold tabular-nums text-gray-900">{pct}% pago</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-green-500" style={{ width: `${larguraBarra}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => (medicoConnected ? onEscolher('medico') : abrirWhatsappDoPaciente())}
              className={`flex w-full items-center gap-3 rounded-[18px] border px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                medicoConnected
                  ? 'border-emerald-200 bg-emerald-50/80'
                  : 'border-[#E5EAF1] bg-white'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Send className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[#0A1F44]">Por você</span>
                <span className="mt-0.5 block text-[13px] font-medium text-emerald-800">
                  {carregando ? 'Verificando conexão…' : medicoConnected ? 'Envio automático agora' : 'Abrir no WhatsApp'}
                </span>
                {!medicoConnected && !carregando ? (
                  <span className="mt-0.5 block text-[13px] text-slate-500">
                    A mensagem será aberta para envio manual.
                  </span>
                ) : null}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </button>

            <button
              type="button"
              disabled={bloqueado || !setorFinanceiroConnected}
              onClick={() => onEscolher('canal_chat')}
              className="flex w-full items-center gap-3 rounded-[18px] border border-[#E5EAF1] bg-white px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[#0A1F44]">
                <Users className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-[#0A1F44]">Setor Financeiro</span>
                  {!carregando && !setorFinanceiroConnected ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Desconectado
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] font-medium text-[#0A1F44]">
                  {carregando
                    ? 'Verificando conexão…'
                    : setorFinanceiroConnected
                      ? 'Envio automático agora'
                      : 'Conecte o setor para realizar o envio.'}
                </span>
              </span>
              {setorFinanceiroConnected ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              ) : null}
            </button>

            <button
              type="button"
              disabled={enviando}
              onClick={abrirVerMensagem}
              className="flex w-full items-center gap-3 rounded-[18px] border border-[#E5EAF1] bg-white px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[#0A1F44]">Ver mensagem</span>
                <span className="mt-0.5 block text-[13px] text-slate-500">
                  Visualize o conteúdo antes do envio.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          </div>

          <div ref={verMensagemRef} className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
            <MensagemEnvioEdicao mensagem={mensagem} disabled={enviando} onMensagemChange={onMensagemChange} />
          </div>

          {carregando || enviando ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {enviando ? 'Enviando…' : 'Verificando conexões…'}
            </p>
          ) : null}
          {erro || erroStatus ? <p className="mt-3 text-sm text-red-600">{erro || erroStatus}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
