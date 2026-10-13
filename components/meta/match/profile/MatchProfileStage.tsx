'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { MatchProfileIcon } from '@/components/meta/match/icons/MatchProfileIcon';
import { getMatchProfileIcon } from '@/components/meta/match/icons/matchProfileIcons';
import { MatchAchievementModal } from '@/components/meta/match/achievements/MatchAchievementModal';
import { MatchAchievementsSection } from '@/components/meta/match/achievements/MatchAchievementsSection';
import { MatchGoalsSection } from '@/components/meta/match/achievements/MatchGoalsSection';
import { MatchContactLinks } from '@/components/meta/match/profile/MatchContactLinks';
import { MatchProfileNavigationDock } from '@/components/meta/match/profile/navigation/MatchProfileNavigationDock';
import { MatchProfileSectionPanel } from '@/components/meta/match/profile/navigation/MatchProfileSectionPanel';
import {
  MATCH_PROFILE_NAVIGATION_ICONS,
  MATCH_PROFILE_NAVIGATION_ORDER,
  type MatchProfileNavigationIconId,
} from '@/components/meta/match/profile/navigation/matchProfileNavigationIcons';
import { maritalStatusLabel, type MatchGrammaticalGender } from '@/lib/match/matchTaxonomy';
import type { MatchAchievementView, MatchGoalView, MatchViewerCard } from '@/lib/match/matchProfile';

