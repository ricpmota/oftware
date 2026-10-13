'use client';

import { useEffect, useState } from 'react';
import { MatchAchievementSelector } from '@/components/meta/match/achievements/MatchAchievementSelector';
import { MatchAgeRange } from '@/components/meta/match/flow/MatchAgeRange';
import { MatchPhotoPicker } from '@/components/meta/match/flow/MatchPhotoPicker';
import { MatchChoice, MatchChoiceWrap, MatchOptionCard, MatchSwitch } from '@/components/meta/match/flow/MatchChoice';
import { MatchProfileCard } from '@/components/meta/match/flow/MatchProfileCard';
import { MatchStepHeading } from '@/components/meta/match/flow/MatchFlowChrome';
import {
  MATCH_BIO_MAX,
  buildMatchViewerCard,
  toggleId,
  withShowMe,
  type MatchProfileDraft,
  type MatchSharing,
} from '@/lib/match/matchProfile';
import {
  INTEREST_CATEGORIES,
  MATCH_ACTIVITIES,
  MATCH_ACTIVITY_LEVELS,
  MATCH_CONNECTION_GOALS,
  MATCH_DAYS,
  MATCH_INTERESTS,
  MATCH_JOURNEY_PRESETS,
  MATCH_LOCATION_MODES,
  MATCH_MARITAL_STATUS_IDS,
  MATCH_PERIODS,
  MATCH_PLANNING_STYLES,
  MATCH_RADIUS_OPTIONS,
  MATCH_SHOW_ME,
  maritalStatusLabel,
  type MatchGrammaticalGender,
} from '@/lib/match/matchTaxonomy';

type StepProps = {
  draft: MatchProfileDraft;
  onChange: (draft: MatchProfileDraft) => void;
};

export function MatchStepIntro() {
  return (
    <MatchStepHeading
      title="Vamos criar seu perfil."
      subtitle="Isso enriquece seu perfil. Quanto mais você contar, mais coisas em comum o Match consegue mostrar."
      note="Você controla o que outras pessoas podem ver."
    />
  );
}

