import { AlertCircle } from 'lucide-react';
import { DEFAULT_DR_PAGE_BACKGROUND } from '@/lib/whiteLabel/publicPagesTheme';

export default function ContatoChatUnavailable() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4" style={{ backgroundColor: DEFAULT_DR_PAGE_BACKGROUND }}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white p-8 text-center shadow-xl">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Canal Chat</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Contato indisponível</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
          Não encontramos um Canal Chat configurado para este profissional.
        </p>
      </div>
    </div>
  );
}
