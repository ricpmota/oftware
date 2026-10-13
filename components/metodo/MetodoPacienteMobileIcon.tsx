import type { CSSProperties } from 'react';

/**
 * Recorte medido em public/icones-paciente-mobile.png (2172×724, RGBA).
 * Linha 0 = active, linha 1 = inactive, mesma coluna.
 * As três variantes de pagamento ficam na faixa inferior e não são active/inactive.
 * Coordenadas do quadrado sólido (não do vão transparente entre as células).
 */
const SPRITE_URL = '/icones-paciente-mobile.png';
const SPRITE_WIDTH = 2172;
const SPRITE_HEIGHT = 724;

export type MetodoPacienteMobileIconName =
  | 'paciente'
  | 'aplicacao'
  | 'exame'
  | 'bio-impedancia'
  | 'prescricao'
  | 'nutricionista'
  | 'personal'
  | 'pagamento'
  | 'deletar'
  | 'contrato'
  | 'grafico'
  | 'foto'
  | 'depoimento';

export type MetodoPacienteMobileIconVariant =
  | 'active'
  | 'inactive'
  | 'payment-paid'
  | 'payment-partial'
  | 'payment-open';

type SpriteFrame = { x: number; y: number; w: number; h: number };

const COLUMNS: Record<MetodoPacienteMobileIconName, { active: SpriteFrame; inactive: SpriteFrame }> = {
  paciente: {
    active: { x: 29, y: 94, w: 146, h: 144 },
    inactive: { x: 29, y: 266, w: 146, h: 143 },
  },
  aplicacao: {
    active: { x: 192, y: 94, w: 144, h: 144 },
    inactive: { x: 192, y: 266, w: 144, h: 143 },
  },
  exame: {
    active: { x: 351, y: 94, w: 146, h: 144 },
    inactive: { x: 351, y: 266, w: 145, h: 143 },
  },
  'bio-impedancia': {
    active: { x: 515, y: 94, w: 145, h: 144 },
    inactive: { x: 515, y: 266, w: 145, h: 143 },
  },
  prescricao: {
    active: { x: 680, y: 94, w: 146, h: 144 },
    inactive: { x: 680, y: 266, w: 146, h: 143 },
  },
  nutricionista: {
    active: { x: 846, y: 94, w: 147, h: 144 },
    inactive: { x: 846, y: 266, w: 146, h: 143 },
  },
  personal: {
    active: { x: 1013, y: 94, w: 145, h: 144 },
    inactive: { x: 1013, y: 266, w: 145, h: 143 },
  },
  pagamento: {
    active: { x: 1178, y: 94, w: 146, h: 144 },
    inactive: { x: 1178, y: 266, w: 146, h: 143 },
  },
  deletar: {
    active: { x: 1344, y: 94, w: 146, h: 144 },
    inactive: { x: 1345, y: 266, w: 145, h: 143 },
  },
  contrato: {
    active: { x: 1510, y: 94, w: 145, h: 144 },
    inactive: { x: 1510, y: 266, w: 145, h: 143 },
  },
  grafico: {
    active: { x: 1674, y: 94, w: 145, h: 144 },
    inactive: { x: 1674, y: 266, w: 145, h: 143 },
  },
  foto: {
    active: { x: 1838, y: 94, w: 146, h: 144 },
    inactive: { x: 1839, y: 266, w: 144, h: 143 },
  },
  depoimento: {
    active: { x: 2002, y: 94, w: 145, h: 144 },
    inactive: { x: 2002, y: 266, w: 144, h: 143 },
  },
};

const PAYMENT: Record<'payment-paid' | 'payment-partial' | 'payment-open', SpriteFrame> = {
  'payment-paid': { x: 808, y: 480, w: 167, h: 161 },
  'payment-partial': { x: 1004, y: 480, w: 167, h: 161 },
  'payment-open': { x: 1199, y: 480, w: 167, h: 161 },
};

/** Mapeia o status já calculado das parcelas para o recorte do cifrão. */
export function varianteIconePagamentoMobile(
  status: 'pago' | 'iniciou_pagamento' | 'em_aberto'
): 'payment-paid' | 'payment-partial' | 'payment-open' {
  if (status === 'pago') return 'payment-paid';
  if (status === 'iniciou_pagamento') return 'payment-partial';
  return 'payment-open';
}

type Props = {
  icon: MetodoPacienteMobileIconName;
  variant?: MetodoPacienteMobileIconVariant;
  /** Lado do quadrado em px. Igual para active, inactive e as três variantes de pagamento. */
  size?: number;
  className?: string;
};

export default function MetodoPacienteMobileIcon({
  icon,
  variant = 'active',
  size = 32,
  className,
}: Props) {
  const frame =
    variant === 'payment-paid' || variant === 'payment-partial' || variant === 'payment-open'
      ? PAYMENT[variant]
      : COLUMNS[icon][variant === 'inactive' ? 'inactive' : 'active'];
  const maxSide = Math.max(frame.w, frame.h);
  const boxStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    display: 'block',
    flexShrink: 0,
    backgroundColor: 'transparent',
    width: size,
    height: size,
    // Inset do canto reto no quadrado ativo: ~28 px em ~146 px.
    borderRadius: '19%',
  };
  const cropStyle: CSSProperties = {
    position: 'absolute',
    left: `${((maxSide - frame.w) / 2 / maxSide) * 100}%`,
    top: `${((maxSide - frame.h) / 2 / maxSide) * 100}%`,
    width: `${(frame.w / maxSide) * 100}%`,
    height: `${(frame.h / maxSide) * 100}%`,
    backgroundImage: `url(${SPRITE_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${(SPRITE_WIDTH / maxSide) * size}px ${(SPRITE_HEIGHT / maxSide) * size}px`,
    backgroundPosition: `${(-frame.x / maxSide) * size}px ${(-frame.y / maxSide) * size}px`,
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
