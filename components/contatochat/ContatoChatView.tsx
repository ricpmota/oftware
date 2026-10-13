'use client';

import { useState } from 'react';
import { Bell, Lock, MessageCircle, UserPlus } from 'lucide-react';
import type { ContatoChatPublicData } from '@/lib/contatochat/getContatoChatData';
import PublicDoctorHero from '@/components/drprovisorio/PublicDoctorHero';
import PublicPageBrandFooter from '@/components/public/PublicPageBrandFooter';
import WhiteLabelFaviconEffect from '@/components/public/WhiteLabelFaviconEffect';
import ContatoChatNotice from './ContatoChatNotice';
import ContatoChatPurpose from './ContatoChatPurpose';

type Props = {
  data: ContatoChatPublicData;
};

export default function ContatoChatView({ data }: Props) {
  const [opened, setOpened] = useState(false);
  const drTheme = {
    backgroundColor: data.pageBg,
    textColor: data.pageText,
    logoUrl: data.logoUrl,
  };

  return (
    <div
      className="min-h-dvh bg-gray-50"
      style={{ ['--public-page-text' as string]: data.pageText }}
    >
      <WhiteLabelFaviconEffect faviconUrl={data.faviconUrl} cacheKey={data.medicoId} />

      <PublicDoctorHero
        nomeCompleto={data.displayName}
        medicoAvatarUrl={data.photoUrl}
        accentColor={data.accentColor}
        pageBg={data.pageBg}
        pageText={data.pageText}
        crmEstado={data.crmEstado || undefined}
        crmNumero={data.crmNumero || undefined}
        isVerificado={data.isVerificado}
        logoUrl={data.logoUrl}
      />

      <div className="relative z-10 mx-auto max-w-xl space-y-3 px-3 -mt-2 pb-10">
        <section className="drprov-rise relative overflow-hidden rounded-2xl border border-gray-100 bg-white px-4 py-5 text-center shadow-sm sm:px-5 sm:py-6">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl"
            style={{ background: data.accentColor }}
            aria-hidden
          />
          <div className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: data.pageBg }}>
            <Bell className="h-5 w-5" style={{ color: data.accentColor }} aria-hidden />
          </div>
          <h2 className="relative text-[20px] font-bold tracking-tight sm:text-[22px]">
            <span className="text-gray-900">Salve o </span>
            <span style={{ color: data.pageBg }}>Canal Chat</span>
          </h2>
          <p className="relative mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-gray-600">
            Canal oficial de notificações, novidades e atualizações do seu acompanhamento.
          </p>

          <div className="relative mx-auto mt-5 max-w-md rounded-2xl bg-gray-50 px-4 py-3.5 text-left">
            <p className="text-[15px] font-semibold text-gray-900">{data.contactName}</p>
            <p className="mt-0.5 text-[14px] tabular-nums text-gray-500">{data.phoneDisplay}</p>
          </div>

          <a
            href={data.vcardUrl}
            onClick={() => setOpened(true)}
            className="drprov-cta-shimmer relative mx-auto mt-5 flex h-[56px] w-full max-w-md items-center justify-center gap-2.5 rounded-2xl px-4 text-[15px] font-bold text-[#0A1F44] shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95 sm:h-[60px] sm:text-[16px]"
            style={{ backgroundColor: data.accentColor }}
          >
            <UserPlus className="h-5 w-5 shrink-0" aria-hidden />
            Adicionar aos contatos
          </a>

          {opened ? (
            <p className="relative mt-3 text-center text-[13px] leading-relaxed text-gray-500">
              <span className="font-medium text-gray-800">Contato aberto.</span> Finalize o salvamento na agenda do seu celular.
            </p>
          ) : null}

          <a
            href={data.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mx-auto mt-3 flex h-[52px] w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-[15px] font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            <MessageCircle className="h-5 w-5" style={{ color: data.accentColor }} aria-hidden />
            Abrir WhatsApp
          </a>
        </section>

        <ContatoChatPurpose pageBg={data.pageBg} />
        <ContatoChatNotice spokenName={data.spokenName} accentColor={data.accentColor} pageBg={data.pageBg} />

        <section
          className="drprov-rise rounded-2xl border px-4 py-4 shadow-sm sm:px-5"
          style={{ backgroundColor: `${data.pageBg}10`, borderColor: `${data.pageBg}22` }}
        >
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: data.pageBg, color: data.accentColor }}
            >
              <Lock className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14px] font-bold uppercase tracking-wide text-gray-900">
                Privacidade e segurança
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                Seus dados são tratados dentro do ambiente da plataforma para dar continuidade ao seu atendimento.
              </p>
            </div>
          </div>
        </section>

        <footer className="drprov-rise px-1 pb-2 pt-1">
          <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-gray-500">
            Este é o Canal Chat, canal oficial de notificações do acompanhamento. A comunicação do tratamento continua com o profissional responsável.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/metodo-emagrecer-logotipo-28.png"
              alt={data.organizationName}
              className="h-8 w-auto max-w-[240px] object-contain opacity-90 sm:h-9"
            />
            {data.showPoweredByOftware ? (
              <PublicPageBrandFooter theme={drTheme} brandName={data.displayName} />
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