export function MatchStepMarital({
  draft,
  onChange,
  gender,
}: StepProps & { gender: MatchGrammaticalGender }) {
  return (
    <div>
      <MatchStepHeading title="Qual é o seu estado civil?" />
      <div className="grid gap-2">
        {MATCH_MARITAL_STATUS_IDS.map((id) => (
          <MatchOptionCard
            key={id}
            title={maritalStatusLabel(id, gender)}
            selected={draft.identity.maritalStatus === id}
            onClick={() =>
              onChange({
                ...draft,
                identity: { ...draft.identity, maritalStatus: id },
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

export function MatchStepIdentity({ draft, onChange }: StepProps) {
  const bio = draft.identity.bio || '';
  return (
    <div>
      <MatchStepHeading title="Como você quer aparecer?" />
      <label className="block text-sm font-semibold text-[#0A1F44]" htmlFor="match-display-name">
        Nome público
      </label>
      <input
        id="match-display-name"
        value={draft.identity.displayName}
        maxLength={40}
        onChange={(event) =>
          onChange({
            ...draft,
            identity: { ...draft.identity, displayName: event.target.value },
          })
        }
        className="mt-2 h-12 w-full rounded-2xl border border-[#E4E8F0] px-4 text-[15px] text-[#0A1F44] outline-none focus:border-[#4CCB7A]"
        autoComplete="given-name"
      />
      <label className="mt-5 block text-sm font-semibold text-[#0A1F44]" htmlFor="match-bio">
        Bio curta
      </label>
      <p className="mt-1 text-xs text-[#0A1F44]/55">Conte um pouco sobre você.</p>
      <textarea
        id="match-bio"
        value={bio}
        maxLength={MATCH_BIO_MAX}
        rows={4}
        placeholder="Praia, treino pela manhã, café sem pressa e viagens sempre que possível."
        onChange={(event) =>
          onChange({
            ...draft,
            identity: { ...draft.identity, bio: event.target.value },
          })
        }
        className="mt-2 w-full resize-none rounded-2xl border border-[#E4E8F0] px-4 py-3 text-[15px] leading-relaxed text-[#0A1F44] outline-none placeholder:text-[#0A1F44]/35 focus:border-[#4CCB7A]"
      />
      <p className="mt-1 text-right text-xs text-[#0A1F44]/45">
        {bio.length}/{MATCH_BIO_MAX}
      </p>
    </div>
  );
}

export function MatchStepPhotos({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading title="Mostre quem você é." subtitle="Adicione fotos escolhidas para o Match. Uma delas será a principal." />
      <MatchPhotoPicker
        photos={draft.photos}
        onChange={(photos) => onChange({ ...draft, photos })}
      />
    </div>
  );
}

export function MatchStepInterests({ draft, onChange }: StepProps) {
  const [category, setCategory] = useState<(typeof INTEREST_CATEGORIES)[number]['id']>('movement');
  const items = MATCH_INTERESTS.filter((item) => item.categories.includes(category));
  return (
    <div>
      <MatchStepHeading title="O que faz parte da sua vida?" subtitle="Escolha tudo que combina com você." />
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {INTEREST_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              category === item.id ? 'bg-[#0A1F44] text-white' : 'bg-[#F4F6F8] text-[#0A1F44]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <MatchChoiceWrap>
        {items.map((item) => (
          <MatchChoice
            key={item.id}
            label={item.label}
            selected={draft.interests.includes(item.id)}
            onClick={() => onChange({ ...draft, interests: toggleId(draft.interests, item.id) })}
          />
        ))}
      </MatchChoiceWrap>
    </div>
  );
}

export function MatchStepActivities({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading
        title="O que você gostaria de compartilhar com alguém?"
        subtitle="Uma coisa é gostar de um tema. Outra é querer viver isso com outras pessoas."
      />
      <MatchChoiceWrap>
        {MATCH_ACTIVITIES.map((item) => (
          <MatchChoice
            key={item.id}
            emoji={item.emoji}
            label={item.label}
            selected={draft.activities.includes(item.id)}
            onClick={() => onChange({ ...draft, activities: toggleId(draft.activities, item.id) })}
          />
        ))}
      </MatchChoiceWrap>
    </div>
  );
}

export function MatchStepConnections({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading title="Que tipo de conexão faz sentido para você?" />
      <div className="grid gap-2">
        {MATCH_CONNECTION_GOALS.map((item) => (
          <MatchOptionCard
            key={item.id}
            title={item.label}
            selected={draft.connectionGoals.includes(item.id)}
            onClick={() =>
              onChange({ ...draft, connectionGoals: toggleId(draft.connectionGoals, item.id) })
            }
          />
        ))}
      </div>
    </div>
  );
}

export function MatchStepRoutine({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading title="Quando você costuma ter tempo?" />
      <p className="mb-2 text-sm font-semibold text-[#0A1F44]">Dias</p>
      <div className="grid grid-cols-7 gap-1">
        {MATCH_DAYS.map((item) => {
          const selected = draft.availability.days.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange({
                  ...draft,
                  availability: { ...draft.availability, days: toggleId(draft.availability.days, item.id) },
                })
              }
              className={`h-10 rounded-full text-[13px] font-semibold ${
                selected
                  ? 'border border-[#4CCB7A] bg-[#E8F8EE] text-[#0A1F44]'
                  : 'border border-[#E4E8F0] bg-white text-[#0A1F44]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="mb-2 mt-5 text-sm font-semibold text-[#0A1F44]">Períodos</p>
      <MatchChoiceWrap>
        {MATCH_PERIODS.map((item) => (
          <MatchChoice
            key={item.id}
            label={item.label}
            selected={draft.availability.periods.includes(item.id)}
            onClick={() =>
              onChange({
                ...draft,
                availability: {
                  ...draft.availability,
                  periods: toggleId(draft.availability.periods, item.id),
                },
              })
            }
          />
        ))}
      </MatchChoiceWrap>
      <p className="mb-2 mt-5 text-sm font-semibold text-[#0A1F44]">Você prefere atividades...</p>
      <div className="grid gap-2">
        {MATCH_PLANNING_STYLES.map((item) => (
          <MatchOptionCard
            key={item.id}
            title={item.label}
            selected={draft.availability.planningStyle === item.id}
            onClick={() =>
              onChange({
                ...draft,
                availability: {
                  ...draft.availability,
                  planningStyle: item.id as MatchProfileDraft['availability']['planningStyle'],
                },
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

export function MatchStepPace({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading
        title="Qual combina mais com seu momento?"
        subtitle="É a sua percepção, no seu ritmo."
      />
      <div className="grid gap-2">
        {MATCH_ACTIVITY_LEVELS.map((item) => (
          <MatchOptionCard
            key={item.id}
            title={item.title}
            text={item.text}
            selected={draft.lifestyle.activityLevel === item.id}
            onClick={() =>
              onChange({
                ...draft,
                lifestyle: { activityLevel: item.id as MatchProfileDraft['lifestyle']['activityLevel'] },
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

export function MatchStepLocation({ draft, onChange }: StepProps) {
  const mode = draft.discoveryPreferences.locationMode;
  const showPlace = mode === 'my_city' || mode === 'nearby';
  return (
    <div>
      <MatchStepHeading
        title="Onde você quer criar conexões?"
        subtitle="Qualquer lugar mostra todos. Perto de mim usa a distância entre as cidades do cadastro."
      />
      <div className="grid gap-2">
        {MATCH_LOCATION_MODES.map((item) => (
          <MatchOptionCard
            key={item.id}
            title={item.label}
            selected={mode === item.id}
            onClick={() =>
              onChange({
                ...draft,
                discoveryPreferences: {
                  ...draft.discoveryPreferences,
                  locationMode: item.id as MatchProfileDraft['discoveryPreferences']['locationMode'],
                },
              })
            }
          />
        ))}
      </div>
      {showPlace ? (
        <div className="mt-4 grid grid-cols-[1fr_5.5rem] gap-2">
          <input
            aria-label="Cidade"
            placeholder="Cidade"
            value={draft.identity.city || ''}
            onChange={(event) =>
              onChange({ ...draft, identity: { ...draft.identity, city: event.target.value } })
            }
            className="h-12 rounded-2xl border border-[#E4E8F0] px-4 text-[15px] outline-none focus:border-[#4CCB7A]"
          />
          <input
            aria-label="Estado"
            placeholder="UF"
            maxLength={2}
            value={draft.identity.state || ''}
            onChange={(event) =>
              onChange({
                ...draft,
                identity: { ...draft.identity, state: event.target.value.toUpperCase() },
              })
            }
            className="h-12 rounded-2xl border border-[#E4E8F0] px-3 text-center text-[15px] uppercase outline-none focus:border-[#4CCB7A]"
          />
        </div>
      ) : null}
      {mode === 'nearby' ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Raio</p>
          <MatchChoiceWrap>
            {MATCH_RADIUS_OPTIONS.map((km) => (
              <MatchChoice
                key={km}
                label={`${km} km`}
                selected={draft.discoveryPreferences.radiusKm === km}
                onClick={() =>
                  onChange({
                    ...draft,
                    discoveryPreferences: { ...draft.discoveryPreferences, radiusKm: km },
                  })
                }
              />
            ))}
          </MatchChoiceWrap>
        </div>
      ) : null}
    </div>
  );
}

export function MatchStepJourney({ draft, onChange }: StepProps) {
  const enabled = draft.sharing.showJourney;
  function setSharing(partial: Partial<MatchSharing>) {
    onChange({ ...draft, sharing: { ...draft.sharing, ...partial } });
  }
  function toggleHighlight(id: string) {
    const exists = draft.journeyHighlights.some((item) => item.id === id);
    const preset = MATCH_JOURNEY_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    onChange({
      ...draft,
      journeyHighlights: exists
        ? draft.journeyHighlights.filter((item) => item.id !== id)
        : [
            ...draft.journeyHighlights,
            {
              id: preset.id,
              type: preset.type,
              label: preset.label,
              visibility: 'public',
              createdAt: new Date().toISOString(),
            },
          ],
    });
  }
  return (
    <div>
      <MatchStepHeading
        title="Sua jornada é sua."
        subtitle="Você decide se quer compartilhar alguma conquista com a comunidade."
        note="Suas informações médicas continuam privadas."
      />
      <MatchSwitch
        label="Mostrar minha jornada no Match"
        checked={enabled}
        onChange={(checked) => setSharing({ showJourney: checked })}
      />
      {enabled ? (
        <div className="mt-4 grid gap-2">
          {MATCH_JOURNEY_PRESETS.map((item) => (
            <MatchOptionCard
              key={item.id}
              title={item.label}
              selected={draft.journeyHighlights.some((highlight) => highlight.id === item.id)}
              onClick={() => toggleHighlight(item.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MatchStepPrivacy({
  draft,
  onChange,
  phoneDigits,
  hideAvailability = false,
}: StepProps & { phoneDigits?: string; hideAvailability?: boolean }) {
  function setSharing(partial: Partial<MatchSharing>) {
    onChange({ ...draft, sharing: { ...draft.sharing, ...partial } });
  }

  function setPhoneVisible(checked: boolean) {
    const phone = checked ? draft.contact.phone || phoneDigits : undefined;
    onChange({
      ...draft,
      sharing: { ...draft.sharing, showPhone: checked },
      contact: {
        ...draft.contact,
        ...(phone ? { phone } : { phone: undefined }),
      },
    });
  }

  function setHandle(field: 'instagram' | 'tiktok', value: string) {
    onChange({
      ...draft,
      contact: {
        ...draft.contact,
        [field]: value,
      },
    });
  }

  const hasPhone = Boolean(draft.contact.phone || phoneDigits);

  return (
    <div>
      <MatchStepHeading
        title="Você está no controle."
        subtitle="Dados médicos não entram nesta lista. Eles permanecem privados."
      />
      <div className="grid gap-2">
        <MatchSwitch label="Mostrar minha idade" checked={draft.sharing.showAge} onChange={(checked) => setSharing({ showAge: checked })} />
        <MatchSwitch label="Mostrar minha cidade" checked={draft.sharing.showCity} onChange={(checked) => setSharing({ showCity: checked })} />
        <MatchSwitch
          label="Mostrar meu telefone"
          hint={
            hasPhone
              ? 'Com esta opção ativa, o ícone do WhatsApp aparece no perfil para abrir a conversa.'
              : 'Não há telefone no cadastro para abrir o WhatsApp.'
          }
          checked={draft.sharing.showPhone}
          onChange={setPhoneVisible}
        />
        <label className="block rounded-2xl border border-[#E4E8F0] bg-white px-4 py-3">
          <span className="text-sm font-semibold text-[#0A1F44]">Instagram</span>
          <input
            value={draft.contact.instagram || ''}
            onChange={(event) => setHandle('instagram', event.target.value)}
            placeholder="Nome do perfil"
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 h-10 w-full bg-transparent text-[15px] text-[#0A1F44] outline-none placeholder:text-[#0A1F44]/35"
          />
        </label>
        <label className="block rounded-2xl border border-[#E4E8F0] bg-white px-4 py-3">
          <span className="text-sm font-semibold text-[#0A1F44]">TikTok</span>
          <input
            value={draft.contact.tiktok || ''}
            onChange={(event) => setHandle('tiktok', event.target.value)}
            placeholder="Nome do perfil"
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 h-10 w-full bg-transparent text-[15px] text-[#0A1F44] outline-none placeholder:text-[#0A1F44]/35"
          />
        </label>
        <MatchSwitch
          label="Mostrar distância aproximada"
          hint="Fica desligada até existir geolocalização."
          checked={draft.sharing.showDistance}
          onChange={(checked) => setSharing({ showDistance: checked })}
        />
        <MatchSwitch label="Mostrar meus interesses" checked={draft.sharing.showInterests} onChange={(checked) => setSharing({ showInterests: checked })} />
        {hideAvailability ? null : (
          <MatchSwitch label="Mostrar minha disponibilidade" checked={draft.sharing.showAvailability} onChange={(checked) => setSharing({ showAvailability: checked })} />
        )}
        <MatchSwitch label="Mostrar minha jornada" checked={draft.sharing.showJourney} onChange={(checked) => setSharing({ showJourney: checked })} />
      </div>
    </div>
  );
}

export function MatchStepDiscovery({ draft, onChange }: StepProps) {
  const discovery = draft.discoveryPreferences;
  useEffect(() => {
    if (discovery.ageMin != null && discovery.ageMax != null) return;
    onChange({
      ...draft,
      discoveryPreferences: {
        ...discovery,
        ageMin: discovery.ageMin ?? 25,
        ageMax: discovery.ageMax ?? 45,
      },
    });
    // Preenche a linha uma vez, no valor que a pessoa já vê.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <MatchStepHeading title="Quem você gostaria de encontrar?" subtitle="Isso ajuda a preparar o Match. Não define quem você é." />
      <p className="mb-2 text-sm font-semibold">Faixa etária de quem você quer encontrar</p>
      <MatchAgeRange
        min={discovery.ageMin ?? 25}
        max={discovery.ageMax ?? 45}
        onChange={(ageMin, ageMax) =>
          onChange({
            ...draft,
            discoveryPreferences: { ...discovery, ageMin, ageMax },
          })
        }
      />
      <p className="mb-2 mt-5 text-sm font-semibold">Quem você gostaria de conhecer?</p>
      <MatchChoiceWrap>
        {MATCH_SHOW_ME.map((item) => (
          <MatchChoice
            key={item.id}
            label={item.label}
            selected={discovery.showMe.includes(item.id)}
            onClick={() =>
              onChange({
                ...draft,
                discoveryPreferences: { ...discovery, showMe: withShowMe(discovery.showMe, item.id) },
              })
            }
          />
        ))}
      </MatchChoiceWrap>
      <p className="mb-2 mt-5 text-sm font-semibold">Tipos de conexão desejados</p>
      <MatchChoiceWrap>
        {MATCH_CONNECTION_GOALS.map((item) => (
          <MatchChoice
            key={item.id}
            label={item.label}
            selected={discovery.connectionGoals.includes(item.id)}
            onClick={() =>
              onChange({
                ...draft,
                discoveryPreferences: {
                  ...discovery,
                  connectionGoals: toggleId(discovery.connectionGoals, item.id),
                },
              })
            }
          />
        ))}
      </MatchChoiceWrap>
      <div className="mt-4">
        <MatchSwitch
          label="Atividades em comum"
          checked={discovery.preferSharedActivities}
          onChange={(checked) =>
            onChange({
              ...draft,
              discoveryPreferences: { ...discovery, preferSharedActivities: checked },
            })
          }
        />
      </div>
    </div>
  );
}

export function MatchStepAchievements({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading
        title="Do que você já se orgulha?"
        subtitle="Escolha conquistas que fazem parte da sua história."
        note="Esta etapa é opcional. O Match Saudável não exige medalha."
      />
      <MatchAchievementSelector mode="achievement" draft={draft} onChange={onChange} />
    </div>
  );
}

export function MatchStepGoals({ draft, onChange }: StepProps) {
  return (
    <div>
      <MatchStepHeading
        title="Qual é sua próxima conquista?"
        subtitle="Escolha algo que você gostaria de alcançar."
      />
      <MatchAchievementSelector mode="goal" draft={draft} onChange={onChange} />
    </div>
  );
}

export function MatchStepPreview({ draft }: { draft: MatchProfileDraft }) {
  const card = buildMatchViewerCard(draft, new Date(), 'owner');
  return (
    <div>
      <MatchStepHeading title="Esse é você no Match Saudável." />
      <MatchProfileCard card={card} showConnectionPreview />
    </div>
  );
}
