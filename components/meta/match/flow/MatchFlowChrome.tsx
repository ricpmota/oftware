'use client';

import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type MatchFlowShellProps = {
  title: string;
  step: number;
  total: number;
  showProgress?: boolean;
  onBack?: () => void;
  backLabel?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function MatchFlowShell({
  title,
  step,
  total,
  showProgress = true,
  onBack,
  backLabel = 'Voltar',
  action,
  footer,
  children,
}: MatchFlowShellProps) {
  const progress = Math.min(100, Math.max(8, (step / total) * 100));

  return (
    <div className="min-h-full bg-[#F4F6F8] text-[#0A1F44]">
      <div className="mx-auto flex h-full min-h-full w-full max-w-[480px] flex-col overflow-hidden bg-white md:shadow-[0_0_40px_-24px_rgba(10,31,68,0.35)]">
        <header className="shrink-0 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex h-11 items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#0A1F44] hover:bg-[#F4F6F8]"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <span className="w-11" />
            )}
            <p className="flex-1 text-center text-sm font-semibold tracking-tight">{title}</p>
            <div className="flex min-w-11 shrink-0 justify-end">{action}</div>
          </div>
          {showProgress ? (
            <div className="mt-1">
              <p className="text-[11px] font-medium text-[#0A1F44]/55">
                Etapa {step} de {total}
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#E7ECF3]" aria-hidden="true">
                <div className="h-full rounded-full bg-[#4CCB7A]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-2">{children}</main>

        {footer ? (
          <div className="shrink-0 border-t border-[#E7ECF3] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MatchPrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6CD492] to-[#4CCB7A] text-[15px] font-semibold text-[#0A1F44] shadow-[0_10px_24px_-16px_rgba(76,203,122,0.9)] transition-transform duration-150 hover:brightness-[1.03] active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function MatchStepHeading({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle?: string;
  note?: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight text-[#0A1F44]">{title}</h1>
      {subtitle ? <p className="mt-2 text-[15px] leading-snug text-[#0A1F44]/70">{subtitle}</p> : null}
      {note ? <p className="mt-3 text-[13px] leading-snug text-[#0A1F44]/50">{note}</p> : null}
    </div>
  );
}
