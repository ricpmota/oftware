'use client';

import { Building2, Globe, CheckCircle2 } from 'lucide-react';
import {
  META_ADMIN_GERAL_ACTIVE_ORG,
  METODO_ORGANIZATION_MEDICOS_ATUAIS,
} from '@/components/metaadmingeral/metaAdminGeralNavConfig';

export default function OrganizationMetodoPanel() {
  const org = META_ADMIN_GERAL_ACTIVE_ORG;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#E8EDED]">Organizações</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/60">
          Visão da Organização ativa na plataforma Oftware
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4CCB7A]/20">
            <Building2 className="h-5 w-5 text-[#4CCB7A]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#E8EDED]">{org.name}</h3>
            <p className="text-xs text-[#E8EDED]/60">ID: {org.id}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#4CCB7A]/15 px-3 py-1 text-xs font-medium text-[#4CCB7A]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ativa
          </span>
        </div>

        <dl className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">Nome</dt>
            <dd className="mt-1 text-sm text-[#E8EDED]">{org.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">ID</dt>
            <dd className="mt-1 font-mono text-sm text-[#E8EDED]">{org.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">Tipo</dt>
            <dd className="mt-1 text-sm text-[#E8EDED]">Organização</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">Status</dt>
            <dd className="mt-1 text-sm text-[#4CCB7A]">Ativa</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">Domínio</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-[#E8EDED]">
              <Globe className="h-4 w-4 shrink-0 text-[#E8EDED]/50" />
              <a
                href={org.primaryOrigin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4CCB7A] hover:underline"
              >
                {org.primaryOrigin}
              </a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">
              Médicos atuais
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {METODO_ORGANIZATION_MEDICOS_ATUAIS.map((nome) => (
                <span
                  key={nome}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[#E8EDED]"
                >
                  {nome}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
