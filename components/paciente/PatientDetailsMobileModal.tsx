'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  CalendarDays,
  MapPin,
  UserRound,
  Cake,
  Hourglass,
  DollarSign,
  MessageCircle,
  Bell,
  FileText,
  Info,
  Plus,
  Brain,
} from 'lucide-react';
import { labPatientInitials } from '@/components/LabResultCard';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import type { SegmentoFaixaAplicacao } from '@/utils/tirzepatidaProtocoloDisplay';
import { CanalChatVerifiedBadge } from '@/components/metaadmin/CanalChatVerifiedBadge';
import type { Lembrete } from '@/types/lembrete';
import { getLembreteTagConfig } from '@/types/lembrete';

export type PatientDetailsMobileModalProps = {
  open: boolean;
  onClose: () => void;
  patientName: string;
  /** Paciente confirmou o Canal Chat. Ausente/false = não exibe ícone. */
  canalChatVerified?: boolean;
  /** URL já resolvida (Firebase Auth photoURL via /api/user-photo). */
  photoUrl?: string | null;
  statusLabel: string;
  statusClassName: string;
  perdaPesoTotal: number | null;
  perdaCompAbdominalTotal: number | null;
  /** Variação de IMC (atual − baseline), mesma convenção das outras perdas. */
  perdaImcTotal?: number | null;
  /** % da meta de peso (0–100). IMC usa o mesmo valor. */
  metaProgressPesoPct?: number | null;
  /** % da meta de circunferência abdominal (0–100). */
  metaProgressAbdominalPct?: number | null;
  /** Texto da meta de peso (ex.: "15 kg") — balão ao tocar no %. */
  metaPesoValorLabel?: string | null;
  /** Texto da meta abdominal (ex.: "8 cm"). */
  metaAbdominalValorLabel?: string | null;
  /** Peso-alvo absoluto (kg) — badge "Meta: x kg" no card de peso. */
  pesoMetaKg?: number | null;
  /** Circunferência abdominal alvo (cm) — badge "Meta: x cm". */
  compAbdominalMetaCm?: number | null;
  /** IMC correspondente ao peso-alvo — ponto na barra de cores. */
  imcMeta?: number | null;
  /** Semana em que o paciente está / total do plano. */
  aplicacoesFeitas?: number;
  aplicacoesTotal?: number;
  segmentosAplicacoes?: SegmentoFaixaAplicacao[];
  /** Ícones do cabeçalho (ex.: gráfico / fotos), montados pela página. */
  headerMedia?: ReactNode;
  /**
   * Faixa informativa no topo do conteúdo (ex.: prontuário compartilhado).
   * Mesma ideia do banner do modal desktop.
   */
  banner?: ReactNode;
  /** Atalhos/ações já montados pela página (mesmas permissões/handlers). */
  shortcuts: ReactNode;
  pesoAtual: number | null;
  /** Comp. abdominal atual (cm). */
  compAbdominalAtual: number | null;
  /** Altura em metros — usada na barra de IMC e no subtítulo do KPI IMC. */
  alturaMetros: number | null;
  imcAtual: number | null;
  grauObesidadeLabel: string | null;
  grauObesidadeClassName: string;
  /** Posição 0–100 do marcador (mesma matemática do card). */
  imcMarkerPercent: number;
  imcBarRef?: (el: HTMLDivElement | null) => void;
  onImcMouseDown?: (e: MouseEvent) => void;
  onImcTouchStart?: (e: TouchEvent) => void;
  cadastroLabel: string;
  telefone: string;
  telefoneWhatsApp: string;
  linkWhatsApp: string;
  /**
   * Quando informado, a barra inferior mostra Relatório (abre `/relatorio` do paciente)
   * ao lado do WhatsApp. Usado no metaadmin mobile.
   */
  relatorioPacienteId?: string | null;
  cidade: string;
  sexoLabel: string | null;
  dataNascimentoLabel: string;
  idadeLabel: string | null;
  valorTotalNode: ReactNode;
  /** @deprecated Removido da UI; mantido opcional por compatibilidade. */
  npsNode?: ReactNode;
  /**
   * Pastas Info / Lembretes / Prontuário [/ Psiquiatria].
   * Só o metaadmin mobile passa isto — nutri/personal mantêm o card estático.
   */
  folders?: {
    lembretes: Lembrete[];
    onOpenProntuario: () => void;
    onOpenLembretes: () => void;
    onToggleLembrete: (id: string, concluido: boolean) => void | Promise<void>;
    /** Conteúdo da pasta Psiquiatria (share + PsiquiatriaContent). Só metaadmin. */
    psiquiatriaContent?: ReactNode;
  };
};

type InfoFolderId = 'info' | 'lembretes' | 'psiquiatria';

function formatLembreteDataHora(ymd: string, horario?: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd || '-';
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  return horario ? `${dateLabel} · ${horario}` : dateLabel;
}

function sortLembretesDesc(items: Lembrete[]): Lembrete[] {
  return [...items].sort((a, b) => {
    const keyA = `${a.data || ''}T${a.horario || '00:00'}`;
    const keyB = `${b.data || ''}T${b.horario || '00:00'}`;
    if (keyA !== keyB) return keyB.localeCompare(keyA);
    const criadoA = a.criadoEm instanceof Date ? a.criadoEm.getTime() : 0;
    const criadoB = b.criadoEm instanceof Date ? b.criadoEm.getTime() : 0;
    return criadoB - criadoA;
  });
}

