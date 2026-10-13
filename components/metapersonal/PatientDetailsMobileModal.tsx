'use client';

import { useEffect, type ReactNode, type MouseEvent, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Scale,
  Ruler,
  Activity,
  CalendarDays,
  MapPin,
  UserRound,
  Cake,
  Hourglass,
  DollarSign,
  Star,
  MessageCircle,
} from 'lucide-react';
import { labPatientInitials } from '@/components/LabResultCard';

export type PatientDetailsMobileModalProps = {
  open: boolean;
  onClose: () => void;
  patientName: string;
  /** URL já resolvida (Firebase Auth photoURL via /api/user-photo). */
  photoUrl?: string | null;
  statusLabel: string;
  statusClassName: string;
  perdaPesoTotal: number | null;
  perdaCompAbdominalTotal: number | null;
  /** Variação de IMC (atual − baseline), mesma convenção das outras perdas. */
  perdaImcTotal?: number | null;
  /** Ícones do cabeçalho (ex.: gráfico / fotos), montados pela página. */
  headerMedia?: ReactNode;
  /** Atalhos/ações já montados pela página (mesmas permissões/handlers). */
  shortcuts: ReactNode;
  pesoAtual: number | null;
  /** Comp. abdominal atual (cm). */
  compAbdominalAtual: number | null;
  /** Altura em metros — só para a barra de IMC (não exibida no resumo). */
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
  cidade: string;
  sexoLabel: string | null;
  dataNascimentoLabel: string;
  idadeLabel: string | null;
  valorTotalNode: ReactNode;
  npsNode: ReactNode;
};

function formatPerdaChip(value: number, unit: 'kg' | 'cm' | 'IMC') {
  const sign = value !== 0 ? (value < 0 ? '-' : '+') : '';
  const abs = unit === 'IMC' ? Math.abs(value).toFixed(1) : Math.abs(value).toFixed(1);
  return unit === 'IMC' ? `${sign}${abs}` : `${sign}${abs} ${unit}`;
}

function perdaChipClass(value: number) {
  if (value < 0) return 'bg-green-100 text-green-800';
  if (value > 0) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-800';
}

function imcMarkerColor(imc: number | null): string {
  if (!imc || imc === 0) return 'var(--text-secondary)';
  if (imc < 18.5) return '#60a5fa';
  if (imc < 25) return 'var(--state-success, #16a34a)';
  if (imc < 30) return 'var(--state-warning, #f59e0b)';
  return 'var(--state-danger, #ef4444)';
}

/**
 * Modal full-screen mobile com detalhes do paciente.
 * Apenas visual: dados e handlers vêm da página.
 */