function useSocialIconLimit() {
  const [limit, setLimit] = useState(5);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setLimit(query.matches ? 6 : 5);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return limit;
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-white/55">Nada compartilhado nesta parte.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-[#4CCB7A]/18 px-3 py-1.5 text-sm font-medium text-[#D9FFE8]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function MatchProfileStage({
  card,
  onBack,
  editHref = '/meta/match/profile/edit',
  grammaticalGender = 'u',
  isOwner = false,
  mode = 'self',
  lead,
  action,
  overlay = null,
  onDismissOverlay,
  onPrevious,
  onNext,
}: {
  card: MatchViewerCard;
  onBack: () => void;
  editHref?: string;
  grammaticalGender?: MatchGrammaticalGender;
  isOwner?: boolean;
  mode?: 'self' | 'discovery' | 'connection' | 'incoming-request';
  lead?: ReactNode;
  action?: ReactNode;
  overlay?: { key: string; title: string; body: ReactNode } | null;
  onDismissOverlay?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [navSection, setNavSection] = useState<MatchProfileNavigationIconId | null>(null);
  const [openAchievement, setOpenAchievement] = useState<MatchAchievementView | null>(null);
  const [openGoal, setOpenGoal] = useState<MatchGoalView | null>(null);
  const reducedMotion = useReducedMotion();
  const socialLimit = useSocialIconLimit();
  const visibleSocialIcons = card.socialIcons.slice(0, socialLimit);
  const hiddenSocialCount = Math.max(0, card.socialIcons.length - visibleSocialIcons.length);
  const photos = card.primaryPhoto
    ? [card.primaryPhoto, ...card.photos.filter((photo) => photo.id !== card.primaryPhoto?.id)]
    : card.photos;
  const showConquistas = isOwner || card.achievements.length > 0 || card.goals.length > 0;
  const navigationItems = MATCH_PROFILE_NAVIGATION_ORDER.filter((id) => {
    if (id === 'live' || id === 'routine') return false;
    if (id === 'journey') return card.highlights.length > 0;
    if (id === 'achievements') return showConquistas;
    if (!isOwner && id === 'about') return Boolean(card.bio || card.maritalStatus);
    if (!isOwner && id === 'interests') return card.interests.length > 0;
    if (!isOwner && id === 'connection') return card.connectionGoals.length > 0;
    return true;
  });

  const actionsOverPhoto = mode === 'discovery' || mode === 'incoming-request';
  const overlayKey = overlay?.key ?? null;
  useEffect(() => {
    if (overlayKey) setNavSection(null);
  }, [overlayKey]);

  useEffect(() => {
    if (!navSection && !overlay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavSection(null);
        onDismissOverlay?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navSection, overlay, onDismissOverlay]);

  const selectSection = (id: MatchProfileNavigationIconId) => {
    onDismissOverlay?.();
    setNavSection((current) => (current === id ? null : id));
  };
  const section = navSection;
  const panelTitle = section ? MATCH_PROFILE_NAVIGATION_ICONS[section].label : overlay?.title || '';
  const panelKey = section || overlay?.key || null;

  return (
    <div className="h-full overflow-hidden bg-[#0A1F44] text-white">
      <div className="relative mx-auto h-full w-full max-w-[480px] overflow-hidden bg-black">
        {photos.length ? (
          <div className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {photos.map((photo) => (
              <div key={photo.id} className="h-full w-full shrink-0 snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A1F44] text-7xl font-extrabold text-white/20">
            {card.displayName.slice(0, 1).toUpperCase() || 'M'}
          </div>
        )}

        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          {mode === 'self' ? (
            <Link
              href={editHref}
              className="rounded-full bg-black/25 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm"
            >
              Editar
            </Link>
          ) : (
            <span className="h-11 w-11" />
          )}
        </header>

        {onPrevious ? (
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Pessoa anterior"
            className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            aria-label="Próxima pessoa"
            className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : null}

        <AnimatePresence>
          {navSection || overlay ? (
            <motion.button
              type="button"
              aria-label="Fechar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className="absolute inset-0 z-10 bg-[#020610]/75 backdrop-blur-sm"
              onClick={() => {
                setNavSection(null);
                onDismissOverlay?.();
              }}
            />
          ) : null}
        </AnimatePresence>

        <section className="absolute inset-x-0 bottom-0 z-20 flex max-h-[78dvh] flex-col justify-end">
          {actionsOverPhoto ? action : null}
          <div
            className={`relative shrink-0 bg-gradient-to-t from-[#0A1F44] to-transparent ${
              visibleSocialIcons.length || card.photoMedals.length
                ? 'flex flex-col gap-1.5 px-4 pb-1 pt-8'
                : 'h-12'
            }`}
          >
            {visibleSocialIcons.length ? (
              <div className="flex items-center gap-1.5">
                {visibleSocialIcons.map((id) => (
                  <span
                    key={id}
                    title={getMatchProfileIcon(id)?.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-[0_4px_10px_-8px_rgba(10,31,68,0.55)] md:h-12 md:w-12"
                  >
                    <MatchProfileIcon icon={id} size={34} decorative={false} />
                  </span>
                ))}
                {hiddenSocialCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => selectSection('interests')}
                    title="Mais interesses"
                    className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/90 px-2 text-xs font-extrabold text-[#0A1F44] shadow-[0_4px_10px_-8px_rgba(10,31,68,0.55)] md:h-12 md:min-w-12"
                    aria-label={`Mais ${hiddenSocialCount} interesses`}
                  >
                    +{hiddenSocialCount}
                  </button>
                ) : null}
              </div>
            ) : null}
            {card.photoMedals.length ? (
              <div className="flex items-end gap-1.5">
                {card.photoMedals.map((medal) => (
                  <MatchAchievementBadge
                    key={medal.recordId}
                    achievementId={medal.achievementId}
                    size={40}
                    verified={medal.verified}
                    onClick={() => {
                      setOpenGoal(null);
                      setOpenAchievement(medal);
                    }}
                  />
                ))}
                {card.photoMedalExtra > 0 ? (
                  <button
                    type="button"
                    onClick={() => selectSection('achievements')}
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-white/40 bg-[#0A1F44]/70 px-2 text-xs font-extrabold text-white backdrop-blur-sm"
                    aria-label={`Mais ${card.photoMedalExtra} conquistas`}
                  >
                    +{card.photoMedalExtra}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="bg-[#0A1F44] px-4 pb-2">
            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[1.7rem] font-extrabold leading-none tracking-tight">
              <span>
                {card.displayName || 'Seu nome'}
                {card.age != null ? <span className="font-semibold text-white/80">, {card.age}</span> : null}
              </span>
              <MatchContactLinks
                whatsappUrl={card.whatsappUrl}
                instagramUrl={card.instagramUrl}
                tiktokUrl={card.tiktokUrl}
              />
            </h1>
            {card.cityLine ? <p className="mt-1 text-sm text-[#4CCB7A]">{card.cityLine}</p> : null}
            {lead}
          </div>

          <MatchProfileSectionPanel
            open={Boolean(panelKey)}
            sectionKey={panelKey}
            labelledBy="match-profile-section-title"
          >
            <h2 id="match-profile-section-title" className="sr-only">
              {panelTitle}
            </h2>
            {section === 'achievements' ? (
              <div className="space-y-5">
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Conquistas</h2>
                  <MatchAchievementsSection
                    items={card.achievements}
                    isOwner={isOwner}
                    onOpen={(item) => {
                      setOpenGoal(null);
                      setOpenAchievement(item);
                    }}
                  />
                </div>
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Próximos objetivos
                  </h2>
                  <MatchGoalsSection
                    items={card.goals}
                    isOwner={isOwner}
                    onOpen={(item) => {
                      setOpenAchievement(null);
                      setOpenGoal(item);
                    }}
                  />
                </div>
              </div>
            ) : null}
            {section === 'about' ? (
              <div className="space-y-2">
                {card.maritalStatus ? (
                  <p className="text-sm font-semibold text-[#4CCB7A]">
                    {maritalStatusLabel(card.maritalStatus, grammaticalGender)}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/90">
                  {card.bio || 'Sua bio aparece aqui.'}
                </p>
              </div>
            ) : null}
            {section === 'interests' ? <ChipList items={card.interests} /> : null}
            {section === 'connection' ? <ChipList items={card.connectionGoals} /> : null}
            {section === 'journey' ? <ChipList items={card.highlights} /> : null}
            {!section && overlay ? overlay.body : null}
          </MatchProfileSectionPanel>

          {actionsOverPhoto ? null : action}

          {navigationItems.length ? (
            <MatchProfileNavigationDock items={navigationItems} activeId={section} onSelect={selectSection} />
          ) : null}
        </section>
        <MatchAchievementModal
          displayName={card.displayName}
          achievement={openAchievement}
          goal={openGoal}
          onClose={() => {
            setOpenAchievement(null);
            setOpenGoal(null);
          }}
        />
      </div>
    </div>
  );
}
