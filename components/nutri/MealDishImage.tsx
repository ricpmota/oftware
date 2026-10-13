'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  mealDishImageAlt,
  mealDishImageInstanceKey,
  mealDishImageMode,
  mealDishImageUrlCacheKey,
  shouldFetchMealDishImageUrl,
} from '@/lib/nutri/mealImageDisplay';
import type { MealImageRecord } from '@/lib/nutri/mealImageSource';
import {
  fetchMealDishImageUrl,
  peekMealDishImageUrlCache,
} from '@/lib/nutri/mealImageUrlClient';
import type { MealDishGenerateKind } from '@/lib/nutri/mealImageGenerateEligibility';
import {
  MEAL_DISH_REGENERATE_LABEL,
  MEAL_DISH_REGENERATE_TITLE,
} from '@/lib/nutri/mealImageGenerateEligibility';

const FRAME_CLASS =
  'group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border sm:h-[88px] sm:w-[88px] lg:h-24 lg:w-24';

export type MealDishImageProps = {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  mealName: string;
  mealImage?: MealImageRecord | null;
  currentSourceHash: string;
  accentColor: string;
  PlaceholderIcon: LucideIcon;
  canGenerate?: boolean;
  isGenerating?: boolean;
  generateKind?: MealDishGenerateKind | null;
  generateLabel?: string;
  onGenerate?: () => void;
  canRegenerate?: boolean;
  isRegenerating?: boolean;
  onRegenerate?: () => void;
  onPreview?: (imageUrl: string) => void;
};

function Frame({
  accentColor,
  children,
  className = '',
}: {
  accentColor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${FRAME_CLASS} ${className}`}
      style={{
        borderColor: `${accentColor}40`,
        backgroundColor: `${accentColor}18`,
      }}
    >
      {children}
    </div>
  );
}

function RegenerateButton({
  disabled,
  onRegenerate,
}: {
  disabled: boolean;
  onRegenerate: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={MEAL_DISH_REGENERATE_LABEL}
      title={MEAL_DISH_REGENERATE_TITLE}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        onRegenerate();
      }}
      className="absolute bottom-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm ring-1 ring-black/10 opacity-100 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

export default function MealDishImage({
  patientId,
  refeicaoKey,
  slotId,
  mealName,
  mealImage,
  currentSourceHash,
  accentColor,
  PlaceholderIcon,
  canGenerate = false,
  isGenerating = false,
  generateKind = null,
  generateLabel = 'Gerar imagem do prato',
  onGenerate,
  canRegenerate = false,
  isRegenerating = false,
  onRegenerate,
  onPreview,
}: MealDishImageProps) {
  const shouldFetch = shouldFetchMealDishImageUrl({ mealImage, currentSourceHash });
  const cacheKey = mealDishImageUrlCacheKey({
    patientId,
    refeicaoKey,
    slotId,
    sourceHash: currentSourceHash,
    gcsPath: mealImage?.gcsPath,
    generatedAt: mealImage?.generatedAt,
  });
  const instanceKey = mealDishImageInstanceKey({
    patientId,
    refeicaoKey,
    slotId,
    gcsPath: mealImage?.gcsPath,
    generatedAt: mealImage?.generatedAt,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(() =>
    shouldFetch ? peekMealDishImageUrlCache(cacheKey) || null : null
  );
  const [loading, setLoading] = useState<boolean>(shouldFetch && !imageUrl);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (!shouldFetch) {
      setImageUrl(null);
      setLoading(false);
      return;
    }
    const cached = peekMealDishImageUrlCache(cacheKey);
    if (cached) {
      setImageUrl(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const controller = new AbortController();
    fetchMealDishImageUrl(
      {
        patientId,
        refeicaoKey,
        slotId,
        sourceHash: currentSourceHash,
        gcsPath: mealImage?.gcsPath,
        generatedAt: mealImage?.generatedAt,
      },
      {
        getToken: async () => (await auth.currentUser?.getIdToken()) || null,
        signal: controller.signal,
      }
    )
      .then((url) => {
        if (cancelled) return;
        setImageUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    cacheKey,
    currentSourceHash,
    mealImage?.gcsPath,
    mealImage?.generatedAt,
    patientId,
    refeicaoKey,
    shouldFetch,
    slotId,
  ]);

  const displayUrl = broken ? null : imageUrl;
  const mode = mealDishImageMode({
    mealImage,
    currentSourceHash,
    imageUrl: displayUrl,
    loading,
  });
  const alt = mealDishImageAlt(mealName);
  const busy = isGenerating || isRegenerating || mode === 'loading';
  const ActionIcon = generateKind === 'update' ? RefreshCw : ImagePlus;
  const showRegenerate = Boolean(canRegenerate && onRegenerate);
  const regenerating = isGenerating || isRegenerating;

  if (mode === 'photo' && displayUrl) {
    return (
      <Frame accentColor={accentColor} className="bg-white">
        <button
          type="button"
          aria-label={`Ver ${mealName} em tamanho maior`}
          title="Ver imagem, itens e observação"
          disabled={regenerating}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (regenerating) return;
            onPreview?.(displayUrl);
          }}
          className="absolute inset-0 z-0 cursor-zoom-in disabled:cursor-default"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={instanceKey}
            src={displayUrl}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        </button>
        {regenerating ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/25">
            <span className="sr-only">Gerando nova imagem ilustrativa da refeição</span>
            <RefreshCw className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
          </div>
        ) : null}
        {showRegenerate && onRegenerate ? (
          <RegenerateButton disabled={regenerating} onRegenerate={onRegenerate} />
        ) : null}
      </Frame>
    );
  }

  if (busy && !showRegenerate) {
    return (
      <Frame accentColor={accentColor} className="animate-pulse">
        <span className="sr-only">
          {regenerating
            ? 'Gerando imagem ilustrativa da refeição'
            : 'Carregando imagem ilustrativa da refeição'}
        </span>
        <div className="h-full w-full" aria-busy="true" />
      </Frame>
    );
  }

  if (canGenerate && onGenerate) {
    return (
      <Frame accentColor={accentColor}>
        <button
          type="button"
          aria-label={generateLabel}
          title={generateLabel}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onGenerate();
          }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: accentColor }}
        >
          <PlaceholderIcon className="h-7 w-7 opacity-25 sm:h-8 sm:w-8" aria-hidden="true" />
          <ActionIcon className="absolute h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </button>
      </Frame>
    );
  }

  return (
    <Frame accentColor={accentColor}>
      {busy ? (
        <div className="absolute inset-0 animate-pulse" aria-busy="true">
          <span className="sr-only">Gerando nova imagem ilustrativa da refeição</span>
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ color: accentColor }}
          aria-hidden="true"
        >
          <PlaceholderIcon className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
      )}
      {showRegenerate && onRegenerate ? (
        <RegenerateButton disabled={regenerating} onRegenerate={onRegenerate} />
      ) : null}
    </Frame>
  );
}
