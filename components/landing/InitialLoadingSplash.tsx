'use client';

const DEFAULT_BG = '#0A1F44';

type Props = {
  backgroundColor?: string;
  /** Quando definido, substitui o símbolo padrão Oftware no splash. */
  logoSrc?: string;
  /** Classes Tailwind para o texto “Carregando…” (ex.: tema claro). */
  loadingTextClassName?: string;
};

export default function InitialLoadingSplash({
  backgroundColor = DEFAULT_BG,
  logoSrc,
  loadingTextClassName = 'text-[#E8EDED]',
}: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6"
      style={{ backgroundColor }}
    >
      <img
        src={logoSrc ?? '/simbolo-metodo.png'}
        alt=""
        className="w-[min(200px,42vw)] h-auto animate-home-loading-logo select-none"
        draggable={false}
      />
      <p className={`text-sm sm:text-base tracking-wide animate-home-loading-text ${loadingTextClassName}`}>
        Carregando...
      </p>
    </div>
  );
}
