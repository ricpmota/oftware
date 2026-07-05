'use client';

import { Building2, Sparkles } from 'lucide-react';
import OrganizationsListPanel from '@/components/metaadmingeral/OrganizationsListPanel';
import LeadsWhiteLabelAdmin from '@/components/metaadmingeral/LeadsWhiteLabelAdmin';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';

export type OrganizationsHubView = 'list' | 'leads-whitelabel';

type OrganizationsHubPanelProps = {
  activeView: OrganizationsHubView;
  organizations: OrganizationDefinition[];
  activeOrganizationId: string;
  onSelectOrganization: (organizationId: string) => void;
  onNavigate: (menuId: string) => void;
};

const TABS: { id: OrganizationsHubView; menuId: string; label: string; icon: typeof Building2 }[] = [
  { id: 'list', menuId: 'organizacoes', label: 'Organizações ativas', icon: Building2 },
  { id: 'leads-whitelabel', menuId: 'leads-whitelabel', label: 'Leads White Label', icon: Sparkles },
];

export default function OrganizationsHubPanel({
  activeView,
  organizations,
  activeOrganizationId,
  onSelectOrganization,
  onNavigate,
}: OrganizationsHubPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1 w-full sm:w-fit">
        {TABS.map(({ id, menuId, label, icon: Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(menuId)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-sm'
                  : 'text-[#E8EDED]/70 hover:bg-white/5 hover:text-[#E8EDED]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {activeView === 'list' ? (
        <OrganizationsListPanel
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
          onSelectOrganization={onSelectOrganization}
        />
      ) : (
        <div className="-mx-2 md:-mx-4">
          <LeadsWhiteLabelAdmin embedded />
        </div>
      )}
    </div>
  );
}
