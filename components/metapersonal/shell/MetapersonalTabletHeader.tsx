'use client';

import { Link as LinkIcon, LogOut, UserCircle } from 'lucide-react';
import {
  metapersonalShellFirstName,
  metapersonalShellHeaderTitle,
  type MetapersonalShellMenuId,
} from './metapersonalShellNav';

type Props = {
  activeMenu: MetapersonalShellMenuId;
  meuPerfilAba: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  showProfileDropdown: boolean;
  onToggleProfile: () => void;
  onCloseProfile: () => void;
  onOpenPerfil: () => void;
  onOpenLink: () => void;
  onLogout: () => void;
};

/**
 * Header compacto do /metapersonal (tablet: md até xl).
 * Título da seção + perfil (foto + primeiro nome). Dropdown por clique/toque.
 */
export default function MetapersonalTabletHeader({
  activeMenu,
  meuPerfilAba,
  displayName,
  email,
  photoURL,
  showProfileDropdown,
  onToggleProfile,
  onCloseProfile,
  onOpenPerfil,
  onOpenLink,
  onLogout,
}: Props) {
  const title = metapersonalShellHeaderTitle(activeMenu, meuPerfilAba);
  const firstName = metapersonalShellFirstName(displayName);

  return (
    <header
      data-mp-nav="tablet"
      className="sticky top-0 z-30 hidden h-14 min-w-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 md:flex xl:hidden"
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      <div className="relative flex shrink-0 items-center">
        <button
          type="button"
          onClick={onToggleProfile}
          className="flex h-11 max-w-[10rem] items-center gap-2 rounded-md px-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          aria-expanded={showProfileDropdown}
          aria-haspopup="menu"
          title="Perfil"
        >
          {photoURL ? (
            <img src={photoURL} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <UserCircle className="h-8 w-8 shrink-0" />
          )}
          {firstName ? (
            <span className="min-w-0 truncate text-sm font-medium">{firstName}</span>
          ) : null}
        </button>

        {showProfileDropdown ? (
          <>
            <div className="fixed inset-0 z-40" onClick={onCloseProfile} aria-hidden="true" />
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 min-w-[280px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex min-w-0 items-center gap-3">
                  {photoURL ? (
                    <img src={photoURL} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                      <UserCircle size={24} className="text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {displayName || 'Usuário'}
                    </p>
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                      {email || ''}
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={onOpenPerfil}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <UserCircle size={16} className="text-gray-600 dark:text-gray-400" />
                  Meu Perfil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onOpenLink}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <LinkIcon size={16} className="text-gray-600 dark:text-gray-400" />
                  Meu Link
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
