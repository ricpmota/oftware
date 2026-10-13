'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { AvatarBubble } from '@/components/comunicacao/MensagemAvatars';
import { normalizeAuthPhotoUrl } from '@/lib/firebase/resolvePacienteAuthUidForPhoto';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';
import { pacienteDisplayName } from './treinosCentral.types';

type Props = {
  open: boolean;
  pacientes: PacienteVisivelPersonal[];
  selectedIds: string[];
  photoByUserId: Record<string, string | null>;
  elevated?: boolean;
  onClose: () => void;
  onConfirm: (pacienteIds: string[]) => void;
};

export function TreinosAddPacientesModal({
  open,
  pacientes,
  selectedIds,
  photoByUserId,
  elevated = false,
  onClose,
  onConfirm,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [busca, setBusca] = useState('');
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraftIds(selectedIds);
    setBusca('');
  }, [open, selectedIds]);

  const ativos = useMemo(
    () => pacientes.filter((item) => item.status === 'ativo'),
    [pacientes]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return ativos;
    return ativos.filter((item) => {
      const nome = pacienteDisplayName(item).toLowerCase();
      const email = String(item.paciente.email || '').toLowerCase();
      const medico = String(item.medicoNome || '').toLowerCase();
      return nome.includes(q) || email.includes(q) || medico.includes(q);
    });
  }, [ativos, busca]);

  const toggle = (pacienteId: string) => {
    setDraftIds((prev) =>
      prev.includes(pacienteId) ? prev.filter((id) => id !== pacienteId) : [...prev, pacienteId]
    );
  };

  if (!open || !portalReady) return null;

  return createPortal(
    <div className={`fixed inset-0 ${elevated ? 'z-[95]' : 'z-[70]'} flex items-center justify-center p-4`} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Adicionar pacientes</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Somente a seleção desta programação. Não altera compartilhamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <p className="mt-2 text-xs font-medium text-gray-500">
            {draftIds.length} selecionado{draftIds.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {filtrados.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-500">Nenhum paciente encontrado.</p>
          ) : (
            <ul>
              {filtrados.map((item) => {
                const nome = pacienteDisplayName(item);
                const checked = draftIds.includes(item.pacienteId);
                const photo = item.paciente.userId
                  ? normalizeAuthPhotoUrl(photoByUserId[item.paciente.userId])
                  : null;
                return (
                  <li key={item.pacienteId}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.pacienteId)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <AvatarBubble name={nome} photoUrl={photo} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{nome}</p>
                        {item.medicoNome ? (
                          <p className="truncate text-[11px] text-gray-500">{item.medicoNome}</p>
                        ) : null}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(draftIds)}
            className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Adicionar pacientes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
