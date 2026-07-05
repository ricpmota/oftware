'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Início', id: 'inicio' },
  { label: 'Ecossistema', id: 'ecossistema' },
  { label: 'White Label', id: 'white-label' },
  { label: 'Multidisciplinar', id: 'multidisciplinar' },
  { label: 'Para Médicos', id: 'medicos' },
  { label: 'Programas clínicos', id: 'programas' },
  { label: 'Clientes', id: 'clientes' },
  { label: 'Demonstração', id: 'demonstracao' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

type OftwareHomeHeaderProps = {
  onCtaClick?: () => void;
};

export default function OftwareHomeHeader({ onCtaClick }: OftwareHomeHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = useCallback((id: string) => {
    setMobileOpen(false);
    scrollToSection(id);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A1F44] border-b border-white/[0.08]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-[72px] md:h-[80px] gap-4">
          <Link href="/" className="inline-flex items-center shrink-0" onClick={() => setMobileOpen(false)}>
            <img src="/oftware2.png" alt="Oftware" className="h-8 md:h-9 w-auto object-contain" />
          </Link>

          <nav className="hidden xl:flex items-center justify-center flex-1 gap-1" aria-label="Navegação principal">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(id)}
                className="px-3 py-2 text-sm font-medium text-white hover:text-[#22C55E] transition-colors rounded-lg"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onCtaClick}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-colors"
            >
              Quero minha plataforma
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="xl:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t border-white/[0.08] bg-[#0A1F44]">
          <nav className="flex flex-col px-4 py-4 gap-1" aria-label="Navegação mobile">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(id)}
                className="text-left px-4 py-3 text-sm font-medium text-white hover:text-[#22C55E] hover:bg-white/5 rounded-lg transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onCtaClick?.();
              }}
              className="mt-2 mx-4 py-3 rounded-full text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-colors"
            >
              Quero minha plataforma
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
