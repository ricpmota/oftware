'use client';

import { useEffect, useState } from 'react';
import type {
  RetinaFindingQuantity,
  RetinaFindingSeverity,
  RetinaFindingType,
  RetinaMapClickPayload,
} from '@/types/oftpay/retinaMap';
import {
  ALL_RETINA_FINDING_TYPES,
  RETINA_FINDING_TYPE_LABELS,
  RETINA_QUADRANT_LABELS,
  RETINA_QUANTITY_LABELS,
  RETINA_REGION_LABELS,
  RETINA_SEVERITY_LABELS,
} from '@/types/oftpay/retinaMap';
import { X } from 'lucide-react';

export interface RetinaFindingDraft {
  type: RetinaFindingType;
  severity?: RetinaFindingSeverity;
  quantity?: RetinaFindingQuantity;
  size?: string;
  notes?: string;
}

interface RetinaFindingModalProps {
  open: boolean;
  clickPayload: RetinaMapClickPayload | null;
  suggestedTypes?: RetinaFindingType[];
  onConfirm: (draft: RetinaFindingDraft) => void;
  onCancel: () => void;
}

const SEVERITIES = Object.keys(RETINA_SEVERITY_LABELS) as RetinaFindingSeverity[];
const QUANTITIES = Object.keys(RETINA_QUANTITY_LABELS) as RetinaFindingQuantity[];

export default function RetinaFindingModal({
  open,
  clickPayload,
  suggestedTypes,
  onConfirm,
  onCancel,
}: RetinaFindingModalProps) {
  const typeOptions =
    suggestedTypes && suggestedTypes.length > 0 ? suggestedTypes : ALL_RETINA_FINDING_TYPES;
  const defaultType = typeOptions[0] ?? 'outros';

  const [type, setType] = useState<RetinaFindingType>(defaultType);
  const [severity, setSeverity] = useState<RetinaFindingSeverity | ''>('');
  const [quantity, setQuantity] = useState<RetinaFindingQuantity | ''>('');
  const [size, setSize] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setSeverity('');
      setQuantity('');
      setSize('');
      setNotes('');
    }
  }, [open, clickPayload, defaultType]);

  if (!open || !clickPayload) return null;

  const handleConfirm = () => {
    onConfirm({
      type,
      severity: severity || undefined,
      quantity: quantity || undefined,
      size: size.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retina-finding-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="retina-finding-modal-title" className="text-sm font-semibold text-gray-900">
            Registrar achado
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <p>
              <strong>Região:</strong> {RETINA_REGION_LABELS[clickPayload.region]}
            </p>
            <p>
              <strong>Quadrante:</strong> {RETINA_QUADRANT_LABELS[clickPayload.quadrant]}
            </p>
            {clickPayload.clockHour != null && (
              <p>
                <strong>Hora aproximada:</strong> {clickPayload.clockHour}h
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700">Tipo de achado</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RetinaFindingType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {RETINA_FINDING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {suggestedTypes && suggestedTypes.length > 0 && (
              <p className="mt-1 text-xs text-violet-600">
                Tipos sugeridos para a etapa atual.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-gray-700">Gravidade</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as RetinaFindingSeverity | '')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">—</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {RETINA_SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Quantidade</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value as RetinaFindingQuantity | '')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">—</option>
                {QUANTITIES.map((q) => (
                  <option key={q} value={q}>
                    {RETINA_QUANTITY_LABELS[q]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700">Tamanho (opcional)</label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Ex.: pequeno, 1 DD"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700">Observação</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Detalhes adicionais"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Adicionar achado
          </button>
        </div>
      </div>
    </div>
  );
}
