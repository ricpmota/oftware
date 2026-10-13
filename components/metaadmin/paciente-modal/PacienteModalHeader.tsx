'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Dumbbell,
  FileText,
  MapPin,
  Stethoscope,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { labPatientInitials } from '@/components/LabResultCard';

export type PacienteModalStatusTratamento =
  | 'pendente'
  | 'em_tratamento'
  | 'concluido'
  | 'abandono';

const STATUS_LABEL: Record<PacienteModalStatusTratamento, string> = {
  pendente: 'Pendente',
  em_tratamento: 'Em Tratamento',
  concluido: 'Concluído',
  abandono: 'Abandono',
};

const STATUS_BADGE_CLASS: Record<PacienteModalStatusTratamento, string> = {
  pendente: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/80',
  em_tratamento: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80',
  concluido: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200/80',
  abandono: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80',
};

function calcIdadeLabel(dataNascimento?: string | Date | null): string | null {
  if (!dataNascimento) return null;
  try {
    const nascimento =
      dataNascimento instanceof Date ? dataNascimento : new Date(dataNascimento);
    if (isNaN(nascimento.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    if (idade < 0 || idade > 130) return null;
    return `${idade} anos`;
  } catch {
    return null;
  }
}

function cidadeLabel(cidade?: string | null, estado?: string | null): string | null {
  const c = cidade?.trim();
  if (!c) return null;
  const uf = estado?.trim();
  return uf ? `${c} - ${uf}` : c;
}

function RelatorioPacienteBadge({ pacienteId }: { pacienteId: string }) {
  const [abrindo, setAbrindo] = useState(false);

  const abrir = async () => {
    if (abrindo) return;
    setAbrindo(true);
    try {
      const res = await fetch(
        `/api/relatorio-paciente/link?pacienteId=${encodeURIComponent(pacienteId)}`
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
      setAbrindo(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void abrir()}
      disabled={abrindo}
      title="Abrir relatório do paciente"
      className="hidden lg:inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold leading-tight text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:text-[11px]"
    >
      <FileText className="h-3 w-3" aria-hidden />
      {abrindo ? 'Abrindo…' : 'Relatório'}
    </button>
  );
}

function formatDataLeitura(value?: string | Date | null): string | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

export type PacienteModalHeaderProps = {
  patientName: string;
  /** URL já resolvida (Firebase Auth / Google photoURL). */
  patientPhotoUrl?: string | null;
  dataNascimento?: string | Date | null;
  cidade?: string | null;
  estado?: string | null;
  statusTratamento?: PacienteModalStatusTratamento | null;
  /** Exibe badge de status (default true). */
  showStatusBadge?: boolean;
  /** Clique no badge de status (abre modal de escolha). */
  onStatusClick?: () => void;
  /** Badge ao lado do status (metaadmin). `null`/`undefined` = não exibir. */
  recomendacoesLidas?: boolean | null;
  dataLeituraRecomendacoes?: string | Date | null;
  medicoLabel?: string | null;
  nutriLabel?: string | null;
  personalLabel?: string | null;
  /** Linha extra sob a meta. */
  metaExtra?: ReactNode;
  /** Conteúdo imediatamente à esquerda do badge de status (ex.: lembretes). */
  beforeStatus?: ReactNode;
  /** Se true (default), `beforeStatus` só aparece no desktop. */
  beforeStatusDesktopOnly?: boolean;
  /** Controles à direita (financeiro, etc.), antes do fechar. */
  actions?: ReactNode;
  /** Ações no centro da barra. Só aparece no desktop (xl+). */
  center?: ReactNode;
  /** Abre `/relatorio` deste paciente. O badge só aparece no desktop. */
  relatorioPacienteId?: string | null;
  onClose?: () => void;
  closeButtonClassName?: string;
  closeAriaLabel?: string;
  compact?: boolean;
  className?: string;
  /** Conteúdo abaixo da barra (alertas de abandono/pendente). */
  children?: ReactNode;
};

/**
 * Cabeçalho moderno do modal de paciente (metaadmin / metanutri / metapersonal).
 * Foto = Google login via photoURL já resolvida; fallback em iniciais.
 */
export default function PacienteModalHeader({
  patientName,
  patientPhotoUrl,
  dataNascimento,
  cidade,
  estado,
  statusTratamento,
  showStatusBadge = true,
  onStatusClick,
  recomendacoesLidas,
  dataLeituraRecomendacoes,
  medicoLabel,
  nutriLabel,
  personalLabel,
  metaExtra,
  beforeStatus,
  beforeStatusDesktopOnly = true,
  actions,
  center,
  relatorioPacienteId,
  onClose,
  closeButtonClassName = 'close-button text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1.5 transition-colors',
  closeAriaLabel = 'Fechar',
  compact = false,
  className = '',
  children,
}: PacienteModalHeaderProps) {
  const name = patientName.trim() || 'Paciente';
  const initials = labPatientInitials(name);
  const photo = patientPhotoUrl?.trim() || null;
  const idade = calcIdadeLabel(dataNascimento);
  const local = cidadeLabel(cidade, estado);
  const statusKey =
    statusTratamento && statusTratamento in STATUS_LABEL
      ? statusTratamento
      : null;
  const dataLeituraLabel = formatDataLeitura(dataLeituraRecomendacoes);
  const iconCls = `${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0`;
  const metaTextCls = compact ? 'text-xs' : 'text-sm';

  const professionalItems: ReactNode[] = [];
  if (medicoLabel) {
    professionalItems.push(
      <span key="medico" className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
        <Stethoscope className={`${iconCls} text-emerald-600/80`} aria-hidden />
        <span className="truncate">
          <span className="text-slate-400">Médico:</span>{' '}
          <span className="font-medium text-slate-700">{medicoLabel}</span>
        </span>
      </span>
    );
  }
  if (nutriLabel) {
    professionalItems.push(
      <span key="nutri" className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
        <UtensilsCrossed className={`${iconCls} text-teal-600/80`} aria-hidden />
        <span className="truncate">
          <span className="text-slate-400">Nutri:</span>{' '}
          <span className="font-medium text-slate-700">{nutriLabel}</span>
        </span>
      </span>
    );
  }
  if (personalLabel) {
    professionalItems.push(
      <span key="personal" className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
        <Dumbbell className={`${iconCls} text-sky-600/80`} aria-hidden />
        <span className="truncate">
          <span className="text-slate-400">Personal:</span>{' '}
          <span className="font-medium text-slate-700">{personalLabel}</span>
        </span>
      </span>
    );
  }

  const statusBadgeClass = statusKey
    ? `inline-flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLASS[statusKey]}`
    : '';

  const statusBadgeContent = statusKey ? (
    <>
      {STATUS_LABEL[statusKey]}
      {onStatusClick ? <ChevronDown className="h-3 w-3 opacity-70" aria-hidden /> : null}
    </>
  ) : null;

  const relatorioId = String(relatorioPacienteId || '').trim();
  const relatorioBadge = relatorioId ? <RelatorioPacienteBadge pacienteId={relatorioId} /> : null;

  const recomendacoesBadge =
    recomendacoesLidas != null ? (
      recomendacoesLidas ? (
        <span
          className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold leading-tight text-emerald-800 ring-1 ring-emerald-200/80 sm:max-w-none sm:text-[11px]"
          title={dataLeituraLabel ? `Lido em ${dataLeituraLabel}` : undefined}
        >
          Leu recomendações
          {dataLeituraLabel ? (
            <span className="font-medium text-emerald-600/90">· {dataLeituraLabel}</span>
          ) : null}
        </span>
      ) : (
        <span className="inline-flex max-w-[11rem] items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold leading-tight text-orange-800 ring-1 ring-orange-200/80 sm:max-w-none sm:text-[11px]">
          Não leu recomendações
        </span>
      )
    ) : null;

  const recomendacoesIcon =
    recomendacoesLidas != null ? (
      <RecomendacoesAlertIcon
        leu={recomendacoesLidas}
        dataLeituraLabel={dataLeituraLabel}
      />
    ) : null;

  return (
    <div
      className={`relative flex-shrink-0 border-b border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/40 ${
        compact ? 'px-4 py-3' : 'px-5 py-4 sm:px-6'
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />

      <div
        className={`flex items-start justify-between gap-3 ${
          center
            ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-center xl:gap-4'
            : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className={`shrink-0 rounded-full border-2 border-white object-cover shadow-[0_2px_8px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 ${
                compact ? 'h-11 w-11' : 'h-14 w-14 sm:h-16 sm:w-16'
              }`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-50 font-semibold text-[color:var(--brand-primary,#059669)] shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-emerald-100 ${
                compact ? 'h-11 w-11 text-sm' : 'h-14 w-14 text-base sm:h-16 sm:w-16 sm:text-lg'
              }`}
              aria-hidden
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2
              className={`min-w-0 truncate font-semibold tracking-tight text-slate-900 ${
                compact ? 'text-lg' : 'text-xl sm:text-2xl'
              }`}
            >
              {name}
            </h2>

            {idade || local ? (
              <div
                className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500 ${metaTextCls}`}
              >
                {idade ? (
                  <span className="tabular-nums whitespace-nowrap">{idade}</span>
                ) : null}
                {idade && local ? (
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                ) : null}
                {local ? (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className={`${iconCls} opacity-60`} aria-hidden />
                    <span className="truncate">{local}</span>
                  </span>
                ) : null}
              </div>
            ) : null}

            {professionalItems.length > 0 ? (
              <div
                className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500 ${metaTextCls}`}
              >
                {professionalItems.map((item, i) => (
                  <span key={i} className="inline-flex min-w-0 items-center gap-2">
                    {i > 0 ? (
                      <span className="text-slate-300" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            {metaExtra ? <div className="mt-1.5">{metaExtra}</div> : null}
          </div>
        </div>

        {center ? (
          <div className="hidden items-center justify-center xl:flex">{center}</div>
        ) : null}

        <div
          className={`flex shrink-0 flex-col items-end gap-1.5 ${
            center ? 'xl:min-w-0 xl:justify-self-end' : ''
          }`}
        >
          {compact ? (
            <>
              <div className="flex items-center gap-1.5">
                {beforeStatus ? (
                  <div className={beforeStatusDesktopOnly ? 'hidden lg:flex' : 'flex'}>
                    {beforeStatus}
                  </div>
                ) : null}
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`${closeButtonClassName} -mr-1`}
                    aria-label={closeAriaLabel}
                    title={closeAriaLabel}
                  >
                    <X size={22} />
                  </button>
                ) : null}
              </div>
              {showStatusBadge && statusKey ? (
                <div className="flex items-center gap-1.5">
                  {onStatusClick ? (
                    <button
                      type="button"
                      onClick={onStatusClick}
                      className={`${statusBadgeClass} transition-opacity hover:opacity-90 active:opacity-80`}
                      title="Alterar status do tratamento"
                      aria-label={`Status: ${STATUS_LABEL[statusKey]}. Alterar status do tratamento`}
                    >
                      {statusBadgeContent}
                    </button>
                  ) : (
                    <span className={statusBadgeClass}>{statusBadgeContent}</span>
                  )}
                  {recomendacoesIcon}
                </div>
              ) : (
                recomendacoesIcon
              )}
              {actions}
            </>
          ) : (
            <div
              className={`flex items-start gap-2 ${
                center ? 'max-w-full flex-wrap justify-end' : ''
              }`}
            >
              {beforeStatus ? (
                <div className={beforeStatusDesktopOnly ? 'hidden lg:flex' : 'flex'}>
                  {beforeStatus}
                </div>
              ) : null}
              {showStatusBadge && statusKey ? (
                onStatusClick ? (
                  <button
                    type="button"
                    onClick={onStatusClick}
                    className={`${statusBadgeClass} transition-opacity hover:opacity-90 active:opacity-80`}
                    title="Alterar status do tratamento"
                    aria-label={`Status: ${STATUS_LABEL[statusKey]}. Alterar status do tratamento`}
                  >
                    {statusBadgeContent}
                  </button>
                ) : (
                  <span className={statusBadgeClass}>{statusBadgeContent}</span>
                )
              ) : null}
              {actions}
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className={closeButtonClassName}
                  aria-label={closeAriaLabel}
                  title={closeAriaLabel}
                >
                  <X size={24} />
                </button>
              ) : null}
            </div>
          )}
          {compact || (!recomendacoesBadge && !relatorioBadge) ? null : (
            <div className="flex items-center justify-end gap-1.5">
              {recomendacoesBadge}
              {relatorioBadge}
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

function RecomendacoesAlertIcon({
  leu,
  dataLeituraLabel,
}: {
  leu: boolean;
  dataLeituraLabel: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titulo = leu ? 'Leu recomendações' : 'Não leu recomendações';

  useEffect(() => {
    if (!aberto) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setAberto(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [aberto]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 transition-colors ${
          leu
            ? 'bg-emerald-100 text-emerald-700 ring-emerald-200 hover:bg-emerald-200/80'
            : 'bg-amber-100 text-amber-700 ring-amber-200 hover:bg-amber-200/80'
        }`}
        aria-expanded={aberto}
        aria-controls={panelId}
        aria-label={titulo}
        title={titulo}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      </button>
      {aberto ? (
        <div
          id={panelId}
          role="status"
          className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg"
        >
          <p
            className={`text-xs font-semibold ${leu ? 'text-emerald-800' : 'text-amber-800'}`}
          >
            {titulo}
          </p>
          {leu && dataLeituraLabel ? (
            <p className="mt-0.5 text-[11px] text-slate-500">Lido em {dataLeituraLabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
