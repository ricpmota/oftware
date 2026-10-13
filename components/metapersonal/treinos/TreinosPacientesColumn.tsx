'use client';

import { Plus, X } from 'lucide-react';
import { AvatarBubble } from '@/components/comunicacao/MensagemAvatars';
import { normalizeAuthPhotoUrl } from '@/lib/firebase/resolvePacienteAuthUidForPhoto';
import {
  pacienteDisplayName,
  type TreinosSelectedPatient,
} from './treinosCentral.types';

type Props = {
  selectedPatients: TreinosSelectedPatient[];
  photoByUserId: Record<string, string | null>;
  onAddClick: () => void;
  onRemove: (pacienteId: string) => void;
};

export function TreinosPacientesColumn({
  selectedPatients,
  photoByUserId,
  onAddClick,
  onRemove,
}: Props) {
  return (
    <aside className="flex min-h-[28rem] w-full min-w-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-3 py-3">
        <h2 className="text-sm font-semibold leading-snug text-gray-900">Pacientes deste planejamento</h2>
        <p className="mt-1 text-[11px] leading-snug text-gray-500">
          Quem recebe esta programação.
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 text-xs font-semibold text-white hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" />
          Adicionar pacientes
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {selectedPatients.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 text-center">
            <p className="text-sm font-semibold text-gray-800">Nenhum paciente selecionado</p>
            <p className="mt-1 text-xs text-gray-500">
              Adicione pacientes para começar a montar esta programação.
            </p>
            <button
              type="button"
              onClick={onAddClick}
              className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar pacientes
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {selectedPatients.map((item) => {
              const nome = pacienteDisplayName(item);
              const photo = item.paciente.userId
                ? normalizeAuthPhotoUrl(photoByUserId[item.paciente.userId])
                : null;
              return (
                <li
                  key={item.pacienteId}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-1.5 py-1.5"
                >
                  <AvatarBubble name={nome} photoUrl={photo} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{nome}</p>
                    {item.medicoNome ? (
                      <p className="truncate text-[11px] text-gray-500">{item.medicoNome}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.pacienteId)}
                    className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                    aria-label={`Remover ${nome}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-100 px-3 py-2 text-[11px] font-medium text-gray-500">
        {selectedPatients.length} paciente{selectedPatients.length === 1 ? '' : 's'} selecionado
        {selectedPatients.length === 1 ? '' : 's'}
      </div>
    </aside>
  );
}
