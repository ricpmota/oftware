'use client';

import type { Ref } from 'react';
import { Bell, User as UserIcon } from 'lucide-react';
import { MatchHomeEntryButton } from '@/components/meta/match/MatchHomeEntryButton';
import {
  organizationPatientDashboardPaint,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';

const NAVY = '#0A1F44';

export function getMetaHomeFirstName(
  displayName?: string | null,
  pacienteNome?: string | null
): string {
  const source = (displayName || pacienteNome || '').trim();
  if (!source) return 'Usuário';
  return source.split(/\s+/)[0] || 'Usuário';
}

export interface MetaPatientHeaderProps {
  firstName: string;
  photoURL?: string | null;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onAvatarClick?: () => void;
  avatarButtonRef?: Ref<HTMLButtonElement>;
  className?: string;
  /** Chrome autenticado. No Método o título conserva o navy. */
  chrome?: OrganizationShellChrome | null;
}

export function MetaPatientHeader({
  firstName,
  photoURL,
  unreadCount = 0,
  onNotificationsClick,
  onAvatarClick,
  avatarButtonRef,
  className = '',
  chrome,
}: MetaPatientHeaderProps) {
  const paint = organizationPatientDashboardPaint(chrome);
  return (
    <header className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1
          className="truncate text-[22px] font-extrabold leading-tight tracking-tight"
          style={{ color: paint?.ink ?? NAVY }}
        >
          Olá, {firstName} 👋
        </h1>
        <p className="mt-0.5 text-[13px] leading-snug text-gray-500 sm:text-sm">
          Acompanhe sua evolução
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <MatchHomeEntryButton />
        <button
          type="button"
          onClick={onNotificationsClick}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          aria-label={
            unreadCount > 0
              ? `Notificações, ${unreadCount} não lidas`
              : 'Notificações'
          }
          title="Notificações"
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          ref={avatarButtonRef}
          type="button"
          onClick={onAvatarClick}
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200 transition-opacity hover:opacity-90"
          title="Perfil"
          aria-label="Abrir menu do perfil"
        >
          {photoURL ? (
            <img src={photoURL} alt="Foto do perfil" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>
    </header>
  );
}
