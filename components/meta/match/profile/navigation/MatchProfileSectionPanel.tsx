'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const SHEET_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 };

type MatchProfileSectionPanelProps = {
  open: boolean;
  sectionKey: string | null;
  labelledBy: string;
  children: ReactNode;
};

/** Mesma abertura dos depoimentos em /instagram: fade do fundo fica no palco; o painel sobe com a mola. */
export function MatchProfileSectionPanel({
  open,
  sectionKey,
  labelledBy,
  children,
}: MatchProfileSectionPanelProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && sectionKey ? (
        <motion.div
          id="match-profile-section-panel"
          role="region"
          aria-labelledby={labelledBy}
          initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          transition={reducedMotion ? { duration: 0 } : SHEET_SPRING}
          className="mx-3 mb-2 flex max-h-[min(46dvh,420px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a1428]/95 shadow-[0_8px_28px_-18px_rgba(2,6,16,0.65)] backdrop-blur-xl"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={sectionKey}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
