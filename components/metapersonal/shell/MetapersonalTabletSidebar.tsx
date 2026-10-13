'use client';

import WhatsappConnectHintBalloon from '@/components/whatsapp/WhatsappConnectHintBalloon';
import {
  METAPERSONAL_SHELL_NAV_ITEMS,
  type MetapersonalShellMenuId,
  type MetapersonalShellNavId,
} from './metapersonalShellNav';

type Props = {
  logoSrc: string;
  logoAlt: string;
  backgroundColor: string;
  activeMenu: MetapersonalShellMenuId;
  meuPerfilAba: string;
  showWhatsappConnectHint?: boolean;
  onNavigate: (id: MetapersonalShellNavId) => void;
};

function isNavActive(
  itemId: MetapersonalShellNavId,
  activeMenu: MetapersonalShellMenuId,
  meuPerfilAba: string,
): boolean {
  if (itemId === 'whatsapp') {
    return activeMenu === 'meu-perfil' && meuPerfilAba === 'whatsapp';
  }
  if (itemId === 'meu-perfil') {
    return activeMenu === 'meu-perfil' && meuPerfilAba !== 'whatsapp';
  }
  return activeMenu === itemId;
}

/**
 * Sidebar compacta do /metapersonal (tablet: md até xl).
 * Ícones + tooltip nativo (`title`). Clique/toque navega — hover é só complemento.
 */
export default function MetapersonalTabletSidebar({
  logoSrc,
  logoAlt,
  backgroundColor,
  activeMenu,
  meuPerfilAba,
  showWhatsappConnectHint = false,
  onNavigate,
}: Props) {
  return (
    <aside
      data-mp-nav="tablet"
      className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col border-r border-white/10 shadow-lg md:flex xl:hidden"
      style={{ backgroundColor }}
      aria-label="Navegação"
    >
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/10 px-2">
        {/* Logo compacta: mesma arte, recorte quadrado — sem novo arquivo de marca */}
        <img
          src={logoSrc}
          alt={logoAlt}
          className="h-8 w-8 object-contain object-center"
        />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
        {METAPERSONAL_SHELL_NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = isNavActive(id, activeMenu, meuPerfilAba);
          return (
            <div
              key={id}
              className={`relative flex w-full justify-center overflow-visible border-r-2 ${
                active ? 'border-[#4CCB7A]' : 'border-transparent'
              }`}
            >
              <button
                type="button"
                title={label}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(id)}
                className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
                  active
                    ? 'bg-white/10 text-[#4CCB7A]'
                    : 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]'
                }`}
              >
                <Icon size={22} className="shrink-0" aria-hidden="true" />
              </button>
              {id === 'whatsapp' && showWhatsappConnectHint ? (
                <WhatsappConnectHintBalloon align="center" />
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
