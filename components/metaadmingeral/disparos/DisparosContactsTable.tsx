'use client';

import { useMemo, useState } from 'react';
import { DISPAROS_PAGE_SIZE } from '@/lib/disparos/constants';
import { contactStatusLabel } from '@/lib/disparos/labels';
import type { ImportedContact, ImportedContactStatus } from '@/lib/disparos/types';
import { DisparosBadge } from '@/components/metaadmingeral/disparos/disparosUi';

const FILTERS: Array<{ id: 'todos' | ImportedContactStatus; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'valido', label: 'Válido' },
  { id: 'falta_ddd', label: 'Falta DDD' },
  { id: 'invalido', label: 'Telefone inválido' },
  { id: 'sem_telefone', label: 'Sem telefone' },
  { id: 'duplicado', label: 'Duplicado' },
  { id: 'opt_out', label: 'Opt-out' },
];

function tone(status: ImportedContactStatus): 'success' | 'warn' | 'danger' | 'muted' | 'info' {
  if (status === 'valido') return 'success';
  if (status === 'duplicado' || status === 'falta_ddd') return 'warn';
  if (status === 'invalido') return 'danger';
  if (status === 'opt_out') return 'info';
  return 'muted';
}

function originalText(value: string): string {
  return value.trim() || '—';
}

function whatsappText(display: string | null): string {
  return display || '—';
}

type Props = {
  contacts: ImportedContact[];
  selectedIds: ReadonlySet<string>;
  showPhone2: boolean;
  onToggle: (id: string) => void;
  onReplaceSelection: (ids: string[]) => void;
  remote?: {
    query: string;
    status: (typeof FILTERS)[number]['id'];
    onQuery: (value: string) => void;
    onStatus: (value: (typeof FILTERS)[number]['id']) => void;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    label: string;
  };
};

export default function DisparosContactsTable({
  contacts,
  selectedIds,
  showPhone2,
  onToggle,
  onReplaceSelection,
  remote,
}: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof FILTERS)[number]['id']>('todos');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (remote) return contacts;
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return contacts.filter((contact) => {
      if (status !== 'todos' && contact.status !== status) return false;
      if (!term) return true;
      return (
        contact.nome.toLocaleLowerCase('pt-BR').includes(term) ||
        contact.primeiroNome.toLocaleLowerCase('pt-BR').includes(term)
      );
    });
  }, [contacts, query, remote, status]);

  const pageCount = remote ? 1 : Math.max(1, Math.ceil(filtered.length / DISPAROS_PAGE_SIZE));
  const safePage = remote ? 1 : Math.min(page, pageCount);
  const slice = remote ? contacts : filtered.slice((safePage - 1) * DISPAROS_PAGE_SIZE, safePage * DISPAROS_PAGE_SIZE);
  const allFilteredSelected = filtered.length > 0 && filtered.every((contact) => selectedIds.has(contact.id));

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changeStatus(value: (typeof FILTERS)[number]['id']) {
    setStatus(value);
    setPage(1);
  }

  function toggleAll() {
    if (allFilteredSelected) {
      const hidden = [...selectedIds].filter((id) => !filtered.some((contact) => contact.id === id));
      onReplaceSelection(hidden);
      return;
    }
    const merged = new Set(selectedIds);
    for (const contact of filtered) merged.add(contact.id);
    onReplaceSelection([...merged]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={remote ? remote.query : query}
          onChange={(event) => (remote ? remote.onQuery(event.target.value) : changeQuery(event.target.value))}
          placeholder="Pesquisar pelo nome"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/35 sm:max-w-xs"
        />
        <select
          value={remote ? remote.status : status}
          onChange={(event) =>
            remote
              ? remote.onStatus(event.target.value as (typeof FILTERS)[number]['id'])
              : changeStatus(event.target.value as (typeof FILTERS)[number]['id'])
          }
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-[#E8EDED]"
          aria-label="Filtrar por status"
        >
          {FILTERS.map((filter) => (
            <option key={filter.id} value={filter.id}>
              {filter.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-[#E8EDED]/50 sm:ml-auto">
          {remote ? remote.label : `${filtered.length.toLocaleString('pt-BR')} na busca`} · {selectedIds.size.toLocaleString('pt-BR')} selecionados
        </p>
      </div>

      <div className="space-y-3 md:hidden">
        <label className="flex items-center gap-2 text-sm text-[#E8EDED]/80">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
          Selecionar todos desta busca
        </label>
        {slice.map((contact) => (
          <article key={contact.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(contact.id)}
                  onChange={() => onToggle(contact.id)}
                />
                <span>
                  <span className="block font-medium text-[#E8EDED]">{contact.nome || '—'}</span>
                  <span className="mt-1 block text-sm text-[#E8EDED]/60">{contact.primeiroNome || '—'}</span>
                </span>
              </label>
              <DisparosBadge label={contactStatusLabel(contact.status)} tone={tone(contact.status)} />
            </div>
            <dl className="mt-3 space-y-1 text-sm text-[#E8EDED]/75">
              <div className="flex justify-between gap-3">
                <dt className="text-[#E8EDED]/45">Original</dt>
                <dd className="text-right">{originalText(contact.telefone1.original)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#E8EDED]/45">WhatsApp</dt>
                <dd className="text-right">{whatsappText(contact.telefone1.display)}</dd>
              </div>
              {showPhone2 ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#E8EDED]/45">Original 2</dt>
                    <dd className="text-right">{originalText(contact.telefone2?.original ?? '')}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#E8EDED]/45">WhatsApp 2</dt>
                    <dd className="text-right">{whatsappText(contact.telefone2?.display ?? null)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#E8EDED]/45">
              <th className="px-3 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos desta busca"
                />
              </th>
              <th className="px-3 py-3 font-medium">Nome</th>
              <th className="px-3 py-3 font-medium">Original</th>
              <th className="px-3 py-3 font-medium">WhatsApp</th>
              {showPhone2 ? <th className="px-3 py-3 font-medium">Original 2</th> : null}
              {showPhone2 ? <th className="px-3 py-3 font-medium">WhatsApp 2</th> : null}
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((contact) => (
              <tr key={contact.id} className="border-b border-white/5 text-[#E8EDED]">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => onToggle(contact.id)}
                    aria-label={`Selecionar ${contact.nome || 'contato'}`}
                  />
                </td>
                <td className="px-3 py-3">{contact.nome || '—'}</td>
                <td className="px-3 py-3">{originalText(contact.telefone1.original)}</td>
                <td className="px-3 py-3">{whatsappText(contact.telefone1.display)}</td>
                {showPhone2 ? (
                  <td className="px-3 py-3">{originalText(contact.telefone2?.original ?? '')}</td>
                ) : null}
                {showPhone2 ? (
                  <td className="px-3 py-3">{whatsappText(contact.telefone2?.display ?? null)}</td>
                ) : null}
                <td className="px-3 py-3">
                  <DisparosBadge label={contactStatusLabel(contact.status)} tone={tone(contact.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[#E8EDED]/50">Nenhum contato nesta busca.</p>
      ) : (
        <div className="flex items-center justify-between gap-3 text-sm text-[#E8EDED]/60">
          <span>{remote ? remote.label : `Página ${safePage} de ${pageCount} · ${contacts.length.toLocaleString('pt-BR')} processados`}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={remote ? !remote.hasPrev : safePage <= 1}
              onClick={() => (remote ? remote.onPrev() : setPage(safePage - 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={remote ? !remote.hasNext : safePage >= pageCount}
              onClick={() => (remote ? remote.onNext() : setPage(safePage + 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
