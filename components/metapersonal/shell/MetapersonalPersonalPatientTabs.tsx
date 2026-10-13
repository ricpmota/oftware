'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, X } from 'lucide-react';

export type PersonalPatientTab = {
  id: string;
  nome: string;
};

const STORAGE_KEY = 'metapersonal-personal-patient-tabs';

export function readPersonalPatientTabs(): PersonalPatientTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PersonalPatientTab =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as PersonalPatientTab).id === 'string' &&
        (item as PersonalPatientTab).id.length > 0 &&
        typeof (item as PersonalPatientTab).nome === 'string'
    );
  } catch {
    return [];
  }
}

export function writePersonalPatientTabs(tabs: PersonalPatientTab[]) {
  if (typeof window === 'undefined') return;
  try {
    if (tabs.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // sessão cheia ou storage bloqueado: as abas seguem só em memória
  }
}

function shortTabLabel(nome: string, all: string[]): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || 'Paciente';
  const sameFirst = all.filter((item) => (item.trim().split(/\s+/)[0] || 'Paciente') === first).length;
  if (sameFirst > 1 && parts[1]) {
    return `${first} ${parts[1].charAt(0).toUpperCase()}.`;
  }
  return first;
}

export function MetapersonalPersonalPatientTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onAdd,
  onCloseAll,
}: {
  tabs: PersonalPatientTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
  onCloseAll: () => void;
}) {
  const nomes = tabs.map((tab) => tab.nome);

  return (
    <div className="flex items-center gap-1 min-w-0">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const label = shortTabLabel(tab.nome, nomes);
          return (
            <div
              key={tab.id}
              className={`flex max-w-[9.5rem] shrink-0 items-center rounded-lg py-1 pl-2.5 pr-0.5 ${
                active
                  ? 'bg-white/15 text-[#E8EDED] ring-1 ring-white/15'
                  : 'bg-white/5 text-[#E8EDED]/60'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                className="min-w-0 truncate text-left text-sm font-semibold"
                title={tab.nome}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </button>
              <button
                type="button"
                onClick={() => onClose(tab.id)}
                className="ml-0.5 rounded-md p-1.5 text-current/70 hover:bg-white/10 hover:text-current"
                aria-label={`Fechar ${tab.nome}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#4CCB7A] hover:bg-white/10"
        aria-label="Adicionar paciente"
        title="Adicionar paciente"
      >
        <Plus size={18} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={onCloseAll}
        className="flex-shrink-0 rounded-lg p-2 text-[#E8EDED]/65 hover:bg-white/10 hover:text-[#E8EDED]"
        aria-label="Fechar"
      >
        <X size={22} />
      </button>
    </div>
  );
}

export function MetapersonalPersonalPatientPicker({
  open,
  patients,
  openIds,
  onClose,
  onPick,
}: {
  open: boolean;
  patients: Array<{ id: string; nome: string }>;
  openIds: string[];
  onClose: () => void;
  onPick: (patient: { id: string; nome: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return patients;
    return patients.filter((patient) => patient.nome.toLocaleLowerCase('pt-BR').includes(term));
  }, [patients, query]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[280] flex items-end justify-center bg-black/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-patient-picker-title"
        className="flex max-h-[min(78dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-white/10 bg-[#0A1F44] text-[#E8EDED] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <h2 id="personal-patient-picker-title" className="text-base font-semibold">
              Abrir paciente
            </h2>
            <p className="text-xs text-[#E8EDED]/55">Uma aba para cada aluno</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]"
            aria-label="Fechar lista"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search size={16} className="shrink-0 text-[#E8EDED]/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar paciente"
              className="w-full bg-transparent text-sm text-[#E8EDED] outline-none placeholder:text-[#E8EDED]/35"
              autoFocus
            />
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-[#E8EDED]/50">Nenhum paciente encontrado.</li>
          ) : (
            filtered.map((patient) => {
              const alreadyOpen = openIds.includes(patient.id);
              const initial = (patient.nome.trim().charAt(0) || 'P').toUpperCase();
              return (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => onPick(patient)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4CCB7A]/15 text-sm font-semibold text-[#4CCB7A]">
                      {initial}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{patient.nome}</span>
                    {alreadyOpen ? (
                      <span className="shrink-0 text-[11px] font-medium text-[#E8EDED]/45">Aberto</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body
  );
}
