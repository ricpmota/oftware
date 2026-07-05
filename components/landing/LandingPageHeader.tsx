'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, Stethoscope, UserCheck, UtensilsCrossed, Dumbbell, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { withIndicacaoRef } from '@/lib/landing/appNavigation';

function getFirstName(displayName: string | null): string {
  if (!displayName) return 'Usuário';
  return displayName.split(' ')[0];
}

interface LandingPageHeaderProps {
  user: User | null;
  onLogout: () => void;
  /** Quando não logado, ao clicar em um item do menu: abre login Google e navega após sucesso */
  onAccessPath?: (path: string) => void | Promise<void>;
  logoSrc?: string;
  logoAlt?: string;
  logoHref?: string;
}

const DEFAULT_LOGO = {
  src: '/oftware-site-novo2.png',
  alt: 'Oftware',
  href: '/',
} as const;

const MENU_ITEMS = [
  { label: 'Médico', path: '/metaadmin', icon: Stethoscope },
  { label: 'Paciente', path: '/meta', icon: UserCheck },
  { label: 'Nutricionista', path: '/metanutri', icon: UtensilsCrossed },
  { label: 'Personal', path: '/metapersonal', icon: Dumbbell },
];

export default function LandingPageHeader({
  user,
  onLogout,
  onAccessPath,
  logoSrc = DEFAULT_LOGO.src,
  logoAlt = DEFAULT_LOGO.alt,
  logoHref = DEFAULT_LOGO.href,
}: LandingPageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A1F44]/95 backdrop-blur-md border-b border-white/10">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex justify-between items-center">
          <Link href={logoHref} className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt={logoAlt}
              className="h-8 md:h-10 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm md:text-base font-medium text-[#E8EDED]">
                {user ? (
                  <>Olá, <span className="text-[#4CCB7A] font-semibold">{getFirstName(user.displayName)}</span></>
                ) : (
                  <>Olá, <span className="text-[#4CCB7A] font-semibold">seja bem-vindo!</span></>
                )}
              </p>
              <p className="text-xs text-[#E8EDED]/70">
                Sistema de Gestão Médica
              </p>
            </div>
            <div className="sm:hidden">
              <p className="text-sm font-medium text-[#E8EDED]">
                {user ? getFirstName(user.displayName) : 'Bem-vindo'}
              </p>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-[#E8EDED]/90 hover:text-[#E8EDED] hover:bg-white/10 rounded-lg transition-colors"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span className="hidden sm:inline text-sm font-medium">Menu</span>
                <ChevronDown size={18} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 py-2 bg-[#0A1F44] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  {MENU_ITEMS.map(({ label, path, icon: Icon }) => {
                    const href = path === '/meta' ? withIndicacaoRef(path) : path;
                    return user ? (
                      <Link
                        key={path}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-left text-[#E8EDED] hover:bg-white/10 transition-colors w-full"
                      >
                        <Icon size={18} className="text-[#4CCB7A]" />
                        {label}
                      </Link>
                    ) : (
                      <button
                        key={path}
                        type="button"
                        onClick={async () => {
                          setMenuOpen(false);
                          await onAccessPath?.(path);
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-left text-[#E8EDED] hover:bg-white/10 transition-colors w-full"
                      >
                        <Icon size={18} className="text-[#4CCB7A]" />
                        {label}
                      </button>
                    );
                  })}
                  {user && (
                    <>
                      <div className="border-t border-white/10 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#E8EDED]/80 hover:bg-white/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut size={18} />
                        Sair
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
