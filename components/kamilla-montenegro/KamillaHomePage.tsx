'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Dumbbell, FlaskConical, Menu, Stethoscope, Syringe, UtensilsCrossed, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { withIndicacaoRef } from '@/lib/landing/appNavigation';
import type { KamillaInstitutionalContent } from '@/lib/kamilla-montenegro/institutionalContent';

const PORTRAIT_SRC = '/kamillamontenegro/retrato.png';
const HERO_TITLE = 'Saúde, equilíbrio e cuidado em cada fase da sua vida.';

const NAV = [
  { href: '#inicio', label: 'Início' },
  { href: '#sobre', label: 'Sobre mim' },
  { href: '#acompanhamento', label: 'Acompanhamento' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#acesso', label: 'Área de acesso' },
  { href: '#contato', label: 'Contato' },
] as const;

const CARE_AREAS = [
  {
    title: 'Evolução',
    text: 'Estatísticas, metas e bioimpedância, quando esses registros existem no portal.',
    icon: BarChart3,
  },
  {
    title: 'Exames',
    text: 'Resultados laboratoriais, exames de imagem e prescrições compartilhadas pela equipe.',
    icon: FlaskConical,
  },
  {
    title: 'Aplicações',
    text: 'O histórico de aplicações fica disponível para consulta no portal.',
    icon: Syringe,
  },
  {
    title: 'Nutrição',
    text: 'Acompanhamento alimentar e cardápio com a nutricionista.',
    icon: UtensilsCrossed,
  },
  {
    title: 'Treino',
    text: 'A rotina de treino acompanhada pelo personal trainer.',
    icon: Dumbbell,
  },
  {
    title: 'Médica',
    text: 'O vínculo com a médica responsável e as informações do acompanhamento.',
    icon: Stethoscope,
  },
] as const;

const STEPS = [
  {
    index: '01',
    title: 'Entrar',
    text: 'O acesso é feito com a conta Google, no portal correspondente a cada pessoa.',
  },
  {
    index: '02',
    title: 'Acompanhar',
    text: 'Evolução, exames, nutrição, treino e aplicações aparecem quando a equipe os registra.',
  },
  {
    index: '03',
    title: 'Continuar',
    text: 'O mesmo portal reúne o que já faz parte do acompanhamento, sem um fluxo novo de contratação.',
  },
] as const;

const PORTALS = [
  { path: '/meta', title: 'Portal do Paciente', text: 'Evolução, exames e o acompanhamento do dia a dia.' },
  { path: '/metaadmin', title: 'Portal Médico', text: 'Área da médica responsável.' },
  { path: '/metanutri', title: 'Portal da Nutricionista', text: 'Área de nutrição e cardápio.' },
  { path: '/metapersonal', title: 'Portal do Personal Trainer', text: 'Área de treino e rotina.' },
] as const;

export default function KamillaHomePage({ content }: { content: KamillaInstitutionalContent }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [enteringPath, setEnteringPath] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { theme } = content;

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-40px' },
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
        };

  const enterPortal = async (path: string) => {
    const target = withIndicacaoRef(path);
    if (user) {
      router.push(target);
      return;
    }
    if (enteringPath) return;
    try {
      setEnteringPath(path);
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.push(target);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user') setLoginError('Login cancelado.');
      else if (code === 'auth/popup-blocked') setLoginError('Popup bloqueado. Permita popups neste site.');
      else if (code === 'auth/unauthorized-domain') {
        setLoginError('Este domínio ainda não está autorizado para o login com Google.');
      } else setLoginError('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setEnteringPath(null);
    }
  };

  return (
    <div
      style={{
        backgroundColor: theme.canvas,
        color: theme.ink,
        ['--k-canvas' as string]: theme.canvas,
        ['--k-paper' as string]: theme.paper,
        ['--k-heading' as string]: theme.heading,
        ['--k-sage' as string]: theme.sage,
        ['--k-ink' as string]: theme.ink,
        ['--k-line' as string]: theme.line,
        ['--k-on' as string]: theme.onHeading,
      }}
    >
      <header className="sticky top-0 z-40 border-b border-[var(--k-line)] bg-[var(--k-canvas)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#inicio" className="shrink-0" aria-label={content.publicName}>
            {content.logoUrl ? (
              // A arte tem margem transparente; o recorte mostra só o wordmark.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.logoUrl}
                alt={content.publicName}
                className="h-8 w-auto object-cover object-center sm:h-11"
                style={{ aspectRatio: '8.4 / 1' }}
              />
            ) : (
              <span
                className="text-lg tracking-tight text-[var(--k-heading)]"
                style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif' }}
              >
                {content.publicName}
              </span>
            )}
          </a>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Seções">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] tracking-wide text-[var(--k-ink)] transition-colors hover:text-[var(--k-heading)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--k-heading)] lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="border-t border-[var(--k-line)] px-5 py-3 lg:hidden" aria-label="Seções">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block py-3 text-base text-[var(--k-heading)]"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      <main>
        <section id="inicio" className="relative scroll-mt-24 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46vw] lg:block"
            style={{
              background: `radial-gradient(ellipse at 72% 58%, ${theme.paper} 0%, transparent 68%)`,
            }}
          />
          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-[1440px] flex-col justify-center px-5 py-16 sm:px-8 lg:py-24 lg:pr-[44vw] lg:pl-16">
            {content.logoUrl ? null : (
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--k-sage)]">
                {content.publicName}
              </p>
            )}
            <h1
              className="max-w-[14ch] text-[2.6rem] leading-[1.08] text-[var(--k-heading)] sm:text-6xl"
              style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif', fontWeight: 460 }}
            >
              {HERO_TITLE}
            </h1>
            {content.description ? (
              <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--k-ink)]">{content.description}</p>
            ) : null}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#sobre"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--k-heading)] px-6 text-sm font-semibold text-[var(--k-on)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Conhecer a Dra. Kamilla
              </a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PORTRAIT_SRC}
              alt=""
              className="mt-10 ml-auto block h-auto w-full object-contain object-top lg:hidden"
            />
          </div>
          {/* PNG com alfa. A lateral direita do arquivo já corta o braço; ela encosta na borda do hero. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PORTRAIT_SRC}
            alt={content.publicName}
            className="pointer-events-none absolute right-0 bottom-0 hidden h-full w-auto max-w-[52vw] object-contain object-right-bottom lg:block"
          />
        </section>

        <section id="sobre" className="scroll-mt-24 bg-[var(--k-paper)]">
          <motion.div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-32" {...reveal()}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--k-sage)]">Sobre mim</p>
            <div>
              <h2
                className="text-4xl leading-tight text-[var(--k-heading)] sm:text-5xl"
                style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif', fontWeight: 460 }}
              >
                {content.description ?? content.publicName}
              </h2>
              <p className="mt-8 max-w-xl text-base leading-8 text-[var(--k-ink)]">
                Formação, registro profissional e áreas de atendimento entram nesta página quando estiverem confirmados.
              </p>
            </div>
          </motion.div>
        </section>

        <section id="acompanhamento" className="scroll-mt-24">
          <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 lg:py-32">
            <motion.div className="max-w-2xl" {...reveal()}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--k-sage)]">Acompanhamento digital</p>
              <h2
                className="mt-4 text-4xl leading-tight text-[var(--k-heading)] sm:text-5xl"
                style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif', fontWeight: 460 }}
              >
                O que o portal do paciente já reúne.
              </h2>
            </motion.div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CARE_AREAS.map((area, index) => {
                const Icon = area.icon;
                return (
                  <motion.article
                    key={area.title}
                    className="rounded-3xl border border-[var(--k-line)] bg-white/60 p-7"
                    {...reveal(index * 0.04)}
                  >
                    <Icon className="h-5 w-5 text-[var(--k-heading)]" aria-hidden />
                    <h3
                      className="mt-6 text-2xl text-[var(--k-heading)]"
                      style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif' }}
                    >
                      {area.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--k-ink)]">{area.text}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-[var(--k-paper)]">
          <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 lg:py-32">
            <motion.div {...reveal()}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--k-sage)]">Como funciona</p>
              <h2
                className="mt-4 max-w-xl text-4xl leading-tight text-[var(--k-heading)] sm:text-5xl"
                style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif', fontWeight: 460 }}
              >
                Três passos, sem um caminho novo de agendamento.
              </h2>
            </motion.div>
            <ol className="mt-14 grid gap-10 lg:grid-cols-3">
              {STEPS.map((step, index) => (
                <motion.li key={step.index} {...reveal(index * 0.05)}>
                  <span className="text-sm tracking-[0.18em] text-[var(--k-sage)]">{step.index}</span>
                  <h3
                    className="mt-4 text-3xl text-[var(--k-heading)]"
                    style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif' }}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--k-ink)]">{step.text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section id="acesso" className="scroll-mt-24">
          <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 lg:py-32">
            <motion.div className="max-w-2xl" {...reveal()}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--k-sage)]">Área de acesso</p>
              <h2
                className="mt-4 text-4xl leading-tight text-[var(--k-heading)] sm:text-5xl"
                style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif', fontWeight: 460 }}
              >
                Quatro portais, o mesmo login.
              </h2>
              <p className="mt-5 text-base leading-8 text-[var(--k-ink)]">
                A entrada continua sendo a conta Google já usada na plataforma. O endereço permanece neste site.
              </p>
            </motion.div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2">
              {PORTALS.map((portal) => (
                <article key={portal.path} className="flex flex-col justify-between rounded-3xl border border-[var(--k-line)] p-7">
                  <div>
                    <h3
                      className="text-2xl text-[var(--k-heading)]"
                      style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif' }}
                    >
                      {portal.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--k-ink)]">{portal.text}</p>
                  </div>
                  <button
                    type="button"
                    className="mt-8 inline-flex min-h-12 w-fit items-center justify-center rounded-full border border-[var(--k-heading)] px-6 text-sm font-semibold text-[var(--k-heading)] transition-colors hover:bg-[var(--k-heading)] hover:text-[var(--k-on)] disabled:opacity-60"
                    onClick={() => void enterPortal(portal.path)}
                    disabled={enteringPath !== null}
                  >
                    {enteringPath === portal.path ? 'Entrando…' : 'Entrar'}
                  </button>
                </article>
              ))}
            </div>
            {loginError ? <p className="mt-6 text-sm text-[var(--k-heading)]">{loginError}</p> : null}
          </div>
        </section>
      </main>

      <footer id="contato" className="scroll-mt-24 border-t border-[var(--k-line)]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {content.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.logoUrl}
                alt=""
                className="h-9 w-auto object-cover object-center"
                style={{ aspectRatio: '8.4 / 1' }}
              />
            ) : (
              <p
                className="text-3xl text-[var(--k-heading)]"
                style={{ fontFamily: 'var(--font-kamilla-display), Georgia, serif' }}
              >
                {content.publicName}
              </p>
            )}
            {content.legalName ? <p className="mt-4 text-sm text-[var(--k-ink)]">{content.legalName}</p> : null}
            {content.description ? <p className="mt-4 max-w-md text-sm leading-7 text-[var(--k-ink)]">{content.description}</p> : null}
          </div>
          <div className="text-sm leading-7 text-[var(--k-ink)]">
            {content.instagramUrl ? (
              <a href={content.instagramUrl} className="underline decoration-[var(--k-line)] underline-offset-4">
                Instagram
              </a>
            ) : (
              <p>WhatsApp, Instagram e endereço aparecem aqui quando estiverem cadastrados.</p>
            )}
            {content.showPoweredByOftware ? <p className="mt-4 text-xs tracking-wide">Powered by Oftware</p> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
