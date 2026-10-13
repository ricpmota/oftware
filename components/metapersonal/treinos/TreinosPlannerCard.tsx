'use client';

import {
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Power,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  coverageLabel,
  cardActiveSummary,
  type PlannerBoardCard,
} from '@/lib/metapersonal/treinosPlannerGroup';
import { resolveTreinoColor } from '@/lib/metapersonal/treinosPlannerTheme';
import { TreinosActiveToggle } from './TreinosActiveToggle';

type Props = {
  card: PlannerBoardCard;
  onVerPacientes: () => void;
  onAddObservacao?: () => void;
  onEditWorkout?: () => void;
  onToggleActive?: () => void;
  onDeleteWorkout?: () => void;
  onRemoveDraft?: () => void;
  readOnly?: boolean;
};

const MENU_WIDTH = 228;
const MENU_ESTIMATE_H = 300;

function menuActivateLabel(state: ReturnType<typeof cardActiveSummary>['state']) {
  if (state === 'all-inactive') return 'Ativar treino';
  if (state === 'mixed') return 'Ativar / Desativar treino';
  return 'Desativar treino';
}

function activeControlTooltip(summary: ReturnType<typeof cardActiveSummary>) {
  if (summary.total === 1) {
    return summary.state === 'all-active' ? 'Desativar treino' : 'Ativar treino';
  }
  return `${summary.activeCount} de ${summary.total} pacientes com treino ativo`;
}

function CardOverflowMenu({
  anchor,
  onClose,
  children,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = menuRef.current?.offsetHeight || MENU_ESTIMATE_H;
      let left = rect.right - MENU_WIDTH;
      let top = rect.bottom + 4;
      if (left < 8) left = 8;
      if (left + MENU_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
      }
      if (top + height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - height - 4);
      }
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
      className="fixed z-[80] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      {children}
    </div>,
    document.body
  );
}

export function TreinosPlannerCard({
  card,
  onVerPacientes,
  onAddObservacao,
  onEditWorkout,
  onToggleActive,
  onDeleteWorkout,
  onRemoveDraft,
  readOnly = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDraft = card.source === 'draft';
  const tone = resolveTreinoColor(card.colorKey, card.visualSignature);
  const active = cardActiveSummary(card);
  const inactive = active.state === 'all-inactive';
  const coverage = coverageLabel(card);
  const detailsLabel = card.selectedPatientCount > 1 ? 'Ver pacientes' : 'Ver treino';
  const coverageText =
    card.source !== 'draft' &&
    card.selectedPatientCount > 1 &&
    card.coveredPatientCount >= card.selectedPatientCount
      ? `${coverage} · ${card.selectedPatientCount} pacientes`
      : coverage;

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-3 pl-3.5 shadow-sm ${tone.bg} ${
        isDraft ? `border-dashed ${tone.border}` : tone.border
      } ${inactive ? 'opacity-70' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${tone.accent}`} aria-hidden />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-gray-900">
            {card.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">{card.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {!readOnly && !isDraft && onToggleActive && active.total > 0 ? (
            active.total === 1 ? (
              <TreinosActiveToggle
                state={active.state === 'all-active' ? 'on' : 'off'}
                tooltip={activeControlTooltip(active)}
                onClick={onToggleActive}
              />
            ) : (
              <button
                type="button"
                onClick={onToggleActive}
                title={activeControlTooltip(active)}
                aria-label={activeControlTooltip(active)}
                className={`rounded-md px-0.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none ${
                  active.state === 'mixed'
                    ? 'text-amber-700'
                    : active.state === 'all-inactive'
                      ? 'text-gray-400'
                      : 'text-gray-600'
                }`}
              >
                {active.activeCount}/{active.total}
              </button>
            )
          ) : null}
          {!readOnly ? (
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-md p-1 text-gray-400 hover:bg-white/70 hover:text-gray-700"
              aria-label="Opções do treino"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {!readOnly && menuOpen && buttonRef.current ? (
        <CardOverflowMenu anchor={buttonRef.current} onClose={() => setMenuOpen(false)}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onVerPacientes();
            }}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Users className="h-3.5 w-3.5" />
            {detailsLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isDraft || !onAddObservacao}
            title={
              isDraft
                ? 'Publique o planejamento antes de adicionar observações individuais.'
                : undefined
            }
            onClick={() => {
              if (isDraft || !onAddObservacao) return;
              setMenuOpen(false);
              onAddObservacao();
            }}
            className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium ${
              isDraft || !onAddObservacao
                ? 'cursor-not-allowed text-gray-400'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Adicionar observação
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isDraft || !onEditWorkout}
            title={
              isDraft
                ? 'Publique o planejamento antes de editar o treino.'
                : undefined
            }
            onClick={() => {
              if (isDraft || !onEditWorkout) return;
              setMenuOpen(false);
              onEditWorkout();
            }}
            className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium ${
              isDraft || !onEditWorkout
                ? 'cursor-not-allowed text-gray-400'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar treino
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            role="menuitem"
            disabled={isDraft || !onToggleActive}
            title={isDraft ? 'Publique o planejamento antes de ativar ou desativar.' : undefined}
            onClick={() => {
              if (isDraft || !onToggleActive) return;
              setMenuOpen(false);
              onToggleActive();
            }}
            className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium ${
              isDraft || !onToggleActive
                ? 'cursor-not-allowed text-gray-400'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {menuActivateLabel(active.state)}
          </button>
          {!isDraft && onDeleteWorkout ? (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteWorkout();
                }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Apagar definitivamente
              </button>
            </>
          ) : null}
          {isDraft && onRemoveDraft ? (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onRemoveDraft();
                }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover do planejamento
              </button>
            </>
          ) : null}
        </CardOverflowMenu>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={`inline-flex items-center gap-1 text-[11px] font-medium ${tone.badge}`}>
          <Users className="h-3 w-3 opacity-70" />
          {coverageText}
        </p>
        {card.notesPatientCount > 0 ? (
          <p
            className="inline-flex items-center gap-1 text-[11px] text-gray-500"
            title="Pacientes deste card com alguma observação. Os textos não são misturados."
          >
            <MessageSquare className="h-3 w-3" />
            {card.notesPatientCount}
          </p>
        ) : null}
        {card.mediaFileCount > 0 ? (
          <p
            className="inline-flex items-center gap-1 text-[11px] text-gray-500"
            title="Fotos/vídeos da academia do paciente neste exercício. GIF de demonstração não conta."
          >
            <ImageIcon className="h-3 w-3" />
            {card.mediaFileCount}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onVerPacientes}
        className="mt-2 w-full rounded-md border border-white/80 bg-white/70 py-1 text-[11px] font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
      >
        {detailsLabel}
      </button>
    </article>
  );
}
