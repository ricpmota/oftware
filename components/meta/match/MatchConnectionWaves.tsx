'use client';

import { useEffect, useRef } from 'react';
import './match-connection-waves.css';

/** Desligue para retirar o experimento sem apagar o restante da Home. */
const SHOW_MATCH_CONNECTION_WAVES = true;

const WAVE_BLUE = 'M-48 250C40 268 120 218 196 236C272 254 328 272 404 240C458 218 508 232 548 246';
const WAVE_GREEN = 'M-48 224C36 198 124 258 208 232C292 206 348 194 428 230C486 254 518 222 548 212';
const WAVE_CYAN = 'M-36 206C72 186 146 228 224 208C302 188 366 234 442 210C496 196 522 214 548 202';
const WAVE_HIGH = 'M-40 78C70 48 150 112 236 74C322 36 390 96 470 62C516 46 536 70 560 58';
const WAVE_HIGH_SOFT = 'M-40 108C90 132 160 64 250 96C340 128 400 72 480 100C520 112 540 86 560 94';
const CARD_WAVE_GREEN = 'M-48 128C40 108 130 152 220 124C310 96 380 150 470 118C520 104 540 128 560 116';
const CARD_WAVE_LIGHT = 'M-48 168C50 188 140 142 230 166C320 190 390 144 480 168C524 180 542 156 560 164';

export function MatchConnectionWaves({ placement = 'hero' }: { placement?: 'hero' | 'card' }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const nodes = () => Array.from(root.querySelectorAll('animateMotion'));
    const apply = () => {
      nodes().forEach((node) => {
        const animation = node as SVGAnimateMotionElement;
        if (typeof animation.endElement !== 'function' || typeof animation.beginElement !== 'function') return;
        if (motion.matches) animation.endElement();
        else animation.beginElement();
      });
    };
    apply();
    motion.addEventListener('change', apply);
    return () => motion.removeEventListener('change', apply);
  }, []);

  if (!SHOW_MATCH_CONNECTION_WAVES) return null;

  const onCard = placement === 'card';

  return (
    <div
      ref={rootRef}
      className={
        onCard
          ? 'pointer-events-none absolute inset-0 z-0 overflow-hidden'
          : 'pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[26rem] overflow-hidden'
      }
      aria-hidden="true"
    >
      <svg
        viewBox={onCard ? '0 80 480 120' : '0 0 480 280'}
        preserveAspectRatio={onCard ? 'xMidYMid slice' : 'xMidYMax slice'}
        className={`h-full w-full ${onCard ? '' : '[mask-image:linear-gradient(to_bottom,transparent_0%,black_16%,black_100%)]'}`}
        focusable="false"
      >
        {onCard ? (
          <>
            <g className="match-connection-shift match-connection-shift-1">
              <path d={CARD_WAVE_LIGHT} fill="none" stroke="#D7E6FF" strokeOpacity="0.45" strokeWidth="1.7" strokeLinecap="round" />
              <circle r="2.6" fill="#D7E6FF">
                <animateMotion dur="18s" repeatCount="indefinite" rotate="0" path={CARD_WAVE_LIGHT} />
              </circle>
            </g>
            <g className="match-connection-shift match-connection-shift-2">
              <path d={CARD_WAVE_GREEN} fill="none" stroke="#4CCB7A" strokeOpacity="0.5" strokeWidth="1.7" strokeLinecap="round" />
              <circle r="2.6" fill="#4CCB7A">
                <animateMotion dur="16s" repeatCount="indefinite" rotate="0" path={CARD_WAVE_GREEN} />
              </circle>
            </g>
          </>
        ) : (
          <>
        <g className="match-connection-shift match-connection-shift-5">
          <path d={WAVE_HIGH} fill="none" stroke="#4CCB7A" strokeOpacity="0.42" strokeWidth="1.6" strokeLinecap="round" />
          <circle r="2.1" fill="#4CCB7A">
            <animateMotion dur="17s" repeatCount="indefinite" rotate="0" path={WAVE_HIGH} />
          </circle>
        </g>
        <g className="match-connection-shift match-connection-shift-4">
          <path d={WAVE_HIGH_SOFT} fill="none" stroke="#9EC9E8" strokeOpacity="0.34" strokeWidth="1.35" strokeLinecap="round" />
          <circle r="2.2" fill="#9EC9E8">
            <animateMotion dur="19s" repeatCount="indefinite" rotate="0" path={WAVE_HIGH_SOFT} />
          </circle>
        </g>
        <g className="match-connection-shift match-connection-shift-3">
          <path d={WAVE_CYAN} fill="none" stroke="#9EC9E8" strokeOpacity="0.28" strokeWidth="1.25" strokeLinecap="round" />
          <circle r="2.2" fill="#9EC9E8">
            <animateMotion dur="21s" repeatCount="indefinite" rotate="0" path={WAVE_CYAN} />
          </circle>
        </g>
        <g className="match-connection-shift match-connection-shift-1">
          <path d={WAVE_BLUE} fill="none" stroke="#0A1F44" strokeOpacity="0.42" strokeWidth="2.15" strokeLinecap="round" />
          <circle r="2.2" fill="#9EC9E8">
            <animateMotion dur="18s" repeatCount="indefinite" rotate="0" path={WAVE_BLUE} />
          </circle>
        </g>
        <g className="match-connection-shift match-connection-shift-2">
          <path d={WAVE_GREEN} fill="none" stroke="#4CCB7A" strokeOpacity="0.5" strokeWidth="1.7" strokeLinecap="round" />
          <circle r="2.2" fill="#4CCB7A">
            <animateMotion dur="16s" repeatCount="indefinite" rotate="0" path={WAVE_GREEN} />
          </circle>
          <circle r="3" fill="#4CCB7A" className="match-connection-pulse">
            <animateMotion dur="16s" begin="6.5s" repeatCount="indefinite" rotate="0" path={WAVE_GREEN} />
          </circle>
        </g>
          </>
        )}
      </svg>
    </div>
  );
}
