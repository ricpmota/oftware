'use client';

import { Building2 } from 'lucide-react';
import {
  META_ADMIN_GERAL_ACTIVE_ORG,
  META_ADMIN_GERAL_ALL_NAV,
  META_ADMIN_GERAL_ORGANIZATION_NAV,
  type MetaAdminGeralNavEntry,
  type MetaAdminGeralNavItem,
} from '@/components/metaadmingeral/metaAdminGeralNavConfig';
import { META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';

function isOrganizationMenuId(menuId: string): boolean {
  return META_ADMIN_GERAL_ORGANIZATION_NAV.some(
    (entry) => entry.type === 'item' && entry.item.id === menuId,
  );
}

function navItemClass(active: boolean, indented: boolean, menuId?: string) {
  const orgContext = menuId ? isOrganizationMenuId(menuId) : false;
  const activeClass = orgContext
    ? 'bg-[#4CCB7A]/20 text-[#4CCB7A] border-r-2 border-[#4CCB7A]'
    : META_ADMIN_GERAL_SHELL.navActive;

  return [
    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
    indented ? 'pl-5' : '',
    active ? activeClass : META_ADMIN_GERAL_SHELL.navInactive,
  ]
    .filter(Boolean)
    .join(' ');
}

type MetaAdminGeralSidebarNavProps = {
  activeMenu: string;
  onSelectMenu: (menuId: string) => void;
  sidebarCollapsed?: boolean;
  /** Indentação extra para sub-itens (Organizações, Patrimônio Global) */
  compact?: boolean;
};

function NavButton({
  item,
  activeMenu,
  onSelectMenu,
  sidebarCollapsed,
  indented,
}: {
  item: MetaAdminGeralNavItem;
  activeMenu: string;
  onSelectMenu: (menuId: string) => void;
  sidebarCollapsed?: boolean;
  indented?: boolean;
}) {
  const Icon = item.icon;
  const active = !item.href && activeMenu === item.id;

  if (item.href) {
    return (
      <a
        href={item.href}
        className={navItemClass(false, !!indented, item.id)}
        title={sidebarCollapsed ? item.label : ''}
      >
        <Icon size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
        {!sidebarCollapsed && item.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectMenu(item.id)}
      className={navItemClass(active, !!indented, item.id)}
      title={sidebarCollapsed ? item.label : ''}
    >
      <Icon size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
      {!sidebarCollapsed && item.label}
    </button>
  );
}

function renderNavEntries(
  entries: MetaAdminGeralNavEntry[],
  props: MetaAdminGeralSidebarNavProps,
) {
  const { activeMenu, onSelectMenu, sidebarCollapsed } = props;

  return entries.map((entry, index) => {
    if (entry.type === 'section-header') {
      if (sidebarCollapsed) {
        return (
          <div
            key={`${entry.label}-${index}`}
            className="my-2 border-t border-white/10"
            aria-hidden
          />
        );
      }
      return (
        <p
          key={`${entry.label}-${index}`}
          className={`px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${
            entry.label.startsWith('ORGANIZAÇÃO ATIVA')
              ? 'text-[#4CCB7A]/70'
              : 'text-[#22C55E]/60'
          }`}
        >
          {entry.label}
        </p>
      );
    }

    if (entry.type === 'subsection-header') {
      if (sidebarCollapsed) return null;
      return (
        <p
          key={`${entry.label}-${index}`}
          className="px-3 pt-2 pb-0.5 text-[11px] font-medium text-[#E8EDED]/55"
        >
          {entry.label}
        </p>
      );
    }

    const indented = entry.item.id === 'organizacao-metodo';

    return (
      <NavButton
        key={entry.item.id}
        item={entry.item}
        activeMenu={activeMenu}
        onSelectMenu={onSelectMenu}
        sidebarCollapsed={sidebarCollapsed}
        indented={indented}
      />
    );
  });
}

export function MetaAdminGeralActiveOrgBadge({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="px-2 py-3 border-b border-white/10 flex justify-center" title={META_ADMIN_GERAL_ACTIVE_ORG.name}>
        <Building2 className="h-5 w-5 text-[#4CCB7A]" aria-label={`Organização ativa: ${META_ADMIN_GERAL_ACTIVE_ORG.name}`} />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E8EDED]/45">
        Organização Ativa
      </p>
      <p className="mt-1 text-sm font-medium text-[#4CCB7A]">{META_ADMIN_GERAL_ACTIVE_ORG.name}</p>
    </div>
  );
}

export default function MetaAdminGeralSidebarNav(props: MetaAdminGeralSidebarNavProps) {
  return (
    <nav className={`flex-1 min-h-0 overflow-y-auto space-y-0.5 ${props.compact ? 'px-3 py-4' : 'px-4 py-4'}`}>
      {renderNavEntries(META_ADMIN_GERAL_ALL_NAV, props)}
    </nav>
  );
}

/** Lista plana para drawer mobile (com headers inline). */
export function MetaAdminGeralMobileNav({
  activeMenu,
  onSelectMenu,
}: {
  activeMenu: string;
  onSelectMenu: (menuId: string) => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {META_ADMIN_GERAL_ALL_NAV.map((entry, index) => {
        if (entry.type === 'section-header') {
          return (
            <p
              key={`${entry.label}-${index}`}
              className={`px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider first:pt-0 ${
                entry.label.startsWith('ORGANIZAÇÃO ATIVA')
                  ? 'text-[#4CCB7A]/70'
                  : 'text-[#22C55E]/60'
              }`}
            >
              {entry.label}
            </p>
          );
        }
        if (entry.type === 'subsection-header') {
          return (
            <p key={`${entry.label}-${index}`} className="px-3 pt-2 pb-0.5 text-[11px] font-medium text-[#E8EDED]/55">
              {entry.label}
            </p>
          );
        }

        const item = entry.item;
        const Icon = item.icon;
        const active = !item.href && activeMenu === item.id;
        const indented = item.id === 'organizacao-metodo';

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              className={`${navItemClass(false, indented, item.id)} py-2.5`}
            >
              <Icon size={20} className="mr-3" />
              {item.label}
            </a>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectMenu(item.id)}
            className={`${navItemClass(active, indented, item.id)} py-2.5`}
          >
            <Icon size={20} className="mr-3" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
