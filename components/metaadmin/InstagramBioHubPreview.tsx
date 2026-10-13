'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import {
  ACCENT_STYLES,
  type InstagramFounderItem,
  type InstagramProfileItem,
} from '@/components/instagram/instagramHubData';
import { resolveInstagramHubIcon } from '@/components/instagram/resolveInstagramHubIcon';
import { buildInstagramWhiteLabelHub } from '@/lib/instagram/buildInstagramWhiteLabelHub';
import { instagramBioFormToPayload } from '@/lib/instagram/instagramBioConfig';
import type { InstagramHubMedicoPublic } from '@/lib/instagram/instagramWhiteLabelTypes';
import type { MedicoInstagramBioFormState } from '@/types/medicoInstagramBio';

type Props = {
  form: MedicoInstagramBioFormState;
  medicoNome: string;
  medicoGenero?: 'M' | 'F';
  medicoEmail?: string;
  defaultTelefone?: string;
  fotoPerfilUrl?: string | null;
  whiteLabelDrPageLogoUrl?: string | null;
  whiteLabelPublicPageLogoUrl?: string | null;
};

function PreviewProfileButton({ item }: { item: InstagramProfileItem }) {
  const styles = ACCENT_STYLES[item.accent];
  const Icon = resolveInstagramHubIcon(item.iconKey);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 backdrop-blur-md ${styles.glow}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left text-[13px] font-semibold tracking-tight text-white">
          {item.title}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-50 ${styles.iconText}`} aria-hidden />
      </div>
    </div>
  );
}

function PreviewFounderButton({ item }: { item: InstagramFounderItem }) {
  return (
    <div className="relative mt-0.5">
      <div
        className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-emerald-400/50 via-cyan-400/40 to-emerald-400/50 opacity-70 blur-[0.5px]"
        aria-hidden
      />
      <div className="relative w-full overflow-hidden rounded-xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/[0.12] via-white/[0.06] to-cyan-500/[0.08] px-3 py-2.5 backdrop-blur-md shadow-[0_0_20px_rgba(74,222,128,0.15)]">
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-base leading-none"
            aria-hidden
          >
            💬
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[13px] font-semibold tracking-tight text-white">{item.title}</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-slate-300/85 line-clamp-2">
              {item.description}
            </span>
          </span>
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export default function InstagramBioHubPreview({
  form,
  medicoNome,
  medicoGenero,
  medicoEmail = '',
  defaultTelefone,
  fotoPerfilUrl,
  whiteLabelDrPageLogoUrl,
  whiteLabelPublicPageLogoUrl,
}: Props) {
  const previewMedico: InstagramHubMedicoPublic = {
    id: 'preview',
    nome: medicoNome,
    genero: medicoGenero,
    email: medicoEmail.trim().toLowerCase(),
    telefone: defaultTelefone?.trim() || null,
    fotoPerfilUrl: fotoPerfilUrl?.trim() || null,
    crm: { estado: 'PB', numero: '00000' },
    instagramBio: { ...instagramBioFormToPayload(form), enabled: form.enabled },
    whiteLabel: {
      drPageLogoUrl: whiteLabelDrPageLogoUrl?.trim() || undefined,
      publicPageLogoUrl: whiteLabelPublicPageLogoUrl?.trim() || undefined,
    },
  };

  const config = buildInstagramWhiteLabelHub(previewMedico);
  const { copy, profiles, founder, logoSrc, logoVariant, logoAlt, footerText } = config;

  const logoClassName =
    logoVariant === 'avatar'
      ? 'mx-auto mb-1.5 h-14 w-14 rounded-full border border-white/20 object-cover shadow-[0_0_16px_rgba(74,222,128,0.12)]'
      : logoVariant === 'custom'
        ? 'mx-auto mb-1.5 h-8 w-auto max-w-[120px] object-contain'
        : 'mx-auto mb-1.5 h-5 w-auto object-contain';

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950/50 p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Prévia do Link da Bio</p>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Simulação visual — atualiza conforme você edita os campos abaixo.
      </p>

      <div className="mx-auto max-w-[280px]">
        <div className="rounded-[2rem] border-[6px] border-gray-800 dark:border-gray-700 bg-gray-900 p-2 shadow-xl">
          <div className="overflow-hidden rounded-[1.35rem] bg-[#060d1f] text-white">
            <div className="pointer-events-none relative max-h-[520px] overflow-y-auto px-3 py-4">
              <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-[60px]" />
              <div className="pointer-events-none absolute -right-8 top-1/3 h-28 w-28 rounded-full bg-blue-500/10 blur-[70px]" />

              <header className="relative mb-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={logoAlt} className={logoClassName} />
                <h3 className="mt-2 text-[11px] font-bold leading-snug tracking-tight text-white">
                  {copy.headline}
                </h3>
                <p className="mx-auto mt-1 max-w-[240px] text-[9px] leading-relaxed text-slate-400">
                  {copy.subtitle}
                </p>
                <p className="mt-2 text-[10px] font-semibold text-slate-200">{copy.profilePrompt}</p>
              </header>

              <div className="relative flex flex-col gap-2" aria-hidden>
                {profiles.map((profile) => (
                  <PreviewProfileButton key={profile.id} item={profile} />
                ))}
                {founder ? <PreviewFounderButton item={founder} /> : null}
              </div>

              <footer className="relative mt-3 text-center text-[8px] text-slate-500">{footerText}</footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
