'use client';

import { ArrowRight, ClipboardCheck, Loader2, Lock } from 'lucide-react';

type Props = {
  accentColor: string;
  /** Texto sobre o destaque fora do Método. Ausente mantém o navy atual. */
  accentTextColor?: string;
  pageBg?: string;
  onSolicitar: () => void;
  disabled?: boolean;
  loading?: boolean;
  subtitulo?: string;
  sticky?: boolean;
};

export default function PublicDoctorCTA({
  accentColor,
  accentTextColor,
  pageBg = '#0A1F44',
  onSolicitar,
  disabled,
  loading,
  subtitulo = 'Solicite uma avaliação para iniciar seu acompanhamento.',
  sticky,
}: Props) {
  const buttonStyle = accentTextColor
    ? { backgroundColor: accentColor, color: accentTextColor }
    : { backgroundColor: accentColor };
  const mutedTextStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : undefined;
  if (sticky) {
    return (
      <div
        className="shrink-0 border-t border-gray-200/80 bg-white px-3 pt-3 shadow-[0_-8px_30px_rgba(10,31,68,0.08)] md:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={onSolicitar}
          disabled={disabled || loading}
          className="drprov-cta-shimmer flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold text-[#0A1F44] transition-opacity disabled:opacity-60"
          style={buttonStyle}
          aria-label="Solicitar acompanhamento"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-[15px] leading-tight">Solicitar acompanhamento</span>
              <span className="mt-0.5 block text-[11px] font-medium text-[#0A1F44]/70" style={mutedTextStyle}>
                Rápido e seguro
              </span>
            </span>
          </span>
          {loading ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          )}
        </button>
      </div>
    );
  }

  return (
    <section className="drprov-rise relative overflow-hidden rounded-2xl border border-gray-100 bg-white px-4 py-5 text-center shadow-sm sm:px-5 sm:py-6">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl"
        style={{ background: accentColor }}
        aria-hidden
      />
      <h2 className="relative text-[20px] font-bold tracking-tight sm:text-[22px]">
        <span className="text-gray-900">Solicite seu </span>
        <span style={{ color: pageBg }}>acompanhamento</span>
      </h2>
      <p className="relative mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-gray-600">
        {subtitulo}
      </p>

      <button
        type="button"
        onClick={onSolicitar}
        disabled={disabled || loading}
        className="drprov-cta-shimmer relative mx-auto mt-5 flex h-[56px] w-full max-w-md items-center justify-center gap-2.5 rounded-2xl px-4 text-[15px] font-bold text-[#0A1F44] shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95 disabled:opacity-60 sm:h-[60px] sm:text-[16px]"
        style={buttonStyle}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <span>Quero iniciar meu atendimento</span>
        <ArrowRight className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
      </button>

      <p className="relative mt-3 inline-flex items-center justify-center gap-1.5 text-[12px] leading-relaxed text-gray-500">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Seus dados são protegidos e utilizados apenas para o fluxo de atendimento.
      </p>
    </section>
  );
}
