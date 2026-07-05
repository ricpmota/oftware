import Link from 'next/link';

export default function InstagramHubNotActive() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-[#060d1f] px-6 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute -right-12 top-1/3 h-52 w-52 rounded-full bg-blue-500/10 blur-[90px]" />
      </div>

      <div className="relative w-full max-w-[380px] rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/oftware2.png" alt="Oftware" className="mx-auto mb-6 h-7 w-auto object-contain" />
        <h1 className="text-lg font-semibold text-white">Link da bio inativo</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Este link da bio ainda não está ativo.
        </p>
        <Link
          href="https://www.oftware.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-3 text-sm font-semibold text-[#060d1f] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060d1f]"
        >
          Conhecer a Oftware
        </Link>
      </div>
    </div>
  );
}
