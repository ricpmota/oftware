'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  formatarNomeItemPorcao,
  formatarResumoMacrosItem,
  nomeBaseAlimento,
  normalizarItemComPorcao,
  type ItemPlanoRefeicao,
} from '@/lib/nutri/planosNutricionista';

export type PorcaoItemEditavel = Pick<
  ItemPlanoRefeicao,
  | 'id'
  | 'nome'
  | 'categoria'
  | 'proteina_g'
  | 'calorias_kcal'
  | 'descricao'
  | 'peso_g'
  | 'quantidade'
  | 'unidade'
  | 'proteinaBase_g'
  | 'caloriasBase_kcal'
  | 'pesoBase_g'
  | 'carboidrato_g'
  | 'gordura_g'
  | 'fibra_g'
  | 'carboidratoBase_g'
  | 'gorduraBase_g'
  | 'fibraBase_g'
  | 'origemAlimento'
  | 'alimentoGlobalId'
>;

export default function EditarPorcaoItemModal({
  aberto,
  item,
  onFechar,
  onConfirmar,
}: {
  aberto: boolean;
  item: PorcaoItemEditavel | null;
  onFechar: () => void;
  onConfirmar: (patch: {
    peso_g: number;
    quantidade: number;
    unidade: string;
  }) => void;
}) {
  const [peso, setPeso] = useState(100);
  const [quantidade, setQuantidade] = useState(1);
  const [unidade, setUnidade] = useState('');

  useEffect(() => {
    if (!aberto || !item) return;
    const norm = normalizarItemComPorcao(item as ItemPlanoRefeicao);
    setPeso(norm.peso_g ?? 100);
    setQuantidade(norm.quantidade ?? 1);
    setUnidade(norm.unidade || '');
  }, [aberto, item]);

  const preview = useMemo(() => {
    if (!item) return null;
    return normalizarItemComPorcao({
      ...(item as ItemPlanoRefeicao),
      peso_g: Math.max(1, peso || 1),
      quantidade: Math.max(0.01, quantidade || 0.01),
      unidade,
    });
  }, [item, peso, quantidade, unidade]);

  if (!aberto || !item || !preview) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Editar porção
            </p>
            <h3 className="text-base font-bold text-gray-900 leading-snug truncate">
              {nomeBaseAlimento(item.nome)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-700">Peso (g)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={peso}
                onChange={(e) => setPeso(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm tabular-nums focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-700">Quantidade</span>
              <input
                type="number"
                min={0.01}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm tabular-nums focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Unidade</span>
            <input
              type="text"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              placeholder="Ex.: Unidade, fatia, colher"
              maxLength={40}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
            />
          </label>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
              Resultado
            </p>
            <p className="text-xs text-gray-600 leading-snug">
              {formatarNomeItemPorcao(preview)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-900 tabular-nums">
              {formatarResumoMacrosItem(preview)}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirmar({
                peso_g: Math.max(1, peso || 1),
                quantidade: Math.max(0.01, quantidade || 0.01),
                unidade: unidade.trim(),
              })
            }
            className="flex-1 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
