'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import ChatIA from '@/components/ChatIA';
import RafaelaIndicadoresSection from '@/components/rafaela-albuquerque/RafaelaIndicadoresSection';
import RafaelaAreasCalendarioSection from '@/components/rafaela-albuquerque/RafaelaAreasCalendarioSection';
import { BRAND, mailtoHref, rafaelaInstagramPermalink, scheduleHref, whatsappHref } from '@/rafaela-albuquerque/siteConfig';
import RafaelaSobreMedia from '@/components/rafaela-albuquerque/RafaelaSobreMedia';
import * as copy from '@/rafaela-albuquerque/landingCopy';
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Scale,
  Users,
  ScrollText,
  Shield,
  Sparkles,
} from 'lucide-react';

const MIN_SPLASH_MS = 700;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const BTN_HERO_PRIMARY =
  'transition-all duration-200 ease-out will-change-transform hover:scale-[1.02] hover:shadow-xl hover:shadow-[#4099B3]/40 active:scale-[0.98]';
const BTN_HERO_OUTLINE =
  'transition-all duration-200 ease-out will-change-transform hover:scale-[1.02] hover:shadow-xl hover:shadow-white/20 active:scale-[0.98]';
const BTN_HEADER =
  'transition-all duration-200 ease-out will-change-transform hover:scale-[1.02] hover:shadow-lg hover:shadow-[#4099B3]/35 active:scale-[0.98]';
const BTN_CTA_LIGHT =
  'transition-all duration-200 ease-out will-change-transform hover:scale-[1.02] hover:shadow-xl hover:shadow-black/15 active:scale-[0.98]';
const BTN_CTA_OUTLINE =
  'transition-all duration-200 ease-out will-change-transform hover:scale-[1.02] hover:shadow-xl hover:shadow-white/25 active:scale-[0.98]';
const CARD_HOVER =
  'transition-all duration-200 ease-out will-change-transform hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none motion-reduce:hover:translate-y-0';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function openExternal(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer');
}

