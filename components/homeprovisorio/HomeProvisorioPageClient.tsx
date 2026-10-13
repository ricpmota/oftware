'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import HomeProvisorioHeader from '@/components/homeprovisorio/HomeProvisorioHeader';
import HomeProvisorioHero from '@/components/homeprovisorio/HomeProvisorioHero';
import HomeProvisorioPatientContinuity from '@/components/homeprovisorio/HomeProvisorioPatientContinuity';
import HomeProvisorioBetweenVisits from '@/components/homeprovisorio/HomeProvisorioBetweenVisits';
import HomeProvisorioTogether from '@/components/homeprovisorio/HomeProvisorioTogether';
import HomeProvisorioTechSection from '@/components/homeprovisorio/HomeProvisorioTechSection';
import HomeProvisorioTestimonials from '@/components/homeprovisorio/HomeProvisorioTestimonials';
import HomeProvisorioMedicos from '@/components/homeprovisorio/HomeProvisorioMedicos';
import HomeProvisorioFinalCTA from '@/components/homeprovisorio/HomeProvisorioFinalCTA';
import HomeProvisorioStickyCTA from '@/components/homeprovisorio/HomeProvisorioStickyCTA';
import PublicDoctorTechnology from '@/components/drprovisorio/PublicDoctorTechnology';
import { withIndicacaoRef } from '@/lib/landing/appNavigation';
import { ometodoInstagramPermalink } from '@/lib/ometodoInstagram';
import { Shield } from 'lucide-react';

const PAGE_BG = '#0A1F44';
const ACCENT = '#4CCB7A';
const PAGE_TEXT = '#E8EDED';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function HomeProvisorioPageClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const instagramPermalink = ometodoInstagramPermalink();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      timeoutId = setTimeout(() => setLoading(false), 100);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoogleLogin = async (): Promise<boolean> => {
    if (isLoggingIn) return false;
    try {
      setIsLoggingIn(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAcessar = (path: string) => {
    const target = path === '/meta' ? withIndicacaoRef(path) : path;
    if (user) {
      router.push(target);
      return;
    }
    void (async () => {
      const ok = await handleGoogleLogin();
      if (ok) router.push(target);
    })();
  };

  if (loading) {
    return <InitialLoadingSplash backgroundColor={PAGE_BG} />;
  }

  return (
    <div className="min-h-screen bg-[var(--homeprov-paper)]">
      <HomeProvisorioHeader
        user={user}
        onLogout={handleLogout}
        onAccessPath={handleAcessar}
        onPrimaryCta={() => handleAcessar('/meta')}
      />

      <main className="pb-24 pt-14 sm:pt-16 md:pb-0">
        <HomeProvisorioHero
          accentColor={ACCENT}
          pageBg={PAGE_BG}
          pageText={PAGE_TEXT}
          onPrimaryCta={() => scrollToId('metodo')}
          onSecondaryCta={() => scrollToId('medicos')}
        />

        <HomeProvisorioPatientContinuity accentColor={ACCENT} pageBg={PAGE_BG} />

        <HomeProvisorioBetweenVisits accentColor={ACCENT} pageBg={PAGE_BG} />

        <HomeProvisorioTogether accentColor={ACCENT} pageBg={PAGE_BG} />

        <HomeProvisorioTechSection accentColor={ACCENT}>
          <PublicDoctorTechnology accentColor={ACCENT} pageBg={PAGE_BG} />
        </HomeProvisorioTechSection>

        <HomeProvisorioTestimonials accentColor={ACCENT} pageBg={PAGE_BG} />

        <HomeProvisorioMedicos accentColor={ACCENT} pageBg={PAGE_BG} />

        <HomeProvisorioFinalCTA
          accentColor={ACCENT}
          pageBg={PAGE_BG}
          onPrimaryCta={() => scrollToId('medicos')}
          onSecondaryCta={() => scrollToId('metodo')}
        />

        <footer id="homeprov-footer" className="homeprov-bleed border-t border-[var(--homeprov-navy)]/8 bg-[var(--homeprov-paper)] py-12">
          <div className="homeprov-inner flex flex-col items-start gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/metodo-emagrecer-logotipo-28.png"
                alt="Método Emagrecer"
                className="h-8 w-auto object-contain"
              />
              <p className="mt-4 text-[13px] leading-relaxed text-[var(--homeprov-muted)]">
                Página informativa. Condutas dependem de avaliação médica individualizada. A resposta
                ao acompanhamento varia conforme características clínicas, adesão e evolução
                individual.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[var(--homeprov-muted)]">
              <a href="/politica-de-privacidade.html" className="hover:text-[var(--homeprov-ink)]">
                Privacidade
              </a>
              <a href="/exclusao-de-dados.html" className="hover:text-[var(--homeprov-ink)]">
                Exclusão de dados
              </a>
              {instagramPermalink ? (
                <a
                  href={instagramPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--homeprov-ink)]"
                >
                  Instagram
                </a>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3" aria-hidden />
                © {new Date().getFullYear()} Método Emagrecer
              </span>
            </div>
          </div>
        </footer>
      </main>

      <HomeProvisorioStickyCTA accentColor={ACCENT} onCta={() => scrollToId('medicos')} />
    </div>
  );
}
