'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import OftwarePlatformChatLogo from '@/components/meta/OftwarePlatformChatLogo';

type Props = {
  step: number;
  progressSteps: number;
  stepLabel?: string;
  topBanner?: string | null;
  children: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  onContinue?: () => void;
  showContinue?: boolean;
  continueLabel?: string;
  continueDisabled?: boolean;
  saving?: boolean;
  isTerminal?: boolean;
};

export default function VerificationWizardShell({
  step,
  progressSteps,
  stepLabel,
  topBanner,
  children,
  onBack,
  showBack = false,
  onContinue,
  showContinue = false,
  continueLabel = 'Continuar',
  continueDisabled = false,
  saving = false,
  isTerminal = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const progress =
    step <= 0 ? 0 : step >= progressSteps ? 100 : Math.round((step / progressSteps) * 100);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200/80 bg-white/90 px-4 pt-3 pb-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <OftwarePlatformChatLogo priority />
          </div>
          {stepLabel ? <span className="shrink-0 text-xs font-medium text-slate-500">{stepLabel}</span> : null}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {topBanner ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-xs font-medium leading-snug text-amber-900">{topBanner}</p>
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5">
        {children}
      </div>

      {!isTerminal && (showBack || showContinue) ? (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-3">
            {showBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={saving}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            ) : null}
            {showContinue && onContinue ? (
              <button
                type="button"
                onClick={onContinue}
                disabled={saving || continueDisabled}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  continueLabel
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VerificationAwaitingSupportScreen({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200/80 px-4 pt-3 pb-3">
        <OftwarePlatformChatLogo priority />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <h2 className="text-lg font-bold text-slate-900">Verificação em análise</h2>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium leading-relaxed text-amber-950">{message}</p>
          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            Esta tela permanece ativa até o Suporte liberar seu cadastro. O restante da plataforma fica indisponível até lá.
          </p>
        </div>
      </div>
    </div>
  );
}
