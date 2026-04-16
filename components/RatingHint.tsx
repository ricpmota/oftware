'use client';

/**
 * RatingHint — hint premium (estilo Apple/Linear) ao lado do componente de estrelas.
 *
 * Exemplo de uso (RatingRow):
 * ```tsx
 * <div className="flex items-center gap-0.5">
 *   <button onClick={onRate} className="flex items-center gap-0.5" aria-label="Avaliar">
 *     {[1,2,3,4,5].map((s) => (
 *       <Star key={s} size={10} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
 *     ))}
 *   </button>
 *   {rating == null && (
 *     <RatingHint text="Avalie sua experiência com este médico. Sua opinião ajuda outros pacientes." />
 *   )}
 * </div>
 * ```
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

const HOVER_CLOSE_DELAY_MS = 120;
const ANIMATION_DURATION_MS = 150;
const DEFAULT_MAX_WIDTH = 260;
const BORDER_COLOR = '#E5E7EB';

export type RatingHintPlacement = 'top' | 'bottom' | 'auto';

export interface RatingHintProps {
  text: string;
  maxWidth?: number;
  placement?: RatingHintPlacement;
  className?: string;
}

export function RatingHint({
  text,
  maxWidth = DEFAULT_MAX_WIDTH,
  placement = 'auto',
  className = '',
}: RatingHintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<'top' | 'bottom'>('top');
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [animatedIn, setAnimatedIn] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchRef = useRef(false);
  const tooltipId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Click outside: close when clicking anywhere except trigger and popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      )
        return;
      close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, close]);

  // Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Position popover and resolve placement (above/below, clamp to viewport)
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const run = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;
      const gap = 6;
      const padding = 8;

      let place: 'top' | 'bottom' = 'top';
      if (placement === 'top') place = 'top';
      else if (placement === 'bottom') place = 'bottom';
      else {
        const spaceAbove = triggerRect.top;
        const spaceBelow = viewportH - triggerRect.bottom;
        place = spaceBelow >= popoverRect.height + gap || spaceAbove < spaceBelow ? 'bottom' : 'top';
      }
      setResolvedPlacement(place);

      const centerX = triggerRect.left + triggerRect.width / 2;
      let left = centerX - popoverRect.width / 2;
      left = Math.max(padding, Math.min(viewportW - popoverRect.width - padding, left));

      const top =
        place === 'top'
          ? triggerRect.top - popoverRect.height - gap
          : triggerRect.bottom + gap;
      const topClamped = Math.max(padding, Math.min(viewportH - popoverRect.height - padding, top));

      setCoords({ top: topClamped, left });
    };

    // Small delay so popover is in DOM and has dimensions; then trigger entrance animation
    let mounted = true;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mounted) return;
        run();
        requestAnimationFrame(() => {
          if (mounted) setAnimatedIn(true);
        });
      });
    });
    const ro = new ResizeObserver(run);
    ro.observe(popover);
    window.addEventListener('scroll', run, true);
    window.addEventListener('resize', run);
    return () => {
      mounted = false;
      cancelAnimationFrame(t);
      ro.disconnect();
      window.removeEventListener('scroll', run, true);
      window.removeEventListener('resize', run);
    };
  }, [isOpen, placement]);

  // Reset animation and coords when closing so next open animates again
  useEffect(() => {
    if (!isOpen) {
      setAnimatedIn(false);
      setCoords(null);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isTouchRef.current) open();
  };

  const handleMouseLeave = () => {
    if (!isTouchRef.current) {
      hoverTimeoutRef.current = setTimeout(close, HOVER_CLOSE_DELAY_MS);
    }
  };

  const handleTriggerClick = () => {
    isTouchRef.current = true;
    setIsOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const popoverContent = isOpen && (
    <div
      ref={popoverRef}
      id={tooltipId}
      role="tooltip"
      aria-hidden={!isOpen}
      className="fixed z-[70] rounded-[14px] border bg-white px-3 py-2.5 text-left shadow-lg"
      style={{
        maxWidth: `${maxWidth}px`,
        borderColor: BORDER_COLOR,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
        opacity: coords && animatedIn ? 1 : 0,
        transform: coords && animatedIn ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)',
        ...(coords
          ? { top: coords.top, left: coords.left }
          : { visibility: 'hidden' as const, top: 0, left: 0 }),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Caret (setinha) sutil apontando para o ícone */}
      {resolvedPlacement === 'top' ? (
        <>
          <div className="absolute left-1/2 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#E5E7EB]" style={{ bottom: '-6px', transform: 'translateX(-50%)' }} />
          <div className="absolute left-1/2 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" style={{ bottom: '-5px', transform: 'translateX(-50%)' }} />
        </>
      ) : (
        <>
          <div className="absolute left-1/2 h-0 w-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#E5E7EB]" style={{ top: '-6px', transform: 'translateX(-50%)' }} />
          <div className="absolute left-1/2 h-0 w-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-white" style={{ top: '-5px', transform: 'translateX(-50%)' }} />
        </>
      )}
      <p className="text-xs leading-relaxed text-gray-700" style={{ lineHeight: 1.45 }}>
        {text}
      </p>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex items-center justify-center rounded-full p-0.5 transition-opacity hover:opacity-100 hover:[animation:none] focus:opacity-100 focus:[animation:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 animate-hint-pulse ${className}`}
        aria-label="Mais informações"
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={handleTriggerClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleTriggerKeyDown}
      >
        <Info className="h-3.5 w-3.5 text-red-500" strokeWidth={2} />
      </button>
      {typeof document !== 'undefined' &&
        createPortal(popoverContent, document.body)}
    </>
  );
}
