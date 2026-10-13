'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type MealDishPreviewItem = {
  id: string;
  descricao: string;
  proteinaItem: number;
  carboidratoItem?: number;
  caloriasItem: number;
};

export type MealDishPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  mealName: string;
  optionLabel?: string;
  imageUrl: string;
  accentColor: string;
  items: MealDishPreviewItem[];
  observacao?: string;
  emptyItemsLabel?: string;
};

export default function MealDishPreviewModal({
  open,
  onClose,
  mealName,
  optionLabel,
  imageUrl,
  accentColor,
  items,
  observacao,
  emptyItemsLabel = 'Nenhum item nesta opção ainda.',
}: MealDishPreviewModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const totalProt = items.reduce((acc, item) => acc + item.proteinaItem, 0);
  const totalKcal = items.reduce((acc, item) => acc + item.caloriasItem, 0);
  const totalCarb = items.reduce(
    (acc, item) => acc + (typeof item.carboidratoItem === 'number' ? item.carboidratoItem : 0),
    0
  );
  const temCarb = items.some((item) => typeof item.carboidratoItem === 'number');
  const obs = observacao?.trim() || '';

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-dish-preview-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id="meal-dish-preview-title" className="truncate text-base font-bold text-gray-900">
              {mealName}
            </h2>
            {optionLabel ? (
              <p className="truncate text-xs font-medium text-gray-500">{optionLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className="bg-gray-50"
            style={{ backgroundColor: `${accentColor}14` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={mealName}
              className="mx-auto max-h-[42vh] w-full object-contain sm:max-h-[48vh]"
            />
          </div>

          <div className="px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Itens do cardápio
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full table-fixed text-[11px] sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="w-[46%] px-2 py-2 text-left font-semibold">Item</th>
                    <th className="w-[18%] px-2 py-2 text-right font-semibold">Proteínas</th>
                    <th className="w-[18%] px-2 py-2 text-right font-semibold">Carboidratos</th>
                    <th className="w-[18%] px-2 py-2 text-right font-semibold">Calorias</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-2 py-2 align-top text-gray-700">{item.descricao}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-medium text-gray-900">
                        {item.proteinaItem > 0 ? `${item.proteinaItem.toFixed(1)} g` : '-'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-medium text-gray-900">
                        {typeof item.carboidratoItem === 'number'
                          ? `${item.carboidratoItem.toFixed(1)} g`
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-medium text-gray-900">
                        {item.caloriasItem > 0 ? `${Math.round(item.caloriasItem)} kcal` : '-'}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr className="border-t border-gray-100">
                      <td colSpan={4} className="px-2 py-3 text-sm text-gray-700">
                        {emptyItemsLabel}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                {items.length > 0 ? (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td className="px-2 py-2 font-semibold text-gray-800">Somatório total</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-gray-900">
                        {totalProt > 0 ? `${totalProt.toFixed(1)} g` : '-'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-gray-900">
                        {temCarb ? `${totalCarb.toFixed(1)} g` : '-'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-gray-900">
                        {totalKcal > 0 ? `${Math.round(totalKcal)} kcal` : '-'}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            {obs ? (
              <div className="mt-3 rounded-xl border border-[#2F8FA3]/30 bg-[#2F8FA3]/10 px-3.5 py-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#2F8FA3]">
                  Observação da nutri
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{obs}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Sem observação da nutricionista nesta opção.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
