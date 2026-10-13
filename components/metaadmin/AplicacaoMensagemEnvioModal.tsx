'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, FileText, Loader2, MessageCircle, Ruler, Send, Smartphone, Syringe, Weight, X } from 'lucide-react';
import CalendarioPacienteAuthAvatar from '@/components/metaadmin/CalendarioPacienteAuthAvatar';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import type { SegmentoFaixaAplicacao } from '@/utils/tirzepatidaProtocoloDisplay';
import MensagemEnvioEdicao from '@/components/metaadmin/MensagemEnvioEdicao';

export type CartaoMensagemEnvio =
  | {
      tipo: 'injetavel';
      fotoUrl?: string | null;
      semana: number;
      protocoloNome: string;
      observacao?: string;
      situacao: 'realizado' | 'atrasado' | 'pendente';
    }
  | {
      tipo: 'conclusao';
      fotoUrl?: string | null;
      totalMg: number;
      variacaoPeso?: number | null;
      variacaoComp?: number | null;
      situacao: 'concluido' | 'pendente';
      total: number;
      aplicadas: number;
      pendentes: number;
      percAplicadas: number;
      percPendentes: number;
      segmentos?: SegmentoFaixaAplicacao[];
    }
  | {
      tipo: 'consulta';
      fotoUrl?: string | null;
      inicio: string;
      fim: string;
      observacoes?: string;
      realizada: boolean;
    }
  | {
      tipo: 'lembrete';
      fotoUrl?: string | null;
      horario?: string;
      avisoWhatsApp?: boolean;
      texto: string;
      tag: string;
      tagClass: string;
      situacao: 'concluido' | 'atrasado' | 'pendente';
      estilo: { background: string; border: string; borderLeft: string };
    };

const avatarCard = 'h-[30px] w-[30px] text-[10px] md:h-[53px] md:w-[53px] md:text-[15px]';
const badgeCard =
  'inline-flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold leading-none tabular-nums text-gray-800 ring-1 ring-black/[0.06]';

function estiloVerdeLaranjaVermelho(tom: 'verde' | 'laranja' | 'vermelho' | 'roxo') {
  if (tom === 'verde') {
    return { background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)', border: '1px solid #86efac', borderLeft: '4px solid #16a34a' };
  }
  if (tom === 'laranja') {
    return { background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)', border: '1px solid #fdba74', borderLeft: '4px solid #ea580c' };
  }
  if (tom === 'roxo') {
    return { background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0.03) 100%)', border: '1px solid #c4b5fd', borderLeft: '4px solid #7c3aed' };
  }
  return { background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626' };
}

