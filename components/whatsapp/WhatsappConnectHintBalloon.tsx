'use client';

type Props = {
  /** Alinhamento sob o âncora (ícone à direita no mobile → end). */
  align?: 'center' | 'end' | 'start';
  className?: string;
};

/**
 * Balão piscante verde — mesmo espírito do “← Simule →”.
 */
export default function WhatsappConnectHintBalloon({
  align = 'center',
  className = '',
}: Props) {
  const positionStyle =
    align === 'end'
      ? { top: '100%', right: 0, transform: 'translateY(6px)' as const }
      : align === 'start'
        ? { top: '100%', left: 0, transform: 'translateY(6px)' as const }
        : {
            top: '100%',
            left: '50%',
            transform: 'translate(-50%, 6px)' as const,
          };

  const arrowClass =
    align === 'end'
      ? 'ml-auto mr-3'
      : align === 'start'
        ? 'ml-3'
        : 'mx-auto';

  return (
    <div
      className={`pointer-events-none absolute z-[60] animate-hint-pulse ${className}`}
      style={positionStyle}
      aria-hidden
    >
      <div
        className={`h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-emerald-600 ${arrowClass}`}
      />
      <div className="whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide text-white shadow-[0_2px_8px_rgba(5,150,105,0.4)]">
        Conecte seu WhatsApp
      </div>
    </div>
  );
}
