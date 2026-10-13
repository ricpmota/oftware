'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import Link from 'next/link';
import {
  ChevronDown,
  LogOut,
  Stethoscope,
  UserCheck,
  UtensilsCrossed,
  Dumbbell,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { withIndicacaoRef } from '@/lib/landing/appNavigation';

const MENU_ITEMS = [
  { label: 'Médico', path: '/metaadmin', icon: Stethoscope },
  { label: 'Paciente', path: '/meta', icon: UserCheck },
  { label: 'Nutricionista', path: '/metanutri', icon: UtensilsCrossed },
  { label: 'Psiquiatra', path: '/metapsi', icon: Brain },
  { label: 'Personal', path: '/metapersonal', icon: Dumbbell },
] as const;

type Props = {
  user: User | null;
  onLogout: () => void;
  onAccessPath: (path: string) => void | Promise<void>;
  onPrimaryCta: () => void;
};

function getFirstName(displayName: string | null): string {
  if (!displayName) return 'Usuário';
  return displayName.split(' ')[0]!;
}

export default function HomeProvisorioHeader({
  user,
  onLogout,
  onAccessPath,
  onPrimaryCta,
}: Props) {
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A1F44]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3.5 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/homeprovisorio" className="inline-flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/og-metodo-simbolo.jpg"
            alt="Método Emagrecer"
            className="h-8 w-auto object-contain sm:h-9"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPrimaryCta}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#4CCB7A] px-3 text-[13px] font-bold text-[#0A1F44] transition-opacity hover:opacity-95 sm:h-10 sm:px-4 sm:text-sm"
          >
            Começar
            <ArrowRight className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/15 px-2.5 text-[#E8EDED] transition-colors hover:bg-white/10 sm:h-10 sm:px-3"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Abrir menu"
            >
              <span className="hidden text-sm font-medium sm:inline">
                {user ? getFirstName(user.displayName) : 'Menu'}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0A1F44] py-2 shadow-xl">
                {MENU_ITEMS.map(({ label, path, icon: Icon }) => {
                  const href = path === '/meta' ? withIndicacaoRef(path) : path;
                  return user ? (
                    <Link
                      key={path}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#E8EDED] transition-colors hover:bg-white/10"
                    >
                      <Icon size={18} className="text-[#4CCB7A]" aria-hidden />
                      {label}
                    </Link>
                  ) : (
                    <button
                      key={path}
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        await onAccessPath(path);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#E8EDED] transition-colors hover:bg-white/10"
                    >
                      <Icon size={18} className="text-[#4CCB7A]" aria-hidden />
                      {label}
                    </button>
                  );
                })}
                {user ? (
                  <>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#E8EDED]/80 transition-colors hover:bg-white/10 hover:text-red-300"
                    >
                      <LogOut size={18} aria-hidden />
                      Sair
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