export default function RafaelaAlbuquerquePage() {
  const [showSplash, setShowSplash] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const t = window.setTimeout(() => setShowSplash(false), MIN_SPLASH_MS);
    return () => window.clearTimeout(t);
  }, []);

  const wa = whatsappHref();
  const schedule = scheduleHref();
  const mail = mailtoHref();
  const instagramPermalink = rafaelaInstagramPermalink();

  const onAgendar = () => {
    if (schedule) openExternal(schedule);
    else if (mail) openExternal(mail);
    else scrollToId('contato');
  };

  const onWhatsApp = () => {
    openExternal(wa);
  };

  if (showSplash) {
    return (
      <InitialLoadingSplash
        backgroundColor={BRAND.heroBgFrom}
        logoSrc={BRAND.logoPath}
        loadingTextClassName="text-[#EAF5F8]"
      />
    );
  }

  const scrollSection = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-40px 0px' as const },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-[20%] -left-[15%] h-[min(55vw,28rem)] w-[min(55vw,28rem)] rounded-full opacity-[0.07] blur-3xl"
          style={{ background: `radial-gradient(circle at center, ${BRAND.primary} 0%, transparent 68%)` }}
        />
        <div
          className="absolute top-[45%] -right-[10%] h-[min(50vw,24rem)] w-[min(50vw,24rem)] rounded-full opacity-[0.06] blur-3xl"
          style={{ background: `radial-gradient(circle at center, ${BRAND.primarySoft} 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-[25%] h-[min(60vw,26rem)] w-[min(60vw,26rem)] rounded-full opacity-[0.05] blur-3xl"
          style={{ background: `radial-gradient(circle at center, ${BRAND.heroBgVia} 0%, transparent 72%)` }}
        />
      </div>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-md shadow-sm"
        style={{ borderColor: BRAND.border }}
      >
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-w-0">
          <Link href="/rafaelaalbuquerque" className="flex items-center gap-3 shrink-0">
            <img src={BRAND.logoPath} alt={BRAND.name} className="h-9 md:h-11 w-auto object-contain" />
            <div className="hidden sm:block min-w-0">
              <p className="text-sm md:text-base font-semibold leading-tight truncate" style={{ color: BRAND.textStrong }}>
                {BRAND.name}
              </p>
              <p className="text-xs truncate" style={{ color: BRAND.textMuted }}>
                {BRAND.tagline}
              </p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium transition-colors" style={{ color: BRAND.text }}>
            <button type="button" onClick={() => scrollToId('areas')} className="hover:text-[#4099B3] transition-colors">
              Áreas
            </button>
            <button type="button" onClick={() => scrollToId('sobre-advogada')} className="hover:text-[#4099B3] transition-colors">
              Sobre
            </button>
            <button type="button" onClick={() => scrollToId('diferenciais')} className="hover:text-[#4099B3] transition-colors">
              Princípios
            </button>
            <button type="button" onClick={() => scrollToId('processo')} className="hover:text-[#4099B3] transition-colors">
              Como funciona
            </button>
            <button type="button" onClick={() => scrollToId('contato')} className="hover:text-[#4099B3] transition-colors">
              Contato
            </button>
          </nav>
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <button
              type="button"
              onClick={onAgendar}
              className={`inline-flex items-center gap-2 rounded-xl bg-[#4099B3] px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-[#2F7F96] whitespace-normal text-center max-w-[min(100%,14rem)] sm:max-w-none ${BTN_HEADER}`}
            >
              {copy.hero.ctaPrimary}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-[72px] md:pt-[80px]">
        <div
          className="fixed top-[72px] md:top-[80px] right-0 z-[25] flex items-start justify-end p-3 sm:p-5 pointer-events-none"
          aria-hidden
        >
          <img src={BRAND.logoPath} alt="" className="w-[min(180px,32vw)] h-auto opacity-[0.06] grayscale" />
        </div>

        {/* Hero — gradiente base + animação suave + overlay; conteúdo com motion */}
        <section className="relative overflow-hidden py-16 md:py-24 lg:py-28 text-white [&_svg]:text-white">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${BRAND.heroBgFrom} 0%, ${BRAND.heroBgVia} 45%, ${BRAND.heroBgTo} 100%)`,
            }}
          />
          {!reduceMotion && (
            <motion.div
              aria-hidden
              className="absolute -inset-[30%] opacity-[0.2] blur-3xl"
              style={{
                background: `radial-gradient(ellipse 55% 45% at 50% 50%, rgba(207,231,238,0.45) 0%, transparent 65%)`,
              }}
              animate={{ rotate: [0, 8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div className="absolute inset-0 opacity-25">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  left: `${(i * 8) % 100}%`,
                  top: `${(i * 12) % 100}%`,
                  width: `${36 + i * 10}px`,
                  height: `${36 + i * 10}px`,
                  background: `linear-gradient(135deg, rgba(207,231,238,0.45), rgba(64,153,179,0.2))`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-[3px]"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.07) 0%, transparent 40%, rgba(0,0,0,0.05) 100%)',
            }}
            aria-hidden
          />
          <div className="relative w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <motion.p
                  className="mb-3 text-sm font-medium tracking-wide text-white"
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.05 }}
                >
                  {BRAND.tagline}
                </motion.p>
                <motion.h1
                  className="mb-5 max-w-xl text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl lg:max-w-2xl"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.14 }}
                >
                  {copy.hero.title}
                </motion.h1>
                <motion.p
                  className="mb-8 max-w-lg text-base leading-relaxed text-white/95 md:text-lg md:leading-relaxed"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.26 }}
                >
                  {copy.hero.subtitle}
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row gap-4"
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.48, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.38 }}
                >
                  <button
                    type="button"
                    onClick={onAgendar}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#4099B3] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#2F7F96] [&_svg]:text-white ${BTN_HERO_PRIMARY}`}
                  >
                    {copy.hero.ctaPrimary}
                    <ArrowRight className="shrink-0 text-white" size={20} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={onWhatsApp}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/55 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white/10 [&_svg]:text-white ${BTN_HERO_OUTLINE}`}
                  >
                    <MessageCircle className="shrink-0 text-white" size={20} aria-hidden />
                    {copy.hero.ctaSecondary}
                  </button>
                </motion.div>
              </div>
              <motion.div
                className="relative flex flex-col items-center lg:items-stretch"
                initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.32 }}
              >
                <div className="relative w-full max-w-md mx-auto lg:max-w-none rounded-2xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-sm p-4 sm:p-5 lg:p-6 shadow-2xl transition-shadow duration-200 ease-out hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { icon: Scale, label: 'Previdenciário', grad: 'from-[#CFE7EE]/40 to-[#4099B3]/30' },
                      { icon: Users, label: 'Família', grad: 'from-[#4099B3]/35 to-[#8CC3D3]/25' },
                      { icon: ScrollText, label: 'Sucessões', grad: 'from-[#8CC3D3]/30 to-[#CFE7EE]/35' },
                      { icon: Shield, label: 'Segurança jurídica', grad: 'from-[#4099B3]/30 to-[#245F70]/25' },
                    ].map(({ icon: Icon, label, grad }) => (
                      <div
                        key={label}
                        className={`p-3 sm:p-4 rounded-xl bg-gradient-to-br ${grad} border border-white/15`}
                      >
                        <Icon className="mb-1.5 h-7 w-7 text-white sm:mb-2 sm:h-9 sm:w-9" strokeWidth={1.75} />
                        <p className="text-xs font-semibold leading-tight text-white sm:text-sm">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-white/15 bg-white/10 p-2.5 text-xs text-white sm:mt-4 sm:p-3 sm:text-sm">
                    <p className="font-medium text-white">Acompanhamento próximo</p>
                    <p className="mt-0.5 text-white/90 leading-snug">Clareza nas etapas e transparência na condução.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <RafaelaIndicadoresSection data={copy.getIndicadores()} reduceMotion={reduceMotion} />

        <motion.section
          id="sobre-advogada"
          className="py-20 md:py-28 scroll-mt-24 bg-white border-b"
          style={{ borderColor: BRAND.border }}
          {...scrollSection(0.04)}
        >
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className="order-2 lg:order-1">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight" style={{ color: BRAND.textStrong }}>
                  {copy.sobreAdvogada.title}
                </h2>
                <p className="text-base md:text-lg font-medium mb-8" style={{ color: BRAND.primary }}>
                  {copy.sobreAdvogada.subtitle}
                </p>
                {copy.sobreAdvogada.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className="text-base md:text-[1.05rem] leading-relaxed mb-4 last:mb-6 max-w-prose"
                    style={{ color: BRAND.text }}
                  >
                    {p}
                  </p>
                ))}
                <h3
                  className="text-lg md:text-xl font-bold mb-3 tracking-tight max-w-prose"
                  style={{ color: BRAND.textStrong }}
                >
                  {copy.sobreAdvogada.diferenciaisHeading}
                </h3>
                <ul className="space-y-2.5 max-w-prose">
                  {copy.sobreAdvogada.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: BRAND.primary }} />
                      <span className="text-sm md:text-[0.95rem] leading-snug" style={{ color: BRAND.textStrong }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                <motion.figure
                  className={
                    instagramPermalink
                      ? 'w-full max-w-[min(100%,22rem)] sm:max-w-md lg:max-w-lg'
                      : 'w-full max-w-[16rem] sm:max-w-xs lg:max-w-md'
                  }
                  initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-32px' }}
                  transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT }}
                >
                  <RafaelaSobreMedia permalink={instagramPermalink} />
                </motion.figure>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Áreas — cards claros (paleta Rafaela) */}
        <motion.section
          id="areas"
          className="py-20 md:py-28 scroll-mt-24"
          style={{ backgroundColor: BRAND.bgAlt }}
          {...scrollSection(0.08)}
        >
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 tracking-tight" style={{ color: BRAND.textStrong }}>
              Áreas de atuação
            </h2>
            <p className="text-center text-sm md:text-base max-w-2xl mx-auto mb-3 leading-relaxed" style={{ color: BRAND.textMuted }}>
              Onde a técnica encontra clareza e direção.
            </p>
            <p className="text-center text-xs sm:text-sm max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed" style={{ color: BRAND.textSoft }}>
              Visão em formato de calendário: cada coluna é uma área. Toque na área ou use Próxima para ver objetivo e
              conteúdo.
            </p>
            <RafaelaAreasCalendarioSection />
          </div>
        </motion.section>

        <motion.section id="diferenciais" className="py-20 md:py-28 scroll-mt-24" {...scrollSection(0.12)}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 tracking-tight" style={{ color: BRAND.textStrong }}>
              Princípios de atuação
            </h2>
            <p className="text-center text-sm md:text-base max-w-md mx-auto mb-10 md:mb-12 leading-relaxed" style={{ color: BRAND.textMuted }}>
              O que orienta cada caso, do primeiro contato à condução.
            </p>
            <ul className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {copy.diferenciais.map((item) => (
                <li
                  key={item}
                  className={`flex gap-3 p-5 md:p-6 rounded-2xl border bg-white ${CARD_HOVER}`}
                  style={{ borderColor: BRAND.border }}
                >
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 shrink-0 mt-0.5" style={{ color: BRAND.primary }} />
                  <span className="text-sm md:text-[0.9375rem] font-medium leading-snug" style={{ color: BRAND.textStrong }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section
          id="processo"
          className="py-20 md:py-28 scroll-mt-24 border-y"
          style={{ backgroundColor: BRAND.primarySoft, borderColor: BRAND.border }}
          {...scrollSection(0.06)}
        >
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 tracking-tight" style={{ color: BRAND.textStrong }}>
              Como funciona o atendimento
            </h2>
            <p className="text-center text-sm md:text-base max-w-md mx-auto mb-12 md:mb-14 leading-relaxed" style={{ color: BRAND.textMuted }}>
              Três etapas, do primeiro contato à condução do caso.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {copy.passos.map(({ n, title, desc }) => (
                <div key={n} className="text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div
                      className="mx-auto md:mx-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-md"
                      style={{ backgroundColor: BRAND.primary }}
                    >
                      {n}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2 tracking-tight" style={{ color: BRAND.textStrong }}>
                        {title}
                      </h3>
                      <p className="text-sm md:text-[0.9375rem] leading-snug md:leading-relaxed" style={{ color: BRAND.text }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section className="py-20 md:py-28" {...scrollSection(0.1)}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-5 tracking-tight" style={{ color: BRAND.textStrong }}>
              {copy.confianca.title}
            </h2>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: BRAND.text }}>
              {copy.confianca.body}
            </p>
          </div>
        </motion.section>

        <motion.section
          id="contato"
          className="py-16 md:py-24 scroll-mt-24"
          style={{ background: `linear-gradient(180deg, ${BRAND.heroBgFrom} 0%, #1a4a58 100%)` }}
          {...scrollSection(0.07)}
        >
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">{copy.ctaFinal.title}</h2>
            <p className="text-white/90 text-base md:text-lg mb-9 leading-relaxed">{copy.ctaFinal.body}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={onAgendar}
                className={`inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#245F70] bg-white hover:bg-[#EAF5F8] shadow-lg ${BTN_CTA_LIGHT}`}
              >
                {copy.ctaFinal.primary}
                <ArrowRight size={20} />
              </button>
              <button
                type="button"
                onClick={onWhatsApp}
                className={`inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-white border-2 border-white/50 hover:bg-white/10 ${BTN_CTA_OUTLINE}`}
              >
                <MessageCircle size={20} />
                {copy.ctaFinal.secondary}
              </button>
            </div>
          </div>
        </motion.section>

        <footer className="border-t py-12" style={{ borderColor: BRAND.border, backgroundColor: BRAND.bgAlt }}>
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-10">
              <div className="md:col-span-2">
                <img src={BRAND.logoPath} alt={BRAND.name} className="h-12 md:h-14 w-auto object-contain mb-4" />
                <p className="text-sm leading-relaxed max-w-lg" style={{ color: BRAND.textMuted }}>
                  {copy.footerNote}
                </p>
                {process.env.NEXT_PUBLIC_RAFAELA_OAB_LINE && (
                  <p className="mt-4 text-xs" style={{ color: BRAND.textSoft }}>
                    {process.env.NEXT_PUBLIC_RAFAELA_OAB_LINE}
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-3" style={{ color: BRAND.textStrong }}>
                  Navegação
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <button type="button" className="hover:underline" style={{ color: BRAND.primary }} onClick={() => scrollToId('areas')}>
                      Áreas de atuação
                    </button>
                  </li>
                  <li>
                    <button type="button" className="hover:underline" style={{ color: BRAND.primary }} onClick={() => scrollToId('sobre-advogada')}>
                      Sobre a advogada
                    </button>
                  </li>
                  <li>
                    <button type="button" className="hover:underline" style={{ color: BRAND.primary }} onClick={() => scrollToId('contato')}>
                      Contato
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div
              className="mt-10 pt-8 border-t text-xs"
              style={{ borderColor: BRAND.border, color: BRAND.textSoft }}
            >
              <p>© {new Date().getFullYear()} {BRAND.name}. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </main>

      <ChatIA userLabel="visitante" floatPosition="right" contextSurface="rafaela_public" whatsappHref={wa} />
    </div>
  );
}
