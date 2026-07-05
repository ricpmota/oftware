'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, Plus } from 'lucide-react';
import {
  findDepartmentIdForMenu,
  getNavOrganizationById,
  inferNavContextFromMenu,
  listNavOrganizations,
  META_ADMIN_GERAL_ORG_DEPARTMENTS,
  META_ADMIN_GERAL_ORG_TOP,
  META_ADMIN_GERAL_PLATFORM_DEPARTMENTS,
  META_ADMIN_GERAL_PLATFORM_TOP,
  resolveMetaAdminGeralMenuId,
  type MetaAdminGeralNavContext,
  type MetaAdminGeralNavDepartment,
  type MetaAdminGeralNavLeaf,
} from '@/lib/metaadmingeral/metaAdminGeralNavUx';
import { META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';

function navButtonClass(active: boolean, orgAccent = false) {
  const activeClass = orgAccent
    ? 'bg-[#4CCB7A]/20 text-[#4CCB7A] border-r-2 border-[#4CCB7A]'
    : META_ADMIN_GERAL_SHELL.navActive;
  return [
    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
    active ? activeClass : META_ADMIN_GERAL_SHELL.navInactive,
  ].join(' ');
}

type MetaAdminGeralNavShellProps = {
  navContext: MetaAdminGeralNavContext;
  activeMenu: string;
  activeOrganizationId: string;
  sidebarCollapsed?: boolean;
  onNavContextChange: (ctx: MetaAdminGeralNavContext) => void;
  onOrganizationChange: (organizationId: string) => void;
  onSelectMenu: (menuId: string) => void;
};

function NavLeaf({
  item,
  active,
  onSelect,
  orgAccent,
}: {
  item: MetaAdminGeralNavLeaf;
  active: boolean;
  onSelect: (menuId: string) => void;
  orgAccent?: boolean;
}) {
  const Icon = item.icon;

  if (item.href) {
    return (
      <a href={item.href} className={`${navButtonClass(false, orgAccent)} text-[13px]`}>
        {Icon ? <Icon size={16} className="mr-2 opacity-70" /> : null}
        <span className="truncate">{item.label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={item.comingSoon}
      onClick={() => !item.comingSoon && onSelect(item.id)}
      className={`${navButtonClass(active, orgAccent)} text-[13px] ${
        item.comingSoon ? 'opacity-45 cursor-not-allowed' : ''
      }`}
      title={item.comingSoon ? 'Em breve' : undefined}
    >
      {Icon ? <Icon size={16} className="mr-2 opacity-70" /> : null}
      <span className="truncate">{item.label}</span>
      {item.comingSoon ? (
        <span className="ml-auto text-[10px] uppercase tracking-wide opacity-50">breve</span>
      ) : null}
    </button>
  );
}

function CollapsibleDepartment({
  department,
  expanded,
  onToggle,
  activeMenu,
  onSelectMenu,
  orgAccent,
}: {
  department: MetaAdminGeralNavDepartment;
  expanded: boolean;
  onToggle: () => void;
  activeMenu: string;
  onSelectMenu: (menuId: string) => void;
  orgAccent?: boolean;
}) {
  const resolvedActive = resolveMetaAdminGeralMenuId(activeMenu);
  const hasActiveChild =
    department.id === resolvedActive ||
    department.items.some((item) => resolveMetaAdminGeralMenuId(item.id) === resolvedActive);
  const Icon = department.icon;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => {
          const willExpand = !expanded;
          onToggle();
          if (department.id === 'platform-patrimonio' && willExpand) {
            onSelectMenu('platform-patrimonio');
          }
        }}
        className={`${navButtonClass(hasActiveChild && !expanded, orgAccent)} justify-between`}
      >
        <span className="flex items-center min-w-0">
          <Icon size={18} className="mr-2.5 shrink-0 opacity-80" />
          <span className="truncate">{department.label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded ? (
        <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
          {department.items.map((item) => (
            <NavLeaf
              key={item.id}
              item={item}
              active={resolveMetaAdminGeralMenuId(item.id) === resolvedActive}
              onSelect={onSelectMenu}
              orgAccent={orgAccent}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrganizationSwitcher({
  activeOrganizationId,
  onOrganizationChange,
  onBackToPlatform,
  onOpenOrganizations,
}: {
  activeOrganizationId: string;
  onOrganizationChange: (id: string) => void;
  onBackToPlatform: () => void;
  onOpenOrganizations: () => void;
}) {
  const [open, setOpen] = useState(false);
  const org = getNavOrganizationById(activeOrganizationId);
  const organizations = listNavOrganizations();

  return (
    <div className="border-b border-white/10 px-3 py-3 space-y-2">
      <button
        type="button"
        onClick={onBackToPlatform}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#E8EDED]/60 hover:bg-white/5 hover:text-[#E8EDED]"
      >
        <ChevronLeft className="h-4 w-4" />
        Organizações
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-3 py-2.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4CCB7A]/80">
              Organização ativa
            </p>
            <p className="truncate text-sm font-semibold text-[#E8EDED]">{org?.name ?? activeOrganizationId}</p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#4CCB7A] ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-white/15 bg-[#0A1F44] py-1 shadow-xl">
            {organizations.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onOrganizationChange(o.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-sm hover:bg-white/10 ${
                  o.id === activeOrganizationId ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'
                }`}
              >
                {o.id === activeOrganizationId ? '✔ ' : ''}
                {o.name}
              </button>
            ))}
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#E8EDED]/40 cursor-not-allowed border-t border-white/10 mt-1"
            >
              <Plus className="h-4 w-4" />
              Nova Organização
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenOrganizations();
              }}
              className="w-full px-3 py-2 text-left text-xs text-[#E8EDED]/55 hover:bg-white/5 border-t border-white/10"
            >
              Ver todas as organizações…
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MetaAdminGeralNavShell({
  navContext,
  activeMenu,
  activeOrganizationId,
  sidebarCollapsed,
  onNavContextChange,
  onOrganizationChange,
  onSelectMenu,
}: MetaAdminGeralNavShellProps) {
  const resolvedMenu = resolveMetaAdminGeralMenuId(activeMenu);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const toggleDept = useCallback((deptId: string) => {
    setExpandedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  }, []);

  useEffect(() => {
    const deptId = findDepartmentIdForMenu(activeMenu);
    if (deptId) {
      setExpandedDepts((prev) => ({ ...prev, [deptId]: true }));
    }
  }, [activeMenu]);

  if (navContext === 'platform') {
    if (sidebarCollapsed) {
      return <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4" aria-label="Plataforma" />;
    }

    return (
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#22C55E]/60">
          Plataforma
        </p>

        {META_ADMIN_GERAL_PLATFORM_TOP.map((top) => {
          const Icon = top.icon;
          const isDirect = top.id === 'dashboard-oftware';
          const active = resolvedMenu === top.id;

          if (isDirect) {
            return (
              <button
                key={top.id}
                type="button"
                onClick={() => onSelectMenu(top.id)}
                className={navButtonClass(active)}
              >
                <Icon size={20} className="mr-3" />
                {top.label}
              </button>
            );
          }

          const dept = META_ADMIN_GERAL_PLATFORM_DEPARTMENTS.find((d) => d.id === top.id);
          if (!dept) return null;

          return (
            <CollapsibleDepartment
              key={dept.id}
              department={dept}
              expanded={!!expandedDepts[dept.id]}
              onToggle={() => toggleDept(dept.id)}
              activeMenu={activeMenu}
              onSelectMenu={onSelectMenu}
            />
          );
        })}
      </nav>
    );
  }

  if (sidebarCollapsed) {
    return <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4" aria-label="Organização" />;
  }

  return (
    <nav className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <OrganizationSwitcher
        activeOrganizationId={activeOrganizationId}
        onOrganizationChange={(id) => {
          onOrganizationChange(id);
          onSelectMenu('org-dashboard');
        }}
        onBackToPlatform={() => {
          onNavContextChange('platform');
          onSelectMenu('organizacoes');
        }}
        onOpenOrganizations={() => {
          onNavContextChange('platform');
          onSelectMenu('organizacoes');
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#4CCB7A]/70">
          {getNavOrganizationById(activeOrganizationId)?.name ?? 'Organização'}
        </p>

        {META_ADMIN_GERAL_ORG_TOP.map((top) => {
          if (top.id === 'org-dashboard') {
            const Icon = top.icon;
            return (
              <button
                key={top.id}
                type="button"
                onClick={() => onSelectMenu('org-dashboard')}
                className={navButtonClass(resolvedMenu === 'org-dashboard', true)}
              >
                <Icon size={20} className="mr-3" />
                {top.label}
              </button>
            );
          }

          const dept = META_ADMIN_GERAL_ORG_DEPARTMENTS.find((d) => d.id === top.id);
          if (!dept) return null;

          return (
            <CollapsibleDepartment
              key={dept.id}
              department={dept}
              expanded={!!expandedDepts[dept.id]}
              onToggle={() => toggleDept(dept.id)}
              activeMenu={activeMenu}
              onSelectMenu={onSelectMenu}
              orgAccent
            />
          );
        })}
      </div>
    </nav>
  );
}

export function inferNavContextForMenu(menuId: string): MetaAdminGeralNavContext {
  return inferNavContextFromMenu(menuId);
}

export { defaultActiveOrganizationId } from '@/lib/metaadmingeral/metaAdminGeralNavUx';
