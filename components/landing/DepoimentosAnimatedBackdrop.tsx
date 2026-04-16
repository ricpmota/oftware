'use client';

/** Posições % (left/top) dos símbolos no fundo — iguais à landing e /metaadmin. */
export const DEPOIMENTOS_LOGO_SPOTS: readonly { left: number; top: number }[] = [
  { left: 3, top: 8 },
  { left: 24, top: 4 },
  { left: 52, top: 6 },
  { left: 78, top: 10 },
  { left: 94, top: 22 },
  { left: 5, top: 42 },
  { left: 93, top: 48 },
  { left: 10, top: 86 },
  { left: 38, top: 94 },
  { left: 62, top: 90 },
  { left: 88, top: 76 },
  { left: 32, top: 28 },
  { left: 70, top: 38 },
  { left: 44, top: 58 },
];

/**
 * Fundo animado da seção Depoimentos (gradiente + logos flutuantes + blur).
 * Usar dentro de um container `relative overflow-hidden`.
 */
export default function DepoimentosAnimatedBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 animate-gradient-shift opacity-100"
        style={{
          background:
            'linear-gradient(135deg, rgba(232, 237, 237, 0.97) 0%, rgba(220, 245, 235, 0.95) 25%, rgba(232, 237, 237, 0.97) 50%, rgba(215, 238, 245, 0.95) 75%, rgba(232, 237, 237, 0.97) 100%)',
          backgroundSize: '200% 200%',
        }}
      />
      <div className="absolute inset-0">
        {DEPOIMENTOS_LOGO_SPOTS.map((pos, i) => (
          <div
            key={i}
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
          >
            <img
              src="/metodo-simbolo-18.png"
              alt=""
              aria-hidden
              className="object-contain animate-float-depoimentos-logo will-change-transform pointer-events-none select-none block max-w-none"
              style={{
                width: `${44 + (i % 5) * 16}px`,
                height: `${44 + (i % 5) * 16}px`,
                animationDelay: `${i * 0.6}s`,
                animationDuration: `${18 + (i % 4) * 3}s`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-[#4CCB7A]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-[#2F8FA3]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#E8EDED]/90 to-transparent" />
    </div>
  );
}
