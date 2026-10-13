import type { CSSProperties } from 'react';

/**
 * Recorte medido em public/icones-base-metodo.png (1774×887, RGBA).
 * Coordenadas inclusivas com alpha > 8, para ignorar pixels residuais
 * entre as células e não incluir o ícone vizinho.
 */
const SPRITE_WIDTH = 1774;
const SPRITE_HEIGHT = 887;
const SPRITE_URL = '/icones-base-metodo.png';

/**
 * public/icone-calendario.png (1983×793).
 * Linha 0 = ativo, linha 1 = inativo. A coluna segue o ícone.
 * Coordenadas medidas no PNG (há margem e vão entre os quadrados).
 */
const CALENDAR_SPRITE_URL = '/icone-calendario.png';
const CALENDAR_SPRITE_WIDTH = 1983;
const CALENDAR_SPRITE_HEIGHT = 793;

export type MetodoEmagrecerIconName =
  | 'pendente'
  | 'em-tratamento'
  | 'concluido'
  | 'abandono'
  | 'aplicacao'
  | 'bio-impedancia'
  | 'paciente'
  | 'grafico'
  | 'mensagens'
  | 'fotografia';

type SpriteFrame = { x: number; y: number; w: number; h: number };

const FRAMES: Record<MetodoEmagrecerIconName, SpriteFrame> = {
  pendente: { x: 44, y: 119, w: 309, h: 312 },
  'em-tratamento': { x: 385, y: 119, w: 315, h: 312 },
  concluido: { x: 729, y: 119, w: 315, h: 312 },
  abandono: { x: 1072, y: 119, w: 316, h: 312 },
  aplicacao: { x: 1420, y: 119, w: 311, h: 312 },
  'bio-impedancia': { x: 44, y: 454, w: 309, h: 300 },
  paciente: { x: 385, y: 454, w: 315, h: 300 },
  grafico: { x: 729, y: 454, w: 315, h: 300 },
  mensagens: { x: 1072, y: 454, w: 316, h: 300 },
  fotografia: { x: 1420, y: 454, w: 311, h: 300 },
};

export type MetodoEmagrecerIconVariant = 'active' | 'inactive';

const CALENDAR_COLUMN: Record<
  'grafico' | 'bio-impedancia' | 'fotografia' | 'aplicacao' | 'mensagens',
  { active: SpriteFrame; inactive: SpriteFrame }
> = {
  grafico: {
    active: { x: 134, y: 49, w: 272, h: 273 },
    inactive: { x: 130, y: 420, w: 281, h: 279 },
  },
  'bio-impedancia': {
    active: { x: 497, y: 49, w: 274, h: 273 },
    inactive: { x: 493, y: 420, w: 280, h: 279 },
  },
  fotografia: {
    active: { x: 856, y: 49, w: 276, h: 273 },
    inactive: { x: 852, y: 420, w: 280, h: 280 },
  },
  aplicacao: {
    active: { x: 1214, y: 49, w: 275, h: 273 },
    inactive: { x: 1209, y: 420, w: 282, h: 279 },
  },
  mensagens: {
    active: { x: 1574, y: 49, w: 280, h: 273 },
    inactive: { x: 1571, y: 420, w: 285, h: 280 },
  },
};

function axisPercent(offset: number, frameSize: number, spriteSize: number): number {
  const space = spriteSize - frameSize;
  if (space === 0) return 0;
  return (offset / space) * 100;
}

type Props = {
  icon: MetodoEmagrecerIconName;
  /** Lado do quadrado em px. Omitir quando o tamanho vier de className. */
  size?: number;
  className?: string;
  /** `inactive` usa o fundo branco. Ícones sem essa arte permanecem na versão ativa. */
  variant?: MetodoEmagrecerIconVariant;
};

export default function MetodoEmagrecerIcon({ icon, size, className, variant = 'active' }: Props) {
  const calendar = icon in CALENDAR_COLUMN ? CALENDAR_COLUMN[icon as keyof typeof CALENDAR_COLUMN] : null;
  const row: MetodoEmagrecerIconVariant = variant === 'inactive' ? 'inactive' : 'active';
  const frame = calendar ? calendar[row] : FRAMES[icon];
  const spriteWidth = calendar ? CALENDAR_SPRITE_WIDTH : SPRITE_WIDTH;
  const spriteHeight = calendar ? CALENDAR_SPRITE_HEIGHT : SPRITE_HEIGHT;
  const spriteUrl = calendar ? CALENDAR_SPRITE_URL : SPRITE_URL;
  const maxSide = Math.max(frame.w, frame.h);
  const boxStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    // Raio medido no quadrado da sprite (~56–61 px em ~280 px ≈ 20%).
    borderRadius: '20%',
  };
  if (size != null) {
    boxStyle.width = size;
    boxStyle.height = size;
  }

  const cropStyle: CSSProperties = {
    position: 'absolute',
    left: `${((maxSide - frame.w) / 2 / maxSide) * 100}%`,
    top: `${((maxSide - frame.h) / 2 / maxSide) * 100}%`,
    width: `${(frame.w / maxSide) * 100}%`,
    height: `${(frame.h / maxSide) * 100}%`,
    backgroundImage: `url(${spriteUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize:
      size != null
        ? `${(spriteWidth / maxSide) * size}px ${(spriteHeight / maxSide) * size}px`
        : `${(spriteWidth / frame.w) * 100}% ${(spriteHeight / frame.h) * 100}%`,
    backgroundPosition:
      size != null
        ? `${(-frame.x / maxSide) * size}px ${(-frame.y / maxSide) * size}px`
        : `${axisPercent(frame.x, frame.w, spriteWidth)}% ${axisPercent(frame.y, frame.h, spriteHeight)}%`,
  };

  return (
    <span
      aria-hidden="true"
      className={['inline-block shrink-0 align-middle', className].filter(Boolean).join(' ')}
      style={boxStyle}
    >
      <span style={cropStyle} />
    </span>
  );
}
