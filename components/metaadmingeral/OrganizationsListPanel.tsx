'use client';

import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Plus, Search } from 'lucide-react';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';

type OrganizationsListPanelProps = {
  organizations: OrganizationDefinition[];
  activeOrganizationId: string;
  onSelectOrganization: (organizationId: string) => void;
};

export default function OrganizationsListPanel({
  organizations,
  activeOrganizationId,
  onSelectOrganization,
}: OrganizationsListPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        org.primaryOrigin.toLowerCase().includes(q),
    );
  }, [organizations, query]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#E8EDED]">Organizações</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/60">
          Organizações white label ativas na plataforma. Selecione uma para administrar equipe,
          marca, pacientes e operação.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8EDED]/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar organização…"
          className="w-full rounded-xl border border-white/15 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]/30"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((org) => {
          const isActive = org.id === activeOrganizationId;
          return (
            <button
              key={org.id}
              type="button"
              onClick={() => onSelectOrganization(org.id)}
              className={`rounded-2xl border p-5 text-left transition-colors ${
                isActive
                  ? 'border-[#4CCB7A]/50 bg-[#4CCB7A]/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4CCB7A]/20">
                  <Building2 className="h-5 w-5 text-[#4CCB7A]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#E8EDED] truncate">{org.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-[#E8EDED]/50">{org.id}</p>
                  <p className="mt-2 truncate text-xs text-[#E8EDED]/55">{org.primaryOrigin}</p>
                </div>
                {isActive ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4CCB7A]" aria-label="Organização ativa" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[#E8EDED]/50">Nenhuma organização encontrada para &quot;{query}&quot;.</p>
      ) : null}

      <button
        type="button"
        disabled
        title="Em breve — criação de novas organizações"
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-[#E8EDED]/45 cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
        Nova Organização (em breve)
      </button>
    </div>
  );
}