function FaixaAplicacoes({
  total,
  aplicadas,
  pendentes,
  percAplicadas,
  percPendentes,
  segmentos,
}: {
  total: number;
  aplicadas: number;
  pendentes: number;
  percAplicadas: number;
  percPendentes: number;
  segmentos?: SegmentoFaixaAplicacao[];
}) {
  const aplicadasLargura = Math.min(100, Math.max(0, percAplicadas));
  const pendentesLargura = Math.min(100, Math.max(0, percPendentes));
  return (
    <div
      className="mt-2.5 rounded-xl bg-white/75 px-2.5 py-2 ring-1 ring-black/[0.05]"
      title={`Aplicadas ${Math.round(percAplicadas)}% • Pendentes ${Math.round(percPendentes)}%`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-600">
        <span>Total <span className="font-semibold text-gray-900">{total}</span></span>
        <span>Aplicadas <span className="font-semibold text-gray-900">{aplicadas}</span></span>
        <span>Pendentes <span className="font-semibold text-gray-900">{pendentes}</span></span>
      </div>
      {segmentos && segmentos.length > 0 ? (
        <BarraFaixaAplicacoes segmentos={segmentos} className="h-2" />
      ) : (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="flex h-full">
            <div className="bg-green-500" style={{ width: `${aplicadasLargura}%` }} />
            <div className="bg-orange-500" style={{ width: `${pendentesLargura}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function CartaoReplica({ cartao, pacienteNome }: { cartao: CartaoMensagemEnvio; pacienteNome: string }) {
  if (cartao.tipo === 'injetavel') {
    const tom = cartao.situacao === 'realizado' ? 'verde' : cartao.situacao === 'atrasado' ? 'vermelho' : 'laranja';
    const feito = cartao.situacao === 'realizado';
    return (
      <div className="mt-4 rounded-lg p-3 shadow-sm md:rounded-xl md:p-4" style={estiloVerdeLaranjaVermelho(tom)}>
        <div className="flex items-start gap-1.5 sm:gap-2">
          <CalendarioPacienteAuthAvatar name={pacienteNome} photoUrl={cartao.fotoUrl} dimensionClass={avatarCard} />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-semibold ${feito ? 'text-gray-500 line-through' : 'text-gray-900'}`} title={pacienteNome}>
              {pacienteNome}
            </p>
            <p className={`mt-0.5 text-xs font-medium ${feito ? 'text-green-700' : cartao.situacao === 'atrasado' ? 'text-red-700' : 'text-orange-700'}`}>
              Semana {cartao.semana}
            </p>
            <p className={`mt-1 text-sm ${feito ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{cartao.protocoloNome}</p>
            {cartao.observacao ? (
              <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">{cartao.observacao}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (cartao.tipo === 'conclusao') {
    const mg = Number.isInteger(cartao.totalMg) ? String(cartao.totalMg) : cartao.totalMg.toFixed(1);
    return (
      <div
        className="mt-4 rounded-lg p-3 shadow-sm md:rounded-xl md:p-4"
        style={estiloVerdeLaranjaVermelho(cartao.situacao === 'concluido' ? 'verde' : 'roxo')}
      >
        <div className="flex items-start gap-1.5 sm:gap-2">
          <CalendarioPacienteAuthAvatar name={pacienteNome} photoUrl={cartao.fotoUrl} dimensionClass={avatarCard} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900" title={pacienteNome}>
              {pacienteNome}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <span className={badgeCard} title="Total aplicado">
                  <Syringe className="h-3 w-3 shrink-0" aria-hidden />
                  {mg} mg
                </span>
                {typeof cartao.variacaoPeso === 'number' && Number.isFinite(cartao.variacaoPeso) ? (
                  <span className={badgeCard} title="Total de peso perdido">
                    <Weight className="h-3 w-3 shrink-0" aria-hidden />
                    <span className={cartao.variacaoPeso <= -1 ? 'text-green-700' : 'text-red-600'}>
                      {cartao.variacaoPeso > 0 ? '+' : ''}
                      {cartao.variacaoPeso.toFixed(1)} kg
                    </span>
                  </span>
                ) : null}
                {typeof cartao.variacaoComp === 'number' && Number.isFinite(cartao.variacaoComp) ? (
                  <span className={badgeCard} title="Total de comprimento perdido">
                    <Ruler className="h-3 w-3 shrink-0" aria-hidden />
                    <span className={cartao.variacaoComp <= 0 ? 'text-green-700' : 'text-red-600'}>
                      {cartao.variacaoComp > 0 ? '+' : ''}
                      {cartao.variacaoComp.toFixed(1)} cm
                    </span>
                  </span>
                ) : null}
              </div>
              <span className={badgeCard}>Registrar</span>
            </div>
          </div>
        </div>
        <FaixaAplicacoes
          total={cartao.total}
          aplicadas={cartao.aplicadas}
          pendentes={cartao.pendentes}
          percAplicadas={cartao.percAplicadas}
          percPendentes={cartao.percPendentes}
          segmentos={cartao.segmentos}
        />
      </div>
    );
  }

  if (cartao.tipo === 'consulta') {
    return (
      <div
        className={`mt-4 rounded-xl border px-3 py-2.5 ${
          cartao.realizada ? 'border-emerald-200 bg-emerald-50/70' : 'border-cyan-200 bg-cyan-50/70'
        }`}
      >
        <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
          <CalendarioPacienteAuthAvatar name={pacienteNome} photoUrl={cartao.fotoUrl} dimensionClass={avatarCard} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900" title={pacienteNome}>
              {pacienteNome}
            </p>
            <p className="text-xs tabular-nums text-cyan-800">
              {cartao.inicio} – {cartao.fim}
            </p>
            {cartao.observacoes ? <p className="mt-1 line-clamp-2 text-xs text-gray-600">{cartao.observacoes}</p> : null}
          </div>
        </div>
        <div className="mt-2 border-t border-white/70 pt-2">
          <span className={`text-xs font-medium ${cartao.realizada ? 'text-green-700' : 'text-gray-500'}`}>
            {cartao.realizada ? 'Consulta realizada' : 'Confirmar realizada'}
          </span>
        </div>
      </div>
    );
  }

  const statusLembrete =
    cartao.situacao === 'concluido' ? 'Realizado' : cartao.situacao === 'atrasado' ? 'Atrasado' : 'Pendente';
  const statusCls =
    cartao.situacao === 'concluido' ? 'text-green-700' : cartao.situacao === 'atrasado' ? 'text-red-700' : 'text-orange-700';
  return (
    <div className="mt-4 rounded-lg p-3 shadow-sm md:rounded-xl md:p-4" style={cartao.estilo}>
      <div className="flex items-start gap-1.5 sm:gap-2">
        <CalendarioPacienteAuthAvatar name={pacienteNome} photoUrl={cartao.fotoUrl} dimensionClass={avatarCard} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-semibold ${cartao.situacao === 'concluido' ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                title={pacienteNome}
              >
                {pacienteNome}
              </p>
              {cartao.horario ? (
                <p className={`mt-0.5 text-xs font-medium ${statusCls}`}>
                  {cartao.horario}
                  {cartao.avisoWhatsApp ? ' · aviso WhatsApp' : ''}
                </p>
              ) : null}
              <p className={`mt-1 text-sm ${cartao.situacao === 'concluido' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                {cartao.texto}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cartao.tagClass}`}>
              {cartao.tag}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-1 border-t border-gray-200/60 pt-2">
        <span className={`text-xs font-medium ${statusCls}`}>{statusLembrete}</span>
      </div>
    </div>
  );
}

type Props = {
  pacienteNome: string;
  fotoUrl?: string | null;
  doseMg?: number;
  variacaoPeso?: number | null;
  variacaoComp?: number | null;
  situacao?: 'aplicada' | 'futura' | 'atrasada';
  totalAplicacoes?: number;
  aplicadas?: number;
  pendentes?: number;
  percAplicadas?: number;
  percPendentes?: number;
  segmentos?: SegmentoFaixaAplicacao[];
  cartao?: CartaoMensagemEnvio;
  linkWhatsapp: string | null;
  enviando: boolean;
  erro: string;
  rotulo?: string;
  mensagem: string;
  onMensagemChange: (mensagem: string) => void;
  getAuthToken: () => Promise<string | null>;
  onCancel: () => void;
  onEnvioAutomatico: () => void;
  onAbrirWhatsapp: () => void;
};

function numero(valor: number | undefined): string {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return '—';
  return String(valor);
}

export default function AplicacaoMensagemEnvioModal({
  pacienteNome,
  fotoUrl,
  doseMg,
  variacaoPeso,
  variacaoComp,
  situacao = 'atrasada',
  totalAplicacoes,
  aplicadas,
  pendentes,
  percAplicadas,
  percPendentes,
  segmentos,
  cartao,
  linkWhatsapp,
  enviando,
  erro,
  rotulo = 'Mensagem da aplicação',
  mensagem,
  onMensagemChange,
  getAuthToken,
  onCancel,
  onEnvioAutomatico,
  onAbrirWhatsapp,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [medicoConnected, setMedicoConnected] = useState(false);
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
        } | null;
        if (!res.ok || data?.ok === false) {
          if (!cancelled) setErroStatus(data?.error || 'Não foi possível consultar a conexão.');
          return;
        }
        if (!cancelled) setMedicoConnected(data?.medicoConnected === true);
      } catch {
        if (!cancelled) setErroStatus('Não foi possível consultar a conexão.');
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const abrirVerMensagem = () => {
    const botao = verMensagemRef.current?.querySelector('button');
    if (!botao || botao.disabled) return;
    botao.click();
  };

  const temResumo = typeof totalAplicacoes === 'number';
  const pctAplicadas = typeof percAplicadas === 'number' && Number.isFinite(percAplicadas) ? percAplicadas : 0;
  const pctPendentes = typeof percPendentes === 'number' && Number.isFinite(percPendentes) ? percPendentes : 0;
  const larguraAplicadas = Math.min(100, Math.max(0, pctAplicadas));
  const larguraPendentes = Math.min(100, Math.max(0, pctPendentes));

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center overscroll-none px-3 pt-5 md:items-center md:p-6">
      <div className="animate-sheet-backdrop absolute inset-0 bg-black/50" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aplicacao-mensagem-titulo"
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
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">{rotulo}</p>
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
            id="aplicacao-mensagem-titulo"
            className="mt-5 text-[25px] font-bold leading-tight text-[#0A1F44] md:text-[28px]"
          >
            Como deseja enviar esta mensagem?
          </h2>

          {temResumo ? (
            <div
              className="mt-4 rounded-lg p-2.5 shadow-sm md:rounded-xl md:p-3"
              style={
                situacao === 'aplicada'
                  ? { background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)', border: '1px solid #86efac', borderLeft: '4px solid #16a34a' }
                  : situacao === 'futura'
                    ? { background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)', border: '1px solid #fdba74', borderLeft: '4px solid #ea580c' }
                    : { background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626' }
              }
            >
              <div className="flex items-start gap-1.5 sm:gap-2">
                <CalendarioPacienteAuthAvatar
                  name={pacienteNome}
                  photoUrl={fotoUrl}
                  dimensionClass="h-[30px] w-[30px] text-[10px] md:h-[53px] md:w-[53px] md:text-[15px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900" title={pacienteNome}>
                    {pacienteNome}
                  </p>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1">
                    {typeof doseMg === 'number' && Number.isFinite(doseMg) ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold leading-none tabular-nums text-gray-800 ring-1 ring-black/[0.06]" title="Dose da aplicação">
                        <Syringe className="h-3 w-3 shrink-0" aria-hidden />
                        {doseMg} mg
                      </span>
                    ) : null}
                    {typeof variacaoPeso === 'number' && Number.isFinite(variacaoPeso) ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold leading-none tabular-nums text-gray-800 ring-1 ring-black/[0.06]" title="Peso acumulado deste protocolo">
                        <Weight className="h-3 w-3 shrink-0" aria-hidden />
                        <span className={variacaoPeso <= -1 ? 'text-green-700' : 'text-red-600'}>
                          {variacaoPeso > 0 ? '+' : ''}
                          {variacaoPeso.toFixed(1)} kg
                        </span>
                      </span>
                    ) : null}
                    {typeof variacaoComp === 'number' && Number.isFinite(variacaoComp) ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold leading-none tabular-nums text-gray-800 ring-1 ring-black/[0.06]" title="Comprimento abdominal acumulado deste protocolo">
                        <Ruler className="h-3 w-3 shrink-0" aria-hidden />
                        <span className={variacaoComp <= 0 ? 'text-green-700' : 'text-red-600'}>
                          {variacaoComp > 0 ? '+' : ''}
                          {variacaoComp.toFixed(1)} cm
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div
                className="mt-2.5 rounded-xl bg-white/75 px-2.5 py-2 ring-1 ring-black/[0.05]"
                title={`Aplicadas ${Math.round(pctAplicadas)}% • Pendentes ${Math.round(pctPendentes)}%`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-600">
                  <span>Total <span className="font-semibold text-gray-900">{numero(totalAplicacoes)}</span></span>
                  <span>Aplicadas <span className="font-semibold text-gray-900">{numero(aplicadas)}</span></span>
                  <span>Pendentes <span className="font-semibold text-gray-900">{numero(pendentes)}</span></span>
                </div>
                {segmentos && segmentos.length > 0 ? (
                  <BarraFaixaAplicacoes segmentos={segmentos} className="h-2" />
                ) : (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="flex h-full">
                      <div className="bg-green-500" style={{ width: `${larguraAplicadas}%` }} />
                      <div className="bg-orange-500" style={{ width: `${larguraPendentes}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : cartao ? (
            <CartaoReplica cartao={cartao} pacienteNome={pacienteNome} />
          ) : null}

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              disabled={enviando || carregando || !medicoConnected}
              onClick={onEnvioAutomatico}
              className={`flex w-full items-center gap-3 rounded-[18px] border px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                medicoConnected ? 'border-emerald-200 bg-emerald-50/80' : 'border-[#E5EAF1] bg-white'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Send className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-[#0A1F44]">Envio automático</span>
                  {!carregando && !medicoConnected ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Desconectado
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] font-medium text-emerald-800">
                  {carregando ? 'Verificando conexão…' : medicoConnected ? 'Envio automático agora' : 'Conecte seu WhatsApp para enviar.'}
                </span>
              </span>
              {medicoConnected ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : null}
            </button>

            <button
              type="button"
              disabled={enviando || !linkWhatsapp}
              onClick={onAbrirWhatsapp}
              className="flex w-full items-center gap-3 rounded-[18px] border border-[#E5EAF1] bg-white px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[#0A1F44]">
                <Smartphone className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[#0A1F44]">Abrir o WhatsApp</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
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
                <span className="mt-0.5 block text-[13px] text-slate-500">Visualize o conteúdo antes do envio.</span>
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
              {enviando ? 'Enviando…' : 'Verificando conexão…'}
            </p>
          ) : null}
          {erro || erroStatus ? <p className="mt-3 text-sm text-red-600">{erro || erroStatus}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
