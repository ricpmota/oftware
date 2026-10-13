import Image from 'next/image';

/**
 * Recorte visual de /logomatch.png (1536×1024).
 * O símbolo M não ocupa o arquivo inteiro; o enquadramento mostra só o M.
 */
const SOURCE_W = 1536;
const SOURCE_H = 1024;
const MARK = { x: 250, y: 148, w: 1040, h: 724 };

type MatchLogoProps = {
  /** Altura visível do símbolo M, em px. A largura segue a proporção do asset. */
  height?: number;
  className?: string;
};

export function MatchLogo({ height = 28, className = '' }: MatchLogoProps) {
  const scale = height / MARK.h;
  const width = MARK.w * scale;

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <Image
        src="/logomatch.png"
        alt=""
        width={SOURCE_W}
        height={SOURCE_H}
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: SOURCE_W * scale,
          height: SOURCE_H * scale,
          maxWidth: 'none',
          left: -MARK.x * scale,
          top: -MARK.y * scale,
        }}
      />
    </span>
  );
}
