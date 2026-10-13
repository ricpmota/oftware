'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Stethoscope } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';
import { resolveOrganizationShellLogoUrl } from '@/lib/organization/resolveOrganizationShellLogoUrl';
import {
  ordenarMedicosDoApp,
  resolverMedicoDaSessao,
  sessaoPodeEntrarRelatoriosMedicos,
} from '@/lib/relatorio/relatorioMedicoAcesso';
import { DEFAULT_PUBLIC_PAGE_LOGO_SRC } from '@/lib/whiteLabel/publicPagesTheme';
import { SeloVerificadoInstagram } from '@/components/drprovisorio/seloVerificado';
import { MedicoService } from '@/services/medicoService';
import type { Medico } from '@/types/medico';

const LOGO_SRC = resolveOrganizationShellLogoUrl(null, {
  darkBackground: false,
  fallbackSrc: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
});

function tituloMedico(medico: Medico): string {
  return medico.genero === 'F' ? 'Dra.' : 'Dr.';
}

export default function RelatorioMedicosPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [liberado, setLiberado] = useState(false);
  const [redirecionando, setRedirecionando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('relatorio-app-lock');
    return () => html.classList.remove('relatorio-app-lock');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLiberado(false);
        setRedirecionando(true);
        setAuthReady(true);
        router.replace(metaAdminGeralAcessarUrl('/relatoriomedicos'));
        return;
      }
      setRedirecionando(false);
      void (async () => {
        try {
          const medico = await resolverMedicoDaSessao(user);
          setLiberado(sessaoPodeEntrarRelatoriosMedicos({ email: user.email, medico }));
        } catch {
          setLiberado(false);
        } finally {
          setAuthReady(true);
        }
      })();
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authReady || !liberado) return;
    let cancelado = false;
    setLoading(true);
    setErro(null);
    void MedicoService.getAllMedicos()
      .then((lista) => {
        if (!cancelado) setMedicos(ordenarMedicosDoApp(lista));
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar os médicos.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [authReady, liberado]);

  useEffect(() => {
    document.title = 'Médicos';
  }, []);

  if (!authReady || redirecionando || (liberado && loading)) {
    return (
      <div className="relatorio-app-shell flex min-h-screen items-center justify-center bg-[#0A1F44] p-4">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#30f278] border-t-transparent" />
          <p className="text-sm text-white/80">Abrindo...</p>
        </div>
      </div>
    );
  }

  if (!liberado) {
    return (
      <div className="relatorio-app-shell flex min-h-screen items-center justify-center bg-[#0A1F44] p-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-bold text-white">Acesso restrito</p>
          <p className="mt-2 text-sm text-white/70">
            Só médicos cadastrados e verificados podem entrar.
          </p>
        </div>
      </div>
    );
  }

  const verificados = medicos.filter((medico) => medico.isVerificado === true).length;

  return (
    <div className="relatorio-app-shell min-h-screen bg-[#071428] text-white">
      <div className="relatorio-app-scroll min-h-0 flex-1">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-[#0A1F44]">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0A1F44]/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
            <div className="mb-4 flex justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Método Emagrecer"
                className="h-6 w-auto max-w-[120px] object-contain brightness-0 invert"
              />
            </div>
            <h1 className="text-[28px] font-extrabold leading-none tracking-tight">Médicos</h1>
            <p className="mt-2 text-sm text-white/60">
              {verificados} verificado{verificados === 1 ? '' : 's'}
              {medicos.length !== verificados ? ` · ${medicos.length - verificados} pendente${medicos.length - verificados === 1 ? '' : 's'}` : ''}
            </p>
          </header>

          <main className="flex-1 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {erro ? <p className="py-12 text-center text-sm text-red-300">{erro}</p> : null}
            {!erro && medicos.length === 0 ? (
              <p className="py-12 text-center text-sm text-white/60">Nenhum médico cadastrado.</p>
            ) : null}
            <ul className="grid grid-cols-3 gap-x-3 gap-y-6">
              {medicos.map((medico) => {
                const verificado = medico.isVerificado === true;
                const foto = medico.fotoPerfilUrl?.trim() || '';
                const nome = `${tituloMedico(medico)} ${medico.nome || 'Médico'}`;
                return (
                  <li key={medico.id} className="min-w-0 text-center">
                    <button
                      type="button"
                      disabled={!verificado}
                      onClick={() => router.push(`/relatoriomedico/${encodeURIComponent(medico.id)}`)}
                      className="mx-auto block disabled:cursor-not-allowed"
                      aria-label={verificado ? `Abrir relatório de ${nome}` : `${nome} ainda não verificado`}
                    >
                      <span className={`relative mx-auto block h-[84px] w-[84px] ${verificado ? '' : 'opacity-45 grayscale'}`}>
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={foto}
                            alt=""
                            className="h-full w-full rounded-full border-2 border-white/80 object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-white/20 bg-white/10">
                            <Stethoscope className="h-8 w-8 text-white/80" strokeWidth={1.75} />
                          </span>
                        )}
                        {verificado ? <SeloVerificadoInstagram ringClassName="ring-[#0A1F44]" /> : null}
                      </span>
                    </button>
                    <p className={`mt-2 truncate text-[12px] font-semibold leading-tight ${verificado ? 'text-white' : 'text-white/45'}`}>
                      {nome}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
                      {verificado ? 'Verificado' : 'Pendente'}
                    </p>
                  </li>
                );
              })}
            </ul>
          </main>
        </div>
      </div>
    </div>
  );
}