function formatMetaMedida(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatEvolucaoArrow(value: number, unit?: 'kg' | 'cm') {
  const arrow = value < 0 ? '↓' : value > 0 ? '↑' : '';
  const num = Math.abs(value).toFixed(1);
  const unitPart = unit ? `\u00A0${unit}` : '';
  return `${arrow ? `${arrow} ` : ''}${num}${unitPart}`;
}

function evolucaoTextClass(value: number) {
  if (value < 0) return 'text-[color:var(--state-success,#16a34a)]';
  if (value > 0) return 'text-orange-600';
  return 'text-[color:var(--text-secondary,#6b7280)]';
}

function imcMarkerColor(imc: number | null): string {
  if (!imc || imc === 0) return 'var(--text-secondary)';
  if (imc < 18.5) return '#60a5fa';
  if (imc < 25) return 'var(--state-success, #16a34a)';
  if (imc < 30) return 'var(--state-warning, #f59e0b)';
  return 'var(--state-danger, #ef4444)';
}

/** Mesma matemática da barra de IMC do card (não alterar). */
function calcularPosicaoMarcador(imc: number | null | undefined): number {
  if (!imc || imc === 0) return 0;
  if (imc < 18.5) return (imc / 18.5) * 25;
  if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
  if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
  return 75 + Math.min(((imc - 30) / 20) * 25, 25);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Contagem 0 → alvo ao abrir; depois sincroniza ao vivo (ex.: arraste da barra).
 */
function useCountUp(
  target: number | null | undefined,
  replayKey: string,
  durationMs = 1100
): { value: number | null; settled: boolean } {
  const [display, setDisplay] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const animatingRef = useRef(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!replayKey) {
      setDisplay(null);
      setSettled(false);
      animatingRef.current = false;
      return;
    }
    const to = targetRef.current;
    if (to == null || !Number.isFinite(to)) {
      setDisplay(null);
      setSettled(true);
      return;
    }

    animatingRef.current = true;
    setSettled(false);
    setDisplay(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const latest = targetRef.current;
      const end = latest != null && Number.isFinite(latest) ? latest : to;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(end * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        animatingRef.current = false;
        setDisplay(end);
        setSettled(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      animatingRef.current = false;
    };
    // Só reanima ao abrir / trocar paciente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey, durationMs]);

  useEffect(() => {
    if (animatingRef.current) return;
    if (target == null || !Number.isFinite(target)) {
      setDisplay(null);
      return;
    }
    setDisplay(target);
  }, [target]);

  return { value: display, settled };
}

/**
 * Modal full-screen mobile com detalhes do paciente.
 * Apenas visual: dados e handlers vêm da página.
 */
export default function PatientDetailsMobileModal({
  open,
  onClose,
  patientName,
  canalChatVerified = false,
  photoUrl,
  statusLabel,
  statusClassName,
  perdaPesoTotal,
  perdaCompAbdominalTotal,
  perdaImcTotal = null,
  metaProgressPesoPct = null,
  metaProgressAbdominalPct = null,
  metaPesoValorLabel = null,
  metaAbdominalValorLabel = null,
  pesoMetaKg = null,
  compAbdominalMetaCm = null,
  imcMeta = null,
  aplicacoesFeitas = 0,
  aplicacoesTotal = 0,
  segmentosAplicacoes = [],
  headerMedia,
  banner,
  shortcuts,
  pesoAtual,
  compAbdominalAtual,
  alturaMetros,
  imcAtual,
  grauObesidadeLabel,
  grauObesidadeClassName,
  imcMarkerPercent,
  imcBarRef,
  onImcMouseDown,
  onImcTouchStart,
  cadastroLabel,
  telefone,
  telefoneWhatsApp,
  linkWhatsApp,
  relatorioPacienteId,
  cidade,
  sexoLabel,
  dataNascimentoLabel,
  idadeLabel,
  valorTotalNode,
  folders,
}: PatientDetailsMobileModalProps) {
  const replayKey = open ? `${patientName}|${cadastroLabel}` : '';
  const [openFolder, setOpenFolder] = useState<InfoFolderId | null>('info');

  const { value: pesoAnim } = useCountUp(
    pesoAtual != null && pesoAtual > 0 ? pesoAtual : null,
    replayKey
  );
  const { value: compAnim } = useCountUp(
    compAbdominalAtual != null && compAbdominalAtual > 0 ? compAbdominalAtual : null,
    replayKey
  );
  const { value: imcAnim, settled: imcSettled } = useCountUp(
    imcAtual != null && imcAtual > 0 ? imcAtual : null,
    replayKey
  );
  const { value: perdaPesoAnim } = useCountUp(perdaPesoTotal, replayKey);
  const { value: perdaCompAnim } = useCountUp(perdaCompAbdominalTotal, replayKey);
  const { value: perdaImcAnim } = useCountUp(perdaImcTotal, replayKey);

  const aplicacoesPctTarget =
    aplicacoesTotal > 0
      ? Math.min(100, (aplicacoesFeitas / aplicacoesTotal) * 100)
      : null;
  const { value: metaPesoAnim } = useCountUp(
    metaProgressPesoPct != null && Number.isFinite(metaProgressPesoPct)
      ? Math.max(0, Math.min(100, metaProgressPesoPct))
      : null,
    replayKey
  );
  const { value: metaAbdAnim } = useCountUp(
    metaProgressAbdominalPct != null && Number.isFinite(metaProgressAbdominalPct)
      ? Math.max(0, Math.min(100, metaProgressAbdominalPct))
      : null,
    replayKey
  );
  const { value: aplicacoesPctAnim } = useCountUp(aplicacoesPctTarget, replayKey);
  const { value: aplicacoesFeitasAnim } = useCountUp(
    aplicacoesTotal > 0 ? aplicacoesFeitas : null,
    replayKey
  );

  const [abrindoRelatorio, setAbrindoRelatorio] = useState(false);
  const [showSimuleHint, setShowSimuleHint] = useState(false);
  const [showAplicacoesHint, setShowAplicacoesHint] = useState(false);
  const hasImcBar =
    imcAtual != null && imcAtual > 0 && alturaMetros != null && alturaMetros > 0;

  useEffect(() => {
    if (!open || !hasImcBar || !imcSettled) {
      setShowSimuleHint(false);
      return;
    }
    setShowSimuleHint(true);
    const hide = window.setTimeout(() => setShowSimuleHint(false), 2000);
    return () => window.clearTimeout(hide);
  }, [open, hasImcBar, imcSettled, replayKey]);

  useEffect(() => {
    if (!showAplicacoesHint) return;
    const t = window.setTimeout(() => setShowAplicacoesHint(false), 2000);
    return () => window.clearTimeout(t);
  }, [showAplicacoesHint]);

  useEffect(() => {
    if (!open) setShowAplicacoesHint(false);
  }, [open]);

  useEffect(() => {
    setOpenFolder('info');
  }, [replayKey]);

  const dismissSimuleHint = () => setShowSimuleHint(false);

  const headerMediaRef = useRef<HTMLDivElement>(null);
  const [headerMediaWidth, setHeaderMediaWidth] = useState(0);

  useEffect(() => {
    if (!open) return;
    const el = headerMediaRef.current;
    if (!el) return;
    const update = () => setHeaderMediaWidth(el.offsetWidth);
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [open, headerMedia]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const initials = labPatientInitials(patientName);
  const photo = photoUrl?.trim() || null;
  const imcExibido = imcAnim != null && imcAnim > 0 ? imcAnim : imcAtual;
  const markerColor = imcMarkerColor(imcExibido);
  const markerPercent =
    imcExibido != null && imcExibido > 0
      ? calcularPosicaoMarcador(imcExibido)
      : imcMarkerPercent;
  const imcMetaExibido = imcMeta != null && imcMeta > 0 ? imcMeta : null;
  const metaMarkerPercent =
    imcMetaExibido != null ? calcularPosicaoMarcador(imcMetaExibido) : null;
  const pesoMetaBadge =
    pesoMetaKg != null && pesoMetaKg > 0 ? formatMetaMedida(pesoMetaKg) : null;
  const compMetaBadge =
    compAbdominalMetaCm != null && compAbdominalMetaCm > 0
      ? formatMetaMedida(compAbdominalMetaCm)
      : null;
  const showResumo =
    (pesoAtual != null && pesoAtual > 0) ||
    (compAbdominalAtual != null && compAbdominalAtual > 0) ||
    (imcAtual != null && imcAtual > 0);
  const telefoneExibicao = telefone?.trim() || telefoneWhatsApp || '';
  const relatorioId = relatorioPacienteId?.trim() || '';
  const showRelatorio = Boolean(relatorioId);
  const showWhatsApp = Boolean(telefoneWhatsApp);
  const showFooter = showRelatorio || showWhatsApp;

  const abrirRelatorio = async () => {
    if (!relatorioId || abrindoRelatorio) return;
    setAbrindoRelatorio(true);
    try {
      const res = await fetch(
        `/api/relatorio-paciente/link?pacienteId=${encodeURIComponent(relatorioId)}`
      );
      const payload = (await res.json()) as { url?: string; error?: string };
      if (payload?.url) {
        window.open(payload.url, '_blank', 'noopener,noreferrer');
        return;
      }
      alert(payload?.error || 'Não foi possível abrir o relatório.');
    } catch {
      alert('Erro ao obter link do relatório.');
    } finally {
      setAbrindoRelatorio(false);
    }
  };
  const aplicacoesPct =
    aplicacoesPctAnim != null && Number.isFinite(aplicacoesPctAnim)
      ? Math.max(0, Math.min(100, aplicacoesPctAnim))
      : aplicacoesTotal > 0
        ? Math.min(100, (aplicacoesFeitas / aplicacoesTotal) * 100)
        : 0;
  const aplicacoesFeitasExibido =
    aplicacoesFeitasAnim != null && Number.isFinite(aplicacoesFeitasAnim)
      ? Math.round(aplicacoesFeitasAnim)
      : aplicacoesFeitas;
  const metaPctPeso = metaPesoAnim;
  const metaPctAbdominal = metaAbdAnim;
  const metaPctImc = metaPesoAnim; // mesma constante da meta de peso

  // z-[60]: acima da bottom nav (z-50); abaixo de financeiro (z-80), exames/aplicações/bio (z-70) e demais modais (z-9999+)
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[color:var(--surface-background,#f8fafc)] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${patientName}`}
    >
      {/* Header sticky */}
      <header
        className="shrink-0 border-b border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5">
          <div className="row-span-2">
            <PhotoWithAplicacoesRing
              photoUrl={photo}
              initials={initials}
              percent={aplicacoesTotal > 0 ? aplicacoesPct : null}
            />
          </div>

          <h2 className="flex min-w-0 items-center gap-1.5 pt-0.5 text-lg font-semibold leading-tight text-[color:var(--text-primary,#111827)] translate-y-[1mm]">
            <span className="truncate">{patientName}</span>
            <CanalChatVerifiedBadge verified={canalChatVerified === true} />
          </h2>

          <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
            <div ref={headerMediaRef} className="flex items-center gap-0.5">
              {headerMedia}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex min-h-[1.25rem] items-center -translate-y-[1mm]">
            <span
              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold leading-none ${statusClassName}`}
            >
              {statusLabel}
            </span>
          </div>

          {aplicacoesTotal > 0 ? (
            <div className="relative flex min-h-[1.25rem] items-center justify-start">
              <button
                type="button"
                className="flex h-3 items-center gap-1"
                style={{
                  width: headerMediaWidth > 0 ? headerMediaWidth : undefined,
                  minWidth: headerMediaWidth > 0 ? undefined : '6.5rem',
                }}
                aria-label={`${aplicacoesFeitas} de ${aplicacoesTotal} aplicações`}
                onClick={() => setShowAplicacoesHint(true)}
              >
                {segmentosAplicacoes.length > 0 ? (
                  <BarraFaixaAplicacoes
                    segmentos={segmentosAplicacoes}
                    className="h-1.5 min-w-0 flex-1"
                    trackClassName="bg-emerald-100"
                  />
                ) : (
                  <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-800"
                      style={{ width: `${aplicacoesPct}%` }}
                    />
                  </div>
                )}
                <span className="shrink-0 text-[10px] font-semibold tabular-nums leading-none text-emerald-950">
                  {aplicacoesFeitasExibido}/{aplicacoesTotal}
                </span>
              </button>

              {showAplicacoesHint ? (
                <div
                  className="pointer-events-none absolute z-[6] animate-hint-pulse"
                  style={{
                    top: '100%',
                    left: 0,
                    transform: 'translateY(6px)',
                  }}
                  aria-hidden
                >
                  <div
                    className="ml-3 h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-slate-800/90"
                    aria-hidden
                  />
                  <div className="whitespace-nowrap rounded-full bg-slate-800/90 px-2.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                    Já foram{' '}
                    <span className="tabular-nums">
                      {aplicacoesFeitas} de {aplicacoesTotal}
                    </span>{' '}
                    aplicações
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div />
          )}
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        style={{
          paddingBottom: showFooter
            ? 'calc(5.5rem + env(safe-area-inset-bottom))'
            : 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        {banner ? <div className="mb-4">{banner}</div> : null}

        {/* Atalhos */}
        <section className="mb-4">
          <div className="flex flex-wrap items-center justify-center gap-1.5">{shortcuts}</div>
        </section>

        {/* Resumo corporal — 3 KPIs limpos */}
        {showResumo && (
          <section className="mb-4 rounded-[18px] border border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-4">
            <div className="grid grid-cols-3 gap-2">
              <KpiColumn
                metaPercent={metaPctPeso}
                metaHintLabel={metaPesoValorLabel}
                metaHintKind="peso"
                metaValorLabel={pesoMetaBadge}
                metaValorUnit="kg"
                label="Peso atual"
                valueNumber={
                  pesoAnim != null && pesoAnim > 0
                    ? pesoAnim.toFixed(1)
                    : pesoAtual != null && pesoAtual > 0
                      ? pesoAtual.toFixed(1)
                      : null
                }
                valueUnit="kg"
                evolucao={
                  perdaPesoAnim !== null
                    ? formatEvolucaoArrow(perdaPesoAnim, 'kg')
                    : perdaPesoTotal !== null
                      ? formatEvolucaoArrow(perdaPesoTotal, 'kg')
                      : null
                }
                evolucaoClassName={
                  (perdaPesoAnim ?? perdaPesoTotal) != null
                    ? evolucaoTextClass((perdaPesoAnim ?? perdaPesoTotal) as number)
                    : undefined
                }
              />
              <KpiColumn
                metaPercent={metaPctAbdominal}
                metaHintLabel={metaAbdominalValorLabel}
                metaHintKind="abdominal"
                metaValorLabel={compMetaBadge}
                metaValorUnit="cm"
                label={'Comprimento\nabdominal'}
                valueNumber={
                  compAnim != null && compAnim > 0
                    ? compAnim.toFixed(1)
                    : compAbdominalAtual != null && compAbdominalAtual > 0
                      ? compAbdominalAtual.toFixed(1)
                      : null
                }
                valueUnit="cm"
                evolucao={
                  perdaCompAnim !== null
                    ? formatEvolucaoArrow(perdaCompAnim, 'cm')
                    : perdaCompAbdominalTotal !== null
                      ? formatEvolucaoArrow(perdaCompAbdominalTotal, 'cm')
                      : null
                }
                evolucaoClassName={
                  (perdaCompAnim ?? perdaCompAbdominalTotal) != null
                    ? evolucaoTextClass(
                        (perdaCompAnim ?? perdaCompAbdominalTotal) as number
                      )
                    : undefined
                }
              />
              <KpiColumn
                metaPercent={metaPctImc}
                metaHintLabel={metaPesoValorLabel}
                metaHintKind="imc"
                label="IMC"
                valueNumber={
                  imcAnim != null && imcAnim > 0
                    ? imcAnim.toFixed(1)
                    : imcAtual != null && imcAtual > 0
                      ? imcAtual.toFixed(1)
                      : null
                }
                evolucao={
                  perdaImcAnim !== null
                    ? formatEvolucaoArrow(perdaImcAnim)
                    : perdaImcTotal !== null
                      ? formatEvolucaoArrow(perdaImcTotal)
                      : null
                }
                evolucaoClassName={
                  (perdaImcAnim ?? perdaImcTotal) != null
                    ? evolucaoTextClass((perdaImcAnim ?? perdaImcTotal) as number)
                    : undefined
                }
                alturaLabel={
                  alturaMetros != null && alturaMetros > 0
                    ? alturaMetros.toFixed(2)
                    : null
                }
              />
            </div>

            {hasImcBar && (
              <div className="mt-4 border-t border-[color:var(--border-default,#e5e7eb)] pt-4">
                <div
                  className="relative w-full"
                  style={{
                    paddingTop: metaMarkerPercent != null ? 52 : 26,
                    paddingBottom: 2,
                  }}
                >
                  {grauObesidadeLabel ? (
                    <div
                      className={`pointer-events-none absolute left-0 top-0 z-[2] max-w-[58%] truncate text-[11px] font-semibold leading-tight ${grauObesidadeClassName}`}
                    >
                      {grauObesidadeLabel}
                    </div>
                  ) : null}
                  <div
                    ref={imcBarRef}
                    className="relative w-full overflow-visible rounded-full"
                    style={{ height: 8 }}
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'linear-gradient(90deg, #93c5fd 0%, #93c5fd 25%, #6ee7b7 25%, #6ee7b7 50%, #fcd34d 50%, #fcd34d 75%, #fca5a5 75%, #fca5a5 100%)',
                      }}
                    />

                    {metaMarkerPercent != null && imcMetaExibido != null ? (
                      <div
                        className="pointer-events-none absolute bottom-full z-[6] mb-0.5 flex -translate-x-1/2 flex-col items-center drop-shadow-md"
                        style={{
                          left: `clamp(14px, ${metaMarkerPercent}%, calc(100% - 14px))`,
                        }}
                        title={`IMC correspondente à meta: ${imcMetaExibido.toFixed(1)}`}
                        role="img"
                        aria-label={`IMC correspondente à meta: ${imcMetaExibido.toFixed(1)}`}
                      >
                        <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                          <Image
                            src="/icones/imc-meta-alvo-simbolo.png"
                            alt=""
                            width={18}
                            height={18}
                            className="h-[88%] w-[88%] object-contain object-center"
                            draggable={false}
                          />
                        </div>
                        <div
                          className="-mt-px h-0 w-0 shrink-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-white"
                          aria-hidden
                        />
                      </div>
                    ) : null}

                    <div
                      className="pointer-events-none absolute z-[4]"
                      style={{
                        left: `clamp(16px, ${markerPercent}%, calc(100% - 16px))`,
                        top: 0,
                        transform: 'translate(-50%, calc(-100% - 6px))',
                      }}
                    >
                      <div
                        className="rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                        style={{ background: markerColor }}
                      >
                        {(imcExibido ?? imcAtual!).toFixed(1)}
                      </div>
                      <div
                        className="mx-auto h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent"
                        style={{ borderTopColor: markerColor }}
                        aria-hidden
                      />
                    </div>

                    <div
                      className="absolute top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
                      style={{ left: `${markerPercent}%`, userSelect: 'none' }}
                      onMouseDown={(e) => {
                        dismissSimuleHint();
                        onImcMouseDown?.(e);
                      }}
                      onTouchStart={(e) => {
                        dismissSimuleHint();
                        onImcTouchStart?.(e);
                      }}
                    >
                      <div
                        className="rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.14)]"
                        style={{
                          width: 20,
                          height: 20,
                          background: markerColor,
                        }}
                        aria-hidden
                      />
                    </div>

                    {showSimuleHint && (
                      <div
                        className="pointer-events-none absolute z-[6] animate-hint-pulse"
                        style={{
                          left: `clamp(36px, ${markerPercent}%, calc(100% - 36px))`,
                          top: '100%',
                          transform: 'translate(-50%, 8px)',
                        }}
                        aria-hidden
                      >
                        <div
                          className="mx-auto h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-slate-800/90"
                          aria-hidden
                        />
                        <div className="whitespace-nowrap rounded-full bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                          ←&nbsp;Simule&nbsp;→
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex justify-between">
                  <span className="text-[11px] text-gray-500">Baixo</span>
                  <span className="text-[11px] text-gray-500">Saudável</span>
                  <span className="text-[11px] text-gray-500">Alto</span>
                  <span className="text-[11px] text-gray-500">Obeso</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Informações do paciente — pastas no metaadmin mobile */}
        {folders ? (
          <PatientInfoFolders
            openFolder={openFolder}
            onToggleFolder={(id) =>
              setOpenFolder((prev) => (prev === id ? null : id))
            }
            onOpenProntuario={folders.onOpenProntuario}
            onOpenLembretes={folders.onOpenLembretes}
            onToggleLembrete={folders.onToggleLembrete}
            lembretes={folders.lembretes}
            psiquiatriaContent={folders.psiquiatriaContent}
            infoGrid={
              <PatientInfoGrid
                cadastroLabel={cadastroLabel}
                cidade={cidade}
                sexoLabel={sexoLabel}
                dataNascimentoLabel={dataNascimentoLabel}
                idadeLabel={idadeLabel}
                valorTotalNode={valorTotalNode}
              />
            }
          />
        ) : (
          <section className="rounded-[18px] border border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary,#6b7280)]">
              Informações do paciente
            </h3>
            <PatientInfoGrid
              cadastroLabel={cadastroLabel}
              cidade={cidade}
              sexoLabel={sexoLabel}
              dataNascimentoLabel={dataNascimentoLabel}
              idadeLabel={idadeLabel}
              valorTotalNode={valorTotalNode}
            />
          </section>
        )}
      </div>

      {/* Rodapé fixo: Relatório (metaadmin) + WhatsApp */}
      {showFooter ? (
        <div
          className="absolute inset-x-0 bottom-0 border-t border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className={showRelatorio ? 'flex items-stretch gap-2' : ''}>
            {showRelatorio ? (
              <button
                type="button"
                onClick={() => void abrirRelatorio()}
                disabled={abrindoRelatorio}
                title="Abrir relatório do paciente"
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-3 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,23,42,0.2)] transition-opacity hover:opacity-95 active:opacity-90 disabled:opacity-60"
              >
                <FileText size={20} strokeWidth={2.25} />
                <span className="truncate">{abrindoRelatorio ? 'Abrindo…' : 'Relatório'}</span>
              </button>
            ) : null}
            {showRelatorio || showWhatsApp ? (
              showWhatsApp ? (
                <a
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={telefoneExibicao ? `WhatsApp · ${telefoneExibicao}` : 'Abrir WhatsApp'}
                  className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,211,102,0.35)] transition-opacity hover:opacity-95 active:opacity-90 ${
                    showRelatorio ? 'flex-1 px-3' : 'w-full px-4'
                  }`}
                >
                  <MessageCircle size={20} strokeWidth={2.25} />
                  <span className="truncate">
                    {showRelatorio ? 'WhatsApp' : `WhatsApp · ${telefoneExibicao}`}
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Telefone não disponível"
                  className="flex min-w-0 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-3.5 text-sm font-semibold text-white opacity-50"
                >
                  <MessageCircle size={20} strokeWidth={2.25} />
                  <span className="truncate">WhatsApp</span>
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

function CircularMetaBadge({
  percent,
  hintLabel,
  hintKind,
  size = 40,
  stroke = 3.5,
}: {
  percent: number | null | undefined;
  hintLabel?: string | null;
  hintKind?: 'peso' | 'abdominal' | 'imc';
  size?: number;
  stroke?: number;
}) {
  const [showHint, setShowHint] = useState(false);
  const pct =
    percent != null && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, percent))
      : null;
  const pctLabel = pct != null ? Math.round(pct) : null;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = pct != null ? (pct / 100) * c : 0;
  // Mesmo padrão da foto: núcleo menor que o SVG para a linha do anel aparecer ao redor
  const inner = Math.max(22, size - 14);

  useEffect(() => {
    if (!showHint) return;
    const t = window.setTimeout(() => setShowHint(false), 2000);
    return () => window.clearTimeout(t);
  }, [showHint]);

  const hintTitle =
    hintKind === 'abdominal' ? 'Meta abdominal' : 'Meta de peso';
  const hintBody =
    hintLabel?.trim() ||
    (pctLabel != null ? `${pctLabel}%` : null);

  return (
    <div className="relative flex shrink-0 flex-col items-center">
      <button
        type="button"
        className="relative"
        style={{ width: size, height: size }}
        aria-label={pctLabel != null ? `${pctLabel}% da meta` : 'Meta não definida'}
        onClick={() => {
          if (!hintBody && pctLabel == null) return;
          setShowHint(true);
        }}
      >
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(2,44,34,0.18)"
            strokeWidth={stroke}
          />
          {pct != null ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#022c22"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          ) : null}
        </svg>
        <span
          className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full bg-white text-[10px] font-extrabold tabular-nums leading-none text-[#022c22] shadow-sm shadow-emerald-950/15"
          style={{
            width: inner,
            height: inner,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {pctLabel != null ? `${pctLabel}%` : '—'}
        </span>
      </button>

      {showHint && hintBody ? (
        <div
          className="pointer-events-none absolute z-[6] animate-hint-pulse"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translate(-50%, 6px)',
          }}
          aria-hidden
        >
          <div
            className="mx-auto h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-slate-800/90"
            aria-hidden
          />
          <div className="whitespace-nowrap rounded-full bg-slate-800/90 px-2.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
            <span className="block opacity-90">{hintTitle}</span>
            <span className="tabular-nums">{hintBody}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhotoWithAplicacoesRing({
  photoUrl,
  initials,
  percent,
}: {
  photoUrl: string | null;
  initials: string;
  percent: number | null;
}) {
  const size = 72;
  const stroke = 3.5;
  const inner = 58;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = percent != null ? Math.max(0, Math.min(100, percent)) : null;
  const dash = pct != null ? (pct / 100) * c : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(6,95,70,0.15)"
          strokeWidth={stroke}
        />
        {pct != null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#065f46"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        ) : null}
      </svg>
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden rounded-full border border-white bg-emerald-50"
        style={{
          width: inner,
          height: inner,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[color:var(--brand-primary)]">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiColumn({
  metaPercent,
  metaHintLabel,
  metaHintKind,
  metaValorLabel,
  metaValorUnit,
  label,
  valueNumber,
  valueUnit,
  evolucao,
  evolucaoClassName,
  alturaLabel,
}: {
  metaPercent?: number | null;
  metaHintLabel?: string | null;
  metaHintKind?: 'peso' | 'abdominal' | 'imc';
  /** Valor absoluto da meta, sem unidade (ex.: "70.5"). */
  metaValorLabel?: string | null;
  metaValorUnit?: 'kg' | 'cm';
  label: string;
  valueNumber: string | null;
  valueUnit?: string;
  evolucao?: string | null;
  evolucaoClassName?: string;
  alturaLabel?: string | null;
}) {
  return (
    <div
      className="relative flex min-w-0 flex-col items-center overflow-visible rounded-2xl border border-emerald-100/70 px-1.5 py-2.5 text-center sm:px-2 sm:py-3"
      style={{
        background:
          'linear-gradient(165deg, #ecfdf5 0%, #d1fae5 48%, #a7f3d0 100%)',
      }}
    >
      <div className="mb-1.5 flex justify-center">
        <CircularMetaBadge
          percent={metaPercent}
          hintLabel={metaHintLabel}
          hintKind={metaHintKind}
        />
      </div>

      {/* Altura fixa de 2 linhas para alinhar os valores entre as 3 colunas */}
      <div className="mb-1 flex h-[2.05rem] items-end justify-center">
        <div className="whitespace-pre-line text-[10px] font-semibold uppercase tracking-wide leading-tight text-emerald-900/55 sm:text-[11px]">
          {label}
        </div>
      </div>

      <div className="flex min-h-[1.65rem] flex-wrap items-baseline justify-center gap-x-0.5 leading-none">
        {valueNumber != null ? (
          <>
            <span className="whitespace-nowrap text-[22px] font-extrabold tabular-nums tracking-tight text-emerald-950 sm:text-[24px]">
              {valueNumber}
            </span>
            {valueUnit ? (
              <span className="whitespace-nowrap text-[12px] font-medium text-emerald-800/60">
                {valueUnit}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-[22px] font-extrabold text-emerald-800/40 sm:text-[24px]">
            -
          </span>
        )}
      </div>

      {evolucao ? (
        <div
          className={`mt-1.5 whitespace-nowrap text-[13px] font-bold tabular-nums leading-tight ${evolucaoClassName || 'text-[color:var(--state-success,#16a34a)]'}`}
        >
          {evolucao}
        </div>
      ) : null}

      {alturaLabel ? (
        <div className="mt-1.5 inline-flex max-w-full items-center justify-center rounded-full bg-white/70 px-2 py-0.5 text-[10px] leading-tight text-emerald-900/60 ring-1 ring-white/50">
          <span>Altura&nbsp;</span>
          <span className="font-semibold tabular-nums text-emerald-950">
            {alturaLabel}&nbsp;m
          </span>
        </div>
      ) : null}

      {metaValorLabel && metaValorUnit ? (
        <div className="mt-1.5 inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5 text-[10px] leading-tight text-emerald-900/60 ring-1 ring-white/50">
          <span>Meta:&nbsp;</span>
          <span className="font-semibold tabular-nums text-emerald-950">
            {metaValorLabel}&nbsp;{metaValorUnit}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--text-secondary,#6b7280)]">
        <span className="text-[color:var(--brand-primary)] opacity-80">{icon}</span>
        {label}
      </dt>
      <dd className="truncate text-sm font-semibold text-[color:var(--text-primary,#111827)]">
        {value}
      </dd>
    </div>
  );
}

function PatientInfoGrid({
  cadastroLabel,
  cidade,
  sexoLabel,
  dataNascimentoLabel,
  idadeLabel,
  valorTotalNode,
}: {
  cadastroLabel: string;
  cidade: string;
  sexoLabel: string | null;
  dataNascimentoLabel: string;
  idadeLabel: string | null;
  valorTotalNode: ReactNode;
}) {
  return (
    <dl className="grid grid-cols-3 gap-x-2.5 gap-y-3.5">
      <InfoCell
        icon={<CalendarDays size={14} />}
        label="Cadastro"
        value={cadastroLabel}
      />
      <InfoCell icon={<MapPin size={14} />} label="Cidade" value={cidade || '-'} />
      {sexoLabel && (
        <InfoCell icon={<UserRound size={14} />} label="Sexo" value={sexoLabel} />
      )}
      <InfoCell
        icon={<Cake size={14} />}
        label="Nascimento"
        value={dataNascimentoLabel}
      />
      {idadeLabel && (
        <InfoCell icon={<Hourglass size={14} />} label="Idade" value={idadeLabel} />
      )}
      <InfoCell icon={<DollarSign size={14} />} label="Valor Total" value={valorTotalNode} />
    </dl>
  );
}

function PatientInfoFolders({
  openFolder,
  onToggleFolder,
  onOpenProntuario,
  onOpenLembretes,
  onToggleLembrete,
  lembretes,
  infoGrid,
  psiquiatriaContent,
}: {
  openFolder: InfoFolderId | null;
  onToggleFolder: (id: InfoFolderId) => void;
  onOpenProntuario: () => void;
  onOpenLembretes: () => void;
  onToggleLembrete: (id: string, concluido: boolean) => void | Promise<void>;
  lembretes: Lembrete[];
  infoGrid: ReactNode;
  psiquiatriaContent?: ReactNode;
}) {
  const showPsi = psiquiatriaContent != null;
  const folderBtn =
    'flex min-w-0 flex-1 items-center justify-center gap-0.5 px-1 py-2.5 text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-colors';

  return (
    <section className="overflow-hidden rounded-[18px] border border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex min-w-0 border-b border-[color:var(--border-default,#e5e7eb)] overflow-x-auto">
        <button
          type="button"
          onClick={() => onToggleFolder('info')}
          aria-expanded={openFolder === 'info'}
          className={`${folderBtn} ${
            openFolder === 'info'
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-[color:var(--text-secondary,#6b7280)] hover:bg-gray-50'
          }`}
        >
          <Info size={14} strokeWidth={2.25} />
          Info
        </button>
        <button
          type="button"
          onClick={() => onToggleFolder('lembretes')}
          aria-expanded={openFolder === 'lembretes'}
          className={`${folderBtn} border-x border-[color:var(--border-default,#e5e7eb)] ${
            openFolder === 'lembretes'
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-[color:var(--text-secondary,#6b7280)] hover:bg-gray-50'
          }`}
        >
          <Bell size={14} strokeWidth={2.25} />
          Lembretes
        </button>
        <button
          type="button"
          onClick={onOpenProntuario}
          className={`${folderBtn} text-[color:var(--text-secondary,#6b7280)] hover:bg-gray-50 ${
            showPsi ? 'border-r border-[color:var(--border-default,#e5e7eb)]' : ''
          }`}
        >
          <FileText size={14} strokeWidth={2.25} />
          Prontuário
        </button>
        {showPsi ? (
          <button
            type="button"
            onClick={() => onToggleFolder('psiquiatria')}
            aria-expanded={openFolder === 'psiquiatria'}
            className={`${folderBtn} ${
              openFolder === 'psiquiatria'
                ? 'bg-indigo-50 text-indigo-800'
                : 'text-[color:var(--text-secondary,#6b7280)] hover:bg-gray-50'
            }`}
          >
            <Brain size={14} strokeWidth={2.25} />
            Psiquiatria
          </button>
        ) : null}
      </div>

      {openFolder === 'info' ? <div className="p-4">{infoGrid}</div> : null}

      {openFolder === 'lembretes' ? (
        <LembretesFolderList
          lembretes={lembretes}
          onOpenLembretes={onOpenLembretes}
          onToggleLembrete={onToggleLembrete}
        />
      ) : null}

      {openFolder === 'psiquiatria' && showPsi ? (
        <div className="min-w-0 max-w-full overflow-x-hidden p-2 sm:p-3">{psiquiatriaContent}</div>
      ) : null}
    </section>
  );
}

function LembretesFolderList({
  lembretes,
  onOpenLembretes,
  onToggleLembrete,
}: {
  lembretes: Lembrete[];
  onOpenLembretes: () => void;
  onToggleLembrete: (id: string, concluido: boolean) => void | Promise<void>;
}) {
  const sorted = sortLembretesDesc(lembretes);

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onOpenLembretes}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600"
          title="Gerenciar lembretes"
          aria-label="Gerenciar lembretes"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="py-5 text-center text-sm text-[color:var(--text-secondary,#6b7280)]">
          Nenhum lembrete para este paciente.
        </p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {sorted.map((lembrete) => {
            const tagCfg = getLembreteTagConfig(lembrete.tag);
            return (
              <div
                key={lembrete.id}
                className={`rounded-xl border-l-4 px-3 py-2.5 ${
                  lembrete.concluido
                    ? 'border-green-500 bg-green-50/50 opacity-80'
                    : 'border-orange-400 bg-orange-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[color:var(--text-secondary,#6b7280)]">
                      {formatLembreteDataHora(lembrete.data, lembrete.horario)}
                    </p>
                    <p
                      className={`mt-0.5 text-sm ${
                        lembrete.concluido
                          ? 'text-gray-400 line-through'
                          : 'text-[color:var(--text-primary,#111827)]'
                      }`}
                    >
                      {lembrete.texto || '—'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tagCfg.bgLight} ${tagCfg.textLight}`}
                  >
                    {lembrete.tag}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold ${
                      lembrete.concluido ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {lembrete.concluido ? 'Concluído' : 'Pendente'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!lembrete.concluido}
                    onClick={() => void onToggleLembrete(lembrete.id, !lembrete.concluido)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                      lembrete.concluido ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                    title={lembrete.concluido ? 'Marcar como pendente' : 'Marcar como realizado'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        lembrete.concluido ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
