'use client';

import {
  Calendar,
  BarChart3,
  Video,
  BookOpen,
  CalendarDays,
} from 'lucide-react';

export type CoursePlayerTab = 'planner' | 'dashboard' | 'videos' | 'apostila' | 'schedule';

const TABS: { id: CoursePlayerTab; label: string; icon: typeof Calendar }[] = [
  { id: 'planner', label: 'Planejador', icon: Calendar },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'videos', label: 'Vídeos', icon: Video },
  { id: 'apostila', label: 'Apostila', icon: BookOpen },
  { id: 'schedule', label: 'Cronograma', icon: CalendarDays },
];

/**
 * Altura da tab bar mobile, sem a safe area.
 * A barra usa `h-[calc(4.5rem+env(safe-area-inset-bottom))]`.
 * O conteúdo reserva o mesmo valor em padding-bottom.
 */
export const COURSE_PLAYER_MOBILE_NAV_CLEARANCE = 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]';

interface CoursePlayerNavigationProps {
  activeTab: CoursePlayerTab;
  onSelect: (tab: CoursePlayerTab) => void;
  isPurple: boolean;
}

function itemTone(active: boolean, isPurple: boolean, surface: 'desktop' | 'mobile') {
  if (surface === 'desktop') {
    if (active) {
      return isPurple
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700';
    }
    return isPurple
      ? 'text-slate-600 hover:bg-purple-50 hover:text-purple-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  }
  if (active) {
    return isPurple ? 'text-purple-600' : 'text-blue-600';
  }
  return 'text-slate-500';
}

function iconChip(active: boolean, isPurple: boolean) {
  if (!active) return 'text-slate-500';
  return isPurple ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600';
}

export function CoursePlayerDesktopNav({ activeTab, onSelect, isPurple }: CoursePlayerNavigationProps) {
  return (
    <nav
      aria-label="Seções do curso"
      role="tablist"
      className="absolute left-1/2 top-1/2 z-10 hidden w-max max-w-[calc(100%-20rem)] -translate-x-1/2 -translate-y-1/2 md:block"
    >
      <div className="flex items-center gap-0.5 overflow-hidden rounded-full border border-slate-200/90 bg-white p-1 shadow-[0_4px_18px_rgba(15,23,42,0.06)] lg:gap-1 lg:p-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.id)}
              className={`inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-full px-1 py-2 text-[11px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset lg:gap-1.5 lg:px-3 lg:py-2.5 lg:text-[13px] xl:px-3.5 xl:text-sm ${
                isPurple ? 'focus-visible:ring-purple-500/40' : 'focus-visible:ring-blue-500/40'
              } ${itemTone(active, isPurple, 'desktop')}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function CoursePlayerMobileNav({ activeTab, onSelect, isPurple }: CoursePlayerNavigationProps) {
  return (
    <nav
      aria-label="Seções do curso"
      role="tablist"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] items-stretch border-t border-slate-200/80 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(15,23,42,0.04)] md:hidden"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 transition-colors duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset active:bg-slate-50 ${
              isPurple ? 'focus-visible:ring-purple-500/40' : 'focus-visible:ring-blue-500/40'
            } ${itemTone(active, isPurple, 'mobile')}`}
          >
            <span className={`flex h-7 w-11 items-center justify-center rounded-full ${iconChip(active, isPurple)}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="max-w-full truncate text-[10px] font-medium leading-none tracking-tight min-[400px]:text-[11px]">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
