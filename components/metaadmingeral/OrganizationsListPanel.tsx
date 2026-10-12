'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, CheckCircle2, Loader2, Plus, Search, X } from 'lucide-react';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';
import { suggestOrganizationSlugFromName } from '@/lib/organization/normalizeOrganizationSlug';

type OrganizationsListPanelProps = {
  organizations: OrganizationDefinition[];
  activeOrganizationId: string;
  onSelectOrganization: (organizationId: string) => void;
  onCreateOrganization?: (input: {
    name: string;
    organizationId: string;
    domain: string;
  }) => Promise<OrganizationDefinition>;
  creating?: boolean;
  /** Abre o modal ao receber true (ex.: atalho da sidebar). */
  requestOpenCreate?: boolean;
  onCreateModalOpenChange?: (open: boolean) => void;
};

export default function OrganizationsListPanel({
  organizations,
  activeOrganizationId,
  onSelectOrganization,
  onCreateOrganization,
  creating = false,
  requestOpenCreate = false,
  onCreateModalOpenChange,
}: OrganizationsListPanelProps) {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [domain, setDomain] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (requestOpenCreate) {
      setShowCreate(true);
      onCreateModalOpenChange?.(true);
    }
  }, [requestOpenCreate, onCreateModalOpenChange]);

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

  const resetForm = () => {
    setName('');
    setOrganizationId('');
    setSlugTouched(false);
    setDomain('');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
    onCreateModalOpenChange?.(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setShowCreate(false);
    resetForm();
    onCreateModalOpenChange?.(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onCreateOrganization) return;
    setFormError(null);
    try {
      const created = await onCreateOrganization({
        name: name.trim(),
        organizationId: organizationId.trim() || suggestOrganizationSlugFromName(name),
        domain: domain.trim(),
      });
      setShowCreate(false);
      resetForm();
      onCreateModalOpenChange?.(false);
      onSelectOrganization(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar organização');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E8EDED]">Organizações</h2>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Organizações white label ativas na plataforma. Selecione uma para administrar equipe,
            marca, pacientes e operação.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!onCreateOrganization}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#3db86a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Nova Organização
        </button>
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

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nova-org-title"
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0A1F44] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="nova-org-title" className="text-lg font-semibold text-[#E8EDED]">
                  Nova Organização
                </h3>
                <p className="mt-1 text-sm text-[#E8EDED]/60">
                  Cria um cliente white label isolado do Método Emagrecer. Domínio já pode estar no
                  Vercel — aqui você registra a org na plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                disabled={creating}
                className="rounded-lg p-1 text-[#E8EDED]/60 hover:bg-white/10 hover:text-[#E8EDED]"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">
                  Nome da organização
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    if (!slugTouched) {
                      setOrganizationId(suggestOrganizationSlugFromName(next));
                    }
                  }}
                  placeholder="Ex.: Endocrino Kamilla Montenegro"
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">
                  ID (organizationId)
                </label>
                <input
                  required
                  value={organizationId}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setOrganizationId(e.target.value.toLowerCase().trim());
                  }}
                  placeholder="ex.: endocrino-kamilla-montenegro"
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 font-mono text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]/30"
                />
                <p className="mt-1 text-xs text-[#E8EDED]/45">
                  Imutável depois de criado. Letras minúsculas, números e hífens.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">
                  Domínio
                </label>
                <input
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="www.endocrinokamillamontenegro.com"
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]/30"
                />
              </div>

              {formError ? (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreate}
                  disabled={creating}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]/80 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#0A1F44] hover:bg-[#3db86a] disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Criar organização
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
