type Props = {
  show?: boolean;
  /** Exibir ícone Oftware ao lado do texto (desligado nas páginas white label do médico). */
  showBrandImage?: boolean;
  className?: string;
};

export default function PoweredByOftwareFooter({
  show = true,
  showBrandImage = true,
  className = '',
}: Props) {
  if (!show) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 ${className}`}
    >
      {showBrandImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo.png" alt="Oftware" className="h-5 w-auto opacity-60" />
      ) : null}
      <span className="text-xs">Powered by Oftware</span>
    </div>
  );
}