export default function PatientDetailsMobileModal({
  open,
  onClose,
  patientName,
  photoUrl,
  statusLabel,
  statusClassName,
  perdaPesoTotal,
  perdaCompAbdominalTotal,
  perdaImcTotal = null,
  headerMedia,
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
  cidade,
  sexoLabel,
  dataNascimentoLabel,
  idadeLabel,
  valorTotalNode,
  npsNode,
}: PatientDetailsMobileModalProps) {
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
  const markerColor = imcMarkerColor(imcAtual);
  const showResumo =
    (pesoAtual != null && pesoAtual > 0) ||
    (compAbdominalAtual != null && compAbdominalAtual > 0) ||
    (imcAtual != null && imcAtual > 0);
  const telefoneExibicao = telefone?.trim() || telefoneWhatsApp || '';

  // z-[60]: acima da bottom nav (z-50); abaixo de exames/aplicações/bio (z-70) e demais modais (z-9999+)
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
        <div className="flex items-start gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-[color:var(--border-default,#e5e7eb)] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-base font-semibold text-[color:var(--brand-primary)]"
              aria-hidden
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="truncate text-lg font-semibold leading-tight text-[color:var(--text-primary,#111827)]">
              {patientName}
            </h2>
            <div className="mt-1.5">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClassName}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
            {headerMedia}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        style={{
          paddingBottom: telefoneWhatsApp
            ? 'calc(5.5rem + env(safe-area-inset-bottom))'
            : 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Atalhos */}
        <section className="mb-4">
          <div className="flex flex-wrap items-center justify-center gap-1.5">{shortcuts}</div>
        </section>

        {/* Resumo corporal */}
        {showResumo && (
          <section className="mb-4 rounded-[18px] border border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-3 divide-x divide-[color:var(--border-default,#e5e7eb)]">
              <MetricCell
                icon={<Scale size={18} className="text-[color:var(--brand-primary)]" />}
                value={pesoAtual != null && pesoAtual > 0 ? `${pesoAtual.toFixed(1)} kg` : '-'}
                label="Peso atual"
                perdaBadge={
                  perdaPesoTotal !== null ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${perdaChipClass(perdaPesoTotal)}`}
                    >
                      {formatPerdaChip(perdaPesoTotal, 'kg')}
                    </span>
                  ) : null
                }
              />
              <MetricCell
                icon={<Ruler size={18} className="text-[color:var(--brand-secondary,#2563eb)]" />}
                value={
                  compAbdominalAtual != null && compAbdominalAtual > 0
                    ? `${compAbdominalAtual.toFixed(1)} cm`
                    : '-'
                }
                label="Comp. abdominal"
                perdaBadge={
                  perdaCompAbdominalTotal !== null ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${perdaChipClass(perdaCompAbdominalTotal)}`}
                    >
                      {formatPerdaChip(perdaCompAbdominalTotal, 'cm')}
                    </span>
                  ) : null
                }
              />
              <MetricCell
                icon={<Activity size={18} className="text-teal-600" />}
                value={imcAtual != null && imcAtual > 0 ? imcAtual.toFixed(1) : '-'}
                label="IMC"
                subValue={
                  alturaMetros != null && alturaMetros > 0
                    ? `${alturaMetros.toFixed(2)} m`
                    : null
                }
                subLabel="Altura"
                perdaBadge={
                  perdaImcTotal !== null ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${perdaChipClass(perdaImcTotal)}`}
                    >
                      {formatPerdaChip(perdaImcTotal, 'IMC')}
                    </span>
                  ) : null
                }
              />
            </div>

            {imcAtual != null && imcAtual > 0 && alturaMetros != null && alturaMetros > 0 && (
              <div className="mt-4 border-t border-[color:var(--border-default,#e5e7eb)] pt-4">
                <div
                  className="relative w-full"
                  style={{ paddingTop: 26, paddingBottom: 2 }}
                >
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

                    <div
                      className="pointer-events-none absolute z-[4]"
                      style={{
                        left: `clamp(16px, ${imcMarkerPercent}%, calc(100% - 16px))`,
                        top: 0,
                        transform: 'translate(-50%, calc(-100% - 6px))',
                      }}
                    >
                      <div
                        className="rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                        style={{ background: markerColor }}
                      >
                        {imcAtual.toFixed(1)}
                      </div>
                      <div
                        className="mx-auto h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent"
                        style={{ borderTopColor: markerColor }}
                        aria-hidden
                      />
                    </div>

                    <div
                      className="absolute top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
                      style={{ left: `${imcMarkerPercent}%`, userSelect: 'none' }}
                      onMouseDown={onImcMouseDown}
                      onTouchStart={onImcTouchStart}
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
                  </div>
                </div>

                <div className="mt-2 flex justify-between">
                  <span className="text-[11px] text-gray-500">Baixo</span>
                  <span className="text-[11px] text-gray-500">Saudável</span>
                  <span className="text-[11px] text-gray-500">Alto</span>
                  <span className="text-[11px] text-gray-500">Obeso</span>
                </div>

                <div className="mt-3 rounded-xl bg-[color:var(--surface-background,#f8fafc)] px-3 py-2.5 text-center">
                  <div className="text-xs font-medium text-[color:var(--text-secondary,#6b7280)]">
                    Grau de Obesidade
                  </div>
                  <div className={`mt-0.5 text-sm font-semibold ${grauObesidadeClassName}`}>
                    {grauObesidadeLabel || '-'}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Informações do paciente */}
        <section className="rounded-[18px] border border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary,#6b7280)]">
            Informações do paciente
          </h3>
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
            <InfoCell icon={<Star size={14} />} label="NPS" value={npsNode} />
          </dl>
        </section>
      </div>

      {/* Rodapé fixo WhatsApp */}
      {telefoneWhatsApp ? (
        <div
          className="absolute inset-x-0 bottom-0 border-t border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,211,102,0.35)] transition-opacity hover:opacity-95 active:opacity-90"
          >
            <MessageCircle size={20} strokeWidth={2.25} />
            <span className="truncate">WhatsApp · {telefoneExibicao}</span>
          </a>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

function MetricCell({
  icon,
  value,
  label,
  subValue,
  subLabel,
  perdaBadge,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  subValue?: string | null;
  subLabel?: string;
  perdaBadge?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
      <div className="mb-1.5 flex justify-center">{icon}</div>
      <div className="truncate text-xl font-semibold tabular-nums text-[color:var(--text-primary,#111827)]">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-[color:var(--text-secondary,#6b7280)]">{label}</div>
      {perdaBadge ? <div className="mt-2 flex justify-center">{perdaBadge}</div> : null}
      {subValue ? (
        <div className="mt-2 border-t border-[color:var(--border-default,#e5e7eb)] pt-1.5">
          <div className="truncate text-sm font-semibold tabular-nums text-[color:var(--text-primary,#111827)]">
            {subValue}
          </div>
          {subLabel ? (
            <div className="mt-0.5 text-[11px] text-[color:var(--text-secondary,#6b7280)]">
              {subLabel}
            </div>
          ) : null}
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
